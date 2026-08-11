import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const caseResultsTable = pgTable("case_results", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().unique(),
  summary: text("summary").notNull(),
  details: text("details"),
  recommendations: jsonb("recommendations").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCaseResultSchema = createInsertSchema(caseResultsTable).omit({
  createdAt: true,
});
export type InsertCaseResult = z.infer<typeof insertCaseResultSchema>;
export type CaseResult = typeof caseResultsTable.$inferSelect;
