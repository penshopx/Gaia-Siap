import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const intakesTable = pgTable("intakes", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  fields: jsonb("fields").notNull().default([]),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIntakeSchema = createInsertSchema(intakesTable).omit({
  submittedAt: true,
});
export type InsertIntake = z.infer<typeof insertIntakeSchema>;
export type Intake = typeof intakesTable.$inferSelect;
