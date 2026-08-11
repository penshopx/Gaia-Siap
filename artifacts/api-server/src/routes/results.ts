import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, casesTable, caseResultsTable, intakesTable } from "@workspace/db";
import {
  GetCaseResultParams,
  GetCaseResultResponse,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/cases/:id/result", async (req, res): Promise<void> => {
  const params = GetCaseResultParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.id, params.data.id));

  if (!caseItem) {
    res.status(404).json({ error: "Kasus tidak ditemukan" });
    return;
  }

  // Try to find existing result
  const [existingResult] = await db
    .select()
    .from(caseResultsTable)
    .where(eq(caseResultsTable.caseId, params.data.id));

  if (existingResult) {
    res.json(GetCaseResultResponse.parse(existingResult));
    return;
  }

  // Auto-generate a result if case is completed or in review
  if (caseItem.status === "completed" || caseItem.status === "review") {
    const [intake] = await db
      .select()
      .from(intakesTable)
      .where(eq(intakesTable.caseId, params.data.id));

    const generatedResult = {
      id: randomUUID(),
      caseId: params.data.id,
      summary: `Kasus "${caseItem.title}" telah selesai diproses. Hasil analisis telah disiapkan berdasarkan informasi yang diberikan.`,
      details: intake
        ? `Berdasarkan ${(intake.fields as unknown[]).length} data masukan yang dikumpulkan, analisis telah diselesaikan dengan baik.`
        : "Analisis diselesaikan berdasarkan informasi yang tersedia.",
      recommendations: [
        "Tinjau hasil analisis dengan tim terkait",
        "Implementasikan rekomendasi sesuai prioritas",
        "Pantau perkembangan dalam 30 hari ke depan",
      ],
    };

    const [saved] = await db
      .insert(caseResultsTable)
      .values(generatedResult)
      .returning();

    res.json(GetCaseResultResponse.parse(saved));
    return;
  }

  res.status(404).json({ error: "Hasil belum tersedia. Kasus perlu diselesaikan terlebih dahulu." });
});

export default router;
