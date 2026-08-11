import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, casesTable, intakesTable } from "@workspace/db";
import {
  GetCaseIntakeParams,
  SubmitCaseIntakeParams,
  SubmitCaseIntakeBody,
  GetCaseIntakeResponse,
  SubmitCaseIntakeResponse,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/cases/:id/intake", async (req, res): Promise<void> => {
  const params = GetCaseIntakeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.userId!;

  // Verify case ownership before accessing intake
  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, params.data.id), eq(casesTable.userId, userId)));

  if (!caseItem) {
    res.status(404).json({ error: "Kasus tidak ditemukan" });
    return;
  }

  const [intake] = await db
    .select()
    .from(intakesTable)
    .where(eq(intakesTable.caseId, params.data.id));

  if (!intake) {
    res.status(404).json({ error: "Masukan belum tersedia untuk kasus ini" });
    return;
  }

  res.json(GetCaseIntakeResponse.parse(intake));
});

router.post("/cases/:id/intake", async (req, res): Promise<void> => {
  const params = SubmitCaseIntakeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SubmitCaseIntakeBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid intake body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.userId!;

  // Verify case ownership
  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, params.data.id), eq(casesTable.userId, userId)));

  if (!caseItem) {
    res.status(404).json({ error: "Kasus tidak ditemukan" });
    return;
  }

  // Upsert intake
  const [existing] = await db
    .select()
    .from(intakesTable)
    .where(eq(intakesTable.caseId, params.data.id));

  let intake;
  if (existing) {
    const [updated] = await db
      .update(intakesTable)
      .set({
        fields: parsed.data.fields,
        notes: parsed.data.notes ?? null,
        submittedAt: new Date(),
      })
      .where(eq(intakesTable.caseId, params.data.id))
      .returning();
    intake = updated;
  } else {
    const [created] = await db
      .insert(intakesTable)
      .values({
        id: randomUUID(),
        caseId: params.data.id,
        fields: parsed.data.fields,
        notes: parsed.data.notes ?? null,
      })
      .returning();
    intake = created;
  }

  // Update case status to "intake" if it was draft
  if (caseItem.status === "draft") {
    await db
      .update(casesTable)
      .set({ status: "intake", updatedAt: new Date() })
      .where(eq(casesTable.id, params.data.id));
  }

  res.json(SubmitCaseIntakeResponse.parse(intake));
});

export default router;
