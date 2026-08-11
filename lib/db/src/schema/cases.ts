import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const caseStatusEnum = pgEnum("case_status", [
  "draft",
  "intake",
  "processing",
  "review",
  "completed",
]);

export const casePriorityEnum = pgEnum("case_priority", [
  "low",
  "normal",
  "high",
]);

export const casesTable = pgTable(
  "cases",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    orgId: text("org_id"),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    status: caseStatusEnum("status").notNull().default("draft"),
    priority: casePriorityEnum("priority").notNull().default("normal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    // Supports user-scoped paginated listings ordered by most-recently-updated
    index("cases_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);

export const insertCaseSchema = createInsertSchema(casesTable).omit({
  createdAt: true,
  updatedAt: true,
  userId: true,
  orgId: true,
});
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
