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

// ── Circuit breaker constants ─────────────────────────────────────────────────
// Open the circuit after this many consecutive failures.
export const CB_FAILURE_THRESHOLD = Number(process.env.CB_FAILURE_THRESHOLD ?? 5);
// How long (ms) to wait in OPEN state before allowing a single probe attempt.
export const CB_RESET_TIMEOUT_MS = Number(process.env.CB_RESET_TIMEOUT_MS ?? 30_000);

// ── Circuit breaker state ─────────────────────────────────────────────────────
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export const circuit = {
  state: "CLOSED" as CircuitState,
  consecutiveFailures: 0,
  openedAt: 0,          // timestamp when the circuit last transitioned to OPEN
  probeInFlight: false, // true while the single HALF_OPEN probe call is running
};

/** Reset circuit to initial CLOSED state (exported for tests). */
export function resetCircuit(): void {
  circuit.state = "CLOSED";
  circuit.consecutiveFailures = 0;
  circuit.openedAt = 0;
  circuit.probeInFlight = false;
}

/** Transition the circuit to a new state and log the change. */
function setCircuitState(next: CircuitState): void {
  if (circuit.state === next) return;
  const prev = circuit.state;
  circuit.state = next;
  if (next === "OPEN") {
    circuit.openedAt = Date.now();
  }
  console.warn(
    `[CircuitBreaker] state change: ${prev} → ${next} ` +
      `(consecutiveFailures=${circuit.consecutiveFailures}, ` +
      `threshold=${CB_FAILURE_THRESHOLD}, resetTimeout=${CB_RESET_TIMEOUT_MS}ms)`,
  );
}

/**
 * Returns true when the circuit allows the call to proceed.
 *
 * - CLOSED    → always allow
 * - OPEN      → block; transition to HALF_OPEN once the reset timeout elapses
 * - HALF_OPEN → allow ONLY when no probe is already in flight.
 *               Concurrent requests while a probe is running are blocked so
 *               exactly one probe reaches Gustafta at a time.
 */
export function circuitAllows(): boolean {
  if (circuit.state === "CLOSED") return true;

  if (circuit.state === "OPEN") {
    const elapsed = Date.now() - circuit.openedAt;
    if (elapsed >= CB_RESET_TIMEOUT_MS) {
      setCircuitState("HALF_OPEN");
    } else {
      return false; // still in cooldown
    }
  }

  // HALF_OPEN: allow the first caller; block all concurrent requests
  if (circuit.probeInFlight) return false;
  return true;
}

/**
 * Called after a successful Gustafta call.
 *
 * Only the authorized HALF_OPEN probe may close the circuit. A normal call
 * that succeeds while the circuit is OPEN or HALF_OPEN (e.g. a slow request
 * that was already in-flight when the circuit opened) must not reopen traffic
 * — the probe alone decides recovery.
 *
 * @param isProbe - true when this is the reserved HALF_OPEN probe call.
 */
export function recordSuccess(isProbe: boolean): void {
  if (isProbe) {
    // The probe succeeded → service has recovered, close the circuit
    circuit.consecutiveFailures = 0;
    if (circuit.state !== "CLOSED") {
      setCircuitState("CLOSED");
    }
  } else {
    // Normal call — only reset the failure counter while CLOSED.
    // Never close an OPEN or HALF_OPEN circuit; only the probe may do that.
    if (circuit.state === "CLOSED") {
      circuit.consecutiveFailures = 0;
    }
  }
}

/**
 * Called after a Gustafta call fails (all retry attempts exhausted).
 *
 * - isProbe=true  → always transitions HALF_OPEN back to OPEN (any failure
 *                   means the service has not yet recovered).
 * - isProbe=false → only acts when the circuit is CLOSED, incrementing the
 *                   failure counter and opening if the threshold is reached.
 *                   Stale in-flight normal requests that fail while the
 *                   circuit is OPEN or HALF_OPEN are ignored so they cannot
 *                   disturb the state machine.
 *
 * @param isProbe - true when this is the reserved HALF_OPEN probe call.
 */
export function recordFailure(isProbe: boolean): void {
  if (isProbe) {
    // Probe failed → go back to OPEN and reset the cooldown timer
    circuit.consecutiveFailures += 1;
    setCircuitState("OPEN");
    return;
  }

  // Normal call — only act while CLOSED
  if (circuit.state === "CLOSED") {
    circuit.consecutiveFailures += 1;
    if (circuit.consecutiveFailures >= CB_FAILURE_THRESHOLD) {
      setCircuitState("OPEN");
    }
  }
  // If OPEN or HALF_OPEN: ignore — stale in-flight normal failures
  // must not disturb the state machine
}

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
    throw Object.assign(new Error(msg), { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

// ── AI abstraction layer ──────────────────────────────────────────────────────
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

  // ── Circuit breaker check ─────────────────────────────────────────────────
  // circuitAllows() may transition OPEN → HALF_OPEN, so we check state after.
  if (!circuitAllows()) {
    const elapsed = Math.round((Date.now() - circuit.openedAt) / 1_000);
    const remaining = Math.ceil(
      (CB_RESET_TIMEOUT_MS - (Date.now() - circuit.openedAt)) / 1_000,
    );
    console.warn(
      `[CircuitBreaker] OPEN — rejecting request immediately ` +
        `(opened ${elapsed}s ago, probe allowed in ~${remaining}s)`,
    );
    throw Object.assign(
      new Error("AI service temporarily unavailable. Please try again shortly."),
      { circuitOpen: true },
    );
  }

  // If we are the single HALF_OPEN probe, mark it in-flight immediately
  // (synchronously, before the first await) so concurrent callers are blocked.
  const isProbe = circuit.state === "HALF_OPEN";
  if (isProbe) {
    circuit.probeInFlight = true;
  }

  // Probes use only one attempt — a single data point is enough to decide
  // whether Gustafta has recovered. Normal calls use the full retry budget.
  const effectiveMaxRetries = isProbe ? 0 : MAX_RETRIES;

  const body = JSON.stringify({ prompt: params.prompt });
  let lastError: Error = new Error("Gustafta API unreachable");

  // shouldRecordFailure tracks whether the final outcome warrants a failure
  // signal to the circuit breaker:
  //   - probes: always record (any failure means service not yet recovered)
  //   - normal calls: only transient/server errors (network, 5xx, 429, JSON
  //     parse); non-retryable 4xx are client-side faults, not service outages
  let shouldRecordFailure = isProbe;
  let succeeded = false;

  try {
    for (let attempt = 0; attempt <= effectiveMaxRetries; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_BACKOFF_MS[attempt - 1] ?? RETRY_BACKOFF_MS.at(-1)!;
        console.info(
          `[callAiService] attempt ${attempt + 1}/${effectiveMaxRetries + 1} after ${delay}ms backoff`,
        );
        await sleep(delay);
      }

      // ── Network / timeout ────────────────────────────────────────────────
      let res: Response;
      try {
        res = await gustaftaAttempt(apiKey, body, attempt);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const retryable = (err as { retryable?: boolean }).retryable === true;
        if (retryable && attempt < effectiveMaxRetries) {
          console.warn(`[callAiService] transient error, will retry: ${lastError.message}`);
          continue;
        }
        // Terminal network/timeout failure — count it
        shouldRecordFailure = true;
        throw lastError;
      }

      // ── HTTP error ─────────────────────────────────────────────────────────
      if (!res.ok) {
        if (isRetryableStatus(res.status) && attempt < effectiveMaxRetries) {
          lastError = new Error(
            `Gustafta returned HTTP ${res.status} (attempt ${attempt + 1}, will retry)`,
          );
          console.warn(`[callAiService] ${lastError.message}`);
          continue;
        }
        const text = await res.text().catch(() => "(no body)");
        lastError = new Error(`Gustafta API returned HTTP ${res.status}: ${text}`);
        // Retryable status at end of budget → count for normal calls too
        if (isRetryableStatus(res.status)) {
          shouldRecordFailure = true;
        }
        // isProbe: shouldRecordFailure is already true (covers 4xx probe failures)
        throw lastError;
      }

      // ── Parse response (wrap to catch JSON errors) ─────────────────────────
      let data: { response: string; suggestions: string[] };
      try {
        data = (await res.json()) as { response: string; suggestions: string[] };
      } catch (jsonErr: unknown) {
        lastError = jsonErr instanceof Error ? jsonErr : new Error(String(jsonErr));
        shouldRecordFailure = true; // malformed response → treat as transient
        throw lastError;
      }

      succeeded = true;
      return {
        response: data.response ?? "",
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      };
    }

    // Exhausted all attempts
    shouldRecordFailure = true;
    throw lastError;
  } finally {
    // Single authoritative outcome accounting: covers every exit path
    // including non-retryable 4xx, JSON parse failures, and normal success.
    if (succeeded) {
      recordSuccess(isProbe);
    } else if (shouldRecordFailure) {
      recordFailure(isProbe);
    }
    if (isProbe) {
      circuit.probeInFlight = false;
    }
  }
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

  try {
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
  } catch (err: unknown) {
    const isCircuitOpen = (err as { circuitOpen?: boolean }).circuitOpen === true;
    req.log.warn(
      { err, isCircuitOpen },
      "AI service unavailable — returning AI_UNAVAILABLE to client",
    );
    res.status(503).json({
      code: "AI_UNAVAILABLE",
      error: "AI service temporarily unavailable. Please try again shortly.",
    });
  }
});

export default router;

// Exported for unit testing only
export { callAiService };
