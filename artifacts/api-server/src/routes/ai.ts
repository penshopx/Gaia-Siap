import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, casesTable, intakesTable } from "@workspace/db";
import { AiAssistBody, AiAssistResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// AI abstraction layer — mock for Phase 0.
// In Phase 1, replace the body of `callAiService` with a real Gustafta/model-provider call.
async function callAiService(params: {
  caseId: string;
  prompt: string;
  context?: string;
  caseTitle?: string;
}): Promise<{ response: string; suggestions: string[] }> {
  // GUSTAFTA_API_URL and GUSTAFTA_API_KEY would be used here in Phase 1
  // For now, return a structured mock response

  const responses = [
    {
      response: `Terima kasih atas pertanyaan mengenai "${params.caseTitle ?? 'kasus ini'}". Berdasarkan konteks yang diberikan, saya dapat membantu menganalisis situasi dan memberikan panduan yang relevan. Mohon pastikan semua informasi yang diperlukan sudah dilengkapi dalam formulir masukan.`,
      suggestions: [
        "Lengkapi semua field masukan untuk analisis yang lebih akurat",
        "Tambahkan dokumen pendukung jika tersedia",
        "Pertimbangkan untuk menentukan prioritas kasus berdasarkan urgensi",
      ],
    },
    {
      response: `Analisis awal menunjukkan bahwa "${params.prompt}" merupakan topik yang perlu ditangani dengan pendekatan sistematis. Proses SIAP akan memandu Anda melalui setiap tahap dengan tepat.`,
      suggestions: [
        "Pastikan informasi yang dimasukkan lengkap dan akurat",
        "Jadwalkan review rutin untuk memantau perkembangan",
        "Koordinasikan dengan pemangku kepentingan terkait",
      ],
    },
  ];

  // Simple rotation based on prompt length for variety
  const selected = responses[params.prompt.length % responses.length];
  return selected;
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
