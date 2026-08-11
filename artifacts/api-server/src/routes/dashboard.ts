import { Router, type IRouter } from "express";
import { eq, gte, count } from "drizzle-orm";
import { db, casesTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentCasesQueryParams,
  GetRecentCasesResponse,
  ListCasesResponse,
} from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [allCounts, recentCount] = await Promise.all([
    db.select({ status: casesTable.status, cnt: count() })
      .from(casesTable)
      .groupBy(casesTable.status),
    db.select({ cnt: count() })
      .from(casesTable)
      .where(gte(casesTable.updatedAt, sevenDaysAgo)),
  ]);

  const byStatus = {
    draft: 0,
    intake: 0,
    processing: 0,
    review: 0,
    completed: 0,
  };

  let totalCases = 0;
  for (const row of allCounts) {
    const s = row.status as keyof typeof byStatus;
    if (s in byStatus) {
      byStatus[s] = row.cnt;
      totalCases += row.cnt;
    }
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      totalCases,
      byStatus,
      recentActivity: recentCount[0]?.cnt ?? 0,
    })
  );
});

router.get("/dashboard/recent", async (req, res): Promise<void> => {
  const query = GetRecentCasesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const limit = query.data.limit ?? 5;
  const items = await db
    .select()
    .from(casesTable)
    .orderBy(desc(casesTable.updatedAt))
    .limit(limit);

  const [{ total }] = await db.select({ total: count() }).from(casesTable);

  res.json(GetRecentCasesResponse.parse({ items, total }));
});

export default router;
