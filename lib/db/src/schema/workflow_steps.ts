import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stepStatusEnum = pgEnum("step_status", [
  "pending",
  "active",
  "completed",
  "blocked",
]);

export const workflowStepsTable = pgTable("workflow_steps", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: stepStatusEnum("status").notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertWorkflowStepSchema = createInsertSchema(workflowStepsTable);
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
export type WorkflowStep = typeof workflowStepsTable.$inferSelect;
