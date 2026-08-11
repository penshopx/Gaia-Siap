import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, casesTable, workflowStepsTable, intakesTable } from "@workspace/db";
import {
  CreateCaseBody,
  UpdateCaseBody,
  GetCaseParams,
  UpdateCaseParams,
  DeleteCaseParams,
  ListCasesQueryParams,
  GetCaseResponse,
  ListCasesResponse,
  UpdateCaseResponse,
  CreateCaseResponse,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// Default workflow steps for a new case
const DEFAULT_WORKFLOW_STEPS = [
  { stepNumber: 1, title: "Pengumpulan Masukan", description: "Kumpulkan informasi dan detail tentang kasus" },
  { stepNumber: 2, title: "Analisis & Penilaian", description: "AI memproses dan menganalisis masukan yang diberikan" },
  { stepNumber: 3, title: "Tinjauan", description: "Tinjau hasil analisis dan validasi temuan" },
  { stepNumber: 4, title: "Finalisasi", description: "Finalisasi hasil dan buat rekomendasi" },
];

router.get("/cases", async (req, res): Promise<void> => {
  const query = ListCasesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, limit = 20, offset = 0 } = query.data;

  let baseQuery = db.select().from(casesTable);
  if (status) {
    baseQuery = baseQuery.where(eq(casesTable.status, status)) as typeof baseQuery;
  }

  const [items, [{ total }]] = await Promise.all([
    baseQuery
      .orderBy(desc(casesTable.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(casesTable),
  ]);

  res.json(ListCasesResponse.parse({ items, total }));
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid case input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const id = randomUUID();
  const [newCase] = await db
    .insert(casesTable)
    .values({ id, ...parsed.data })
    .returning();

  // Create default workflow steps
  await db.insert(workflowStepsTable).values(
    DEFAULT_WORKFLOW_STEPS.map((step, i) => ({
      id: randomUUID(),
      caseId: id,
      ...step,
      status: i === 0 ? ("active" as const) : ("pending" as const),
    }))
  );

  res.status(201).json(CreateCaseResponse.parse(newCase));
});

router.get("/cases/:id", async (req, res): Promise<void> => {
  const params = GetCaseParams.safeParse(req.params);
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

  res.json(GetCaseResponse.parse(caseItem));
});

router.patch("/cases/:id", async (req, res): Promise<void> => {
  const params = UpdateCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(casesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(casesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Kasus tidak ditemukan" });
    return;
  }

  res.json(UpdateCaseResponse.parse(updated));
});

router.delete("/cases/:id", async (req, res): Promise<void> => {
  const params = DeleteCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(casesTable)
    .where(eq(casesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Kasus tidak ditemukan" });
    return;
  }

  res.sendStatus(204);
});

export default router;
