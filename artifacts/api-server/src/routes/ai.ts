import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, casesTable, intakesTable } from "@workspace/db";
import { AiAssistBody, AiAssistResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// ── Retry / timeout constants ─────────────────────────────────────────────────
// Per-attempt timeout: 15 s. With 2 retries + backoff the worst-case wall
// clock is ≈ 15 + 0.5 + 15 + 1 + 15 = ~46.5 s — well-bounded.
const GUSTAFTA_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2; // up to 3 total attempts
const RETRY_BACKOFF_MS: readonly number[] = [500, 1_000];

// Allow tests to override the endpoint without touching production code.
// In production GUSTAFTA_API_URL env var is intentionally left unset,
// so the constant below is the effective URL.
const GUSTAFTA_API_URL =
  process.env.GUSTAFTA_API_URL ?? "https://gustafta.my.id/api/v1/ai/assist";

// ── Retry helpers ─────────────────────────────────────────────────────────────

/** HTTP status codes that are safe to retry (transient, server-side). */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A single attempt to call the Gustafta API.
 * Throws an Error tagged with { retryable: true } for transient network /
 * timeout failures so the retry loop can distinguish them from fatal errors.
 */
async function gustaftaAttempt(
  apiKey: string,
  body: string,
  attemptIndex: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GUSTAFTA_TIMEOUT_MS);

  try {
    return await fetch(GUSTAFTA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const msg = isAbort
      ? `Gustafta timeout after ${GUSTAFTA_TIMEOUT_MS / 1_000}s (attempt ${attemptIndex + 1})`
      : `Gustafta network error: ${err instanceof Error ? err.message : String(err)} (attempt ${attemptIndex + 1})`;
    // Tag as retryable so the loop knows it can try again
    throw Object.assign(new Error(msg), { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

// ── AI abstraction layer ──────────────────────────────────────────────────────
// Interface and response shape are unchanged from Phase 1B.
// Phase 1D adds: per-attempt timeout, exponential backoff, selective retry.
async function callAiService(params: {
  caseId: string;
  prompt: string;
  context?: string;
  caseTitle?: string;
}): Promise<{ response: string; suggestions: string[] }> {
  const apiKey = process.env.GUSTAFTA_API_KEY;
  if (!apiKey) {
    throw new Error("GUSTAFTA_API_KEY secret is not configured");
  }

  const body = JSON.stringify({ prompt: params.prompt });
  let lastError: Error = new Error("Gustafta API unreachable");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Exponential backoff before every retry (not before the first attempt)
    if (attempt > 0) {
      const delay = RETRY_BACKOFF_MS[attempt - 1] ?? RETRY_BACKOFF_MS.at(-1)!;
      console.info(
        `[callAiService] attempt ${attempt + 1}/${MAX_RETRIES + 1} after ${delay}ms backoff`,
      );
      await sleep(delay);
    }

    // ── Network / timeout ────────────────────────────────────────────────────
    let res: Response;
    try {
      res = await gustaftaAttempt(apiKey, body, attempt);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const retryable = (err as { retryable?: boolean }).retryable === true;
      if (retryable && attempt < MAX_RETRIES) {
        console.warn(`[callAiService] transient error, will retry: ${lastError.message}`);
        continue;
      }
      // Last attempt or non-retryable network error — propagate
      throw lastError;
    }

    // ── HTTP error ────────────────────────────────────────────────────────────
    if (!res.ok) {
      if (isRetryableStatus(res.status) && attempt < MAX_RETRIES) {
        lastError = new Error(
          `Gustafta returned HTTP ${res.status} (attempt ${attempt + 1}, will retry)`,
        );
        console.warn(`[callAiService] ${lastError.message}`);
        continue;
      }
      // 4xx (except 429) or final attempt — do NOT retry
      const text = await res.text().catch(() => "(no body)");
      throw new Error(`Gustafta API returned HTTP ${res.status}: ${text}`);
    }

    // ── Success ───────────────────────────────────────────────────────────────
    const data = (await res.json()) as { response: string; suggestions: string[] };
    return {
      response: data.response ?? "",
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    };
  }

  // Exhausted all attempts
  throw lastError;
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post("/ai/assist", async (req, res): Promise<void> => {
  const parsed = AiAssistBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid AI assist request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { caseId, prompt, context } = parsed.data;

  const userId = req.userId!;

  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

  if (!caseItem) {
    res.status(404).json({ error: "Kasus tidak ditemukan" });
    return;
  }

  const [intake] = await db
    .select()
    .from(intakesTable)
    .where(eq(intakesTable.caseId, caseId));

  const aiContext = [
    context,
    `Kasus: ${caseItem.title}`,
    intake ? `Jumlah masukan: ${(intake.fields as unknown[]).length}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  const result = await callAiService({
    caseId,
    prompt,
    context: aiContext,
    caseTitle: caseItem.title,
  });

  res.json(
    AiAssistResponse.parse({
      caseId,
      response: result.response,
      suggestions: result.suggestions,
    }),
  );
});

export default router;
