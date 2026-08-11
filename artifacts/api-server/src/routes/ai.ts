import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, casesTable, intakesTable } from "@workspace/db";
import { AiAssistBody, AiAssistResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const GUSTAFTA_API_URL = "https://gustafta.my.id/api/v1/ai/assist";
const GUSTAFTA_TIMEOUT_MS = 30_000;

// AI abstraction layer — Phase 1B: real Gustafta integration.
// Caller interface and response shape are unchanged from Phase 0.
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GUSTAFTA_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(GUSTAFTA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Gustafta API timed out after ${GUSTAFTA_TIMEOUT_MS / 1000}s`);
    }
    throw new Error(`Gustafta API request failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`Gustafta API returned HTTP ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { response: string; suggestions: string[] };
  return {
    response: data.response ?? "",
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
  };
}

router.post("/ai/assist", async (req, res): Promise<void> => {
  const parsed = AiAssistBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid AI assist request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { caseId, prompt, context } = parsed.data;

  // Optionally look up case for context
  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.id, caseId));

  const [intake] = caseItem
    ? await db.select().from(intakesTable).where(eq(intakesTable.caseId, caseId))
    : [undefined];

  const aiContext = [
    context,
    caseItem ? `Kasus: ${caseItem.title}` : null,
    intake ? `Jumlah masukan: ${(intake.fields as unknown[]).length}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  const result = await callAiService({
    caseId,
    prompt,
    context: aiContext,
    caseTitle: caseItem?.title,
  });

  res.json(
    AiAssistResponse.parse({
      caseId,
      response: result.response,
      suggestions: result.suggestions,
    })
  );
});

export default router;
