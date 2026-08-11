import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, casesTable, workflowStepsTable } from "@workspace/db";
import {
  GetCaseWorkflowParams,
  AdvanceCaseWorkflowParams,
  AdvanceCaseWorkflowBody,
  GetCaseWorkflowResponse,
  AdvanceCaseWorkflowResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cases/:id/workflow", async (req, res): Promise<void> => {
  const params = GetCaseWorkflowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.userId!;

  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, params.data.id), eq(casesTable.userId, userId)));

  if (!caseItem) {
    res.status(404).json({ error: "Kasus tidak ditemukan" });
    return;
  }

  const steps = await db
    .select()
    .from(workflowStepsTable)
    .where(eq(workflowStepsTable.caseId, params.data.id))
    .orderBy(asc(workflowStepsTable.stepNumber));

  const currentStep = steps.find((s) => s.status === "active")?.stepNumber ?? null;

  res.json(GetCaseWorkflowResponse.parse({ steps, currentStep }));
});

router.post("/cases/:id/workflow/advance", async (req, res): Promise<void> => {
  const params = AdvanceCaseWorkflowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  AdvanceCaseWorkflowBody.safeParse(req.body);

  const userId = req.userId!;

  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, params.data.id), eq(casesTable.userId, userId)));

  if (!caseItem) {
    res.status(404).json({ error: "Kasus tidak ditemukan" });
    return;
  }

  const steps = await db
    .select()
    .from(workflowStepsTable)
    .where(eq(workflowStepsTable.caseId, params.data.id))
    .orderBy(asc(workflowStepsTable.stepNumber));

  const activeStep = steps.find((s) => s.status === "active");

  if (!activeStep) {
    res.status(400).json({ error: "Tidak ada langkah aktif untuk dimajukan" });
    return;
  }

  // Complete the active step
  await db
    .update(workflowStepsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(workflowStepsTable.id, activeStep.id));

  // Activate next step
  const nextStep = steps.find((s) => s.stepNumber === activeStep.stepNumber + 1);
  if (nextStep) {
    await db
      .update(workflowStepsTable)
      .set({ status: "active" })
      .where(eq(workflowStepsTable.id, nextStep.id));

    // Update case status to "processing" when we move past step 1
    if (caseItem.status === "intake" || caseItem.status === "draft") {
      await db
        .update(casesTable)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(casesTable.id, params.data.id));
    }
    // Update to "review" on the last step
    if (nextStep.stepNumber === steps.length) {
      await db
        .update(casesTable)
        .set({ status: "review", updatedAt: new Date() })
        .where(eq(casesTable.id, params.data.id));
    }
  } else {
    // All steps done
    await db
      .update(casesTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(casesTable.id, params.data.id));
  }

  // Return refreshed steps
  const updatedSteps = await db
    .select()
    .from(workflowStepsTable)
    .where(eq(workflowStepsTable.caseId, params.data.id))
    .orderBy(asc(workflowStepsTable.stepNumber));

  const currentStep = updatedSteps.find((s) => s.status === "active")?.stepNumber ?? null;

  res.json(AdvanceCaseWorkflowResponse.parse({ steps: updatedSteps, currentStep }));
});

export default router;
