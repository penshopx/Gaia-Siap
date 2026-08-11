import { Router, type IRouter } from "express";
import { and, eq, gte, count, desc } from "drizzle-orm";
import { db, casesTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentCasesQueryParams,
  GetRecentCasesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const userFilter = eq(casesTable.userId, userId);

  const [allCounts, recentCount] = await Promise.all([
    db.select({ status: casesTable.status, cnt: count() })
      .from(casesTable)
      .where(userFilter)
      .groupBy(casesTable.status),
    db.select({ cnt: count() })
      .from(casesTable)
      .where(and(userFilter, gte(casesTable.updatedAt, sevenDaysAgo))),
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

  const userId = req.userId!;
  const limit = query.data.limit ?? 5;
  const userFilter = eq(casesTable.userId, userId);

  const [items, [{ total }]] = await Promise.all([
    db.select()
      .from(casesTable)
      .where(userFilter)
      .orderBy(desc(casesTable.updatedAt))
      .limit(limit),
    db.select({ total: count() }).from(casesTable).where(userFilter),
  ]);

  res.json(GetRecentCasesResponse.parse({ items, total }));
});

export default router;
