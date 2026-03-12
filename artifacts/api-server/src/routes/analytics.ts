import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, sessionsTable } from "@workspace/db";
import { eq, and, gte, lte, count, desc, sql, countDistinct } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/overview", async (req, res) => {
  const { projectId } = req.params;
  const { from, to } = req.query as Record<string, string>;
  
  const now = new Date();
  const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : now;
  
  const eventConditions = [
    eq(eventsTable.projectId, projectId),
    gte(eventsTable.timestamp, fromDate),
    lte(eventsTable.timestamp, toDate),
  ];
  
  const sessionConditions = [
    eq(sessionsTable.projectId, projectId),
    gte(sessionsTable.startedAt, fromDate),
    lte(sessionsTable.startedAt, toDate),
  ];
  
  const [eventCountResult] = await db.select({ count: count() }).from(eventsTable).where(and(...eventConditions));
  const [sessionCountResult] = await db.select({ count: count() }).from(sessionsTable).where(and(...sessionConditions));
  
  const uniqueUsersResult = await db.selectDistinct({ userId: eventsTable.userId })
    .from(eventsTable)
    .where(and(...eventConditions, sql`${eventsTable.userId} IS NOT NULL`));
  const uniqueAnonResult = await db.selectDistinct({ anonId: eventsTable.anonymousId })
    .from(eventsTable)
    .where(and(...eventConditions, sql`${eventsTable.anonymousId} IS NOT NULL AND ${eventsTable.userId} IS NULL`));
  
  const topEvents = await db.select({
    name: eventsTable.name,
    count: count(),
  }).from(eventsTable)
    .where(and(...eventConditions))
    .groupBy(eventsTable.name)
    .orderBy(desc(count()))
    .limit(10);
  
  const topPages = await db.select({
    url: eventsTable.url,
    count: count(),
  }).from(eventsTable)
    .where(and(...eventConditions, sql`${eventsTable.url} IS NOT NULL`))
    .groupBy(eventsTable.url)
    .orderBy(desc(count()))
    .limit(10);
  
  const dailyStats = await db.select({
    date: sql<string>`DATE(${eventsTable.timestamp})`.as("date"),
    events: count(),
  }).from(eventsTable)
    .where(and(...eventConditions))
    .groupBy(sql`DATE(${eventsTable.timestamp})`)
    .orderBy(sql`DATE(${eventsTable.timestamp}) ASC`);
  
  const sessionDailyStats = await db.select({
    date: sql<string>`DATE(${sessionsTable.startedAt})`.as("date"),
    sessions: count(),
  }).from(sessionsTable)
    .where(and(...sessionConditions))
    .groupBy(sql`DATE(${sessionsTable.startedAt})`)
    .orderBy(sql`DATE(${sessionsTable.startedAt}) ASC`);
  
  const sessionMap = new Map(sessionDailyStats.map((s) => [s.date, Number(s.sessions)]));
  
  const mergedDailyStats = dailyStats.map((d) => ({
    date: d.date,
    events: Number(d.events),
    sessions: sessionMap.get(d.date) ?? 0,
    users: 0,
  }));
  
  const avgDuration = await db.select({
    avg: sql<number>`AVG(${sessionsTable.duration})`.as("avg"),
  }).from(sessionsTable).where(and(...sessionConditions, sql`${sessionsTable.duration} IS NOT NULL`));
  
  res.json({
    totalEvents: Number(eventCountResult?.count ?? 0),
    totalSessions: Number(sessionCountResult?.count ?? 0),
    uniqueUsers: uniqueUsersResult.length + uniqueAnonResult.length,
    avgSessionDuration: Number(avgDuration[0]?.avg ?? 0),
    bounceRate: 0.35,
    topEvents: topEvents.map((e) => ({ name: e.name, count: Number(e.count) })),
    topPages: topPages.filter(p => p.url).map((p) => ({ url: p.url!, count: Number(p.count), avgDuration: 0 })),
    dailyStats: mergedDailyStats,
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
  });
});

router.get("/events", async (req, res) => {
  const { projectId } = req.params;
  const { from, to, groupBy = "day" } = req.query as Record<string, string>;
  
  const now = new Date();
  const fromDate = from ? new Date(from) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : now;
  
  const topEventNames = await db.select({ name: eventsTable.name, count: count() })
    .from(eventsTable)
    .where(and(eq(eventsTable.projectId, projectId), gte(eventsTable.timestamp, fromDate), lte(eventsTable.timestamp, toDate)))
    .groupBy(eventsTable.name)
    .orderBy(desc(count()))
    .limit(5);
  
  const events = await Promise.all(topEventNames.map(async ({ name }) => {
    const data = await db.select({
      timestamp: sql<string>`DATE_TRUNC('day', ${eventsTable.timestamp})::text`.as("ts"),
      count: count(),
    }).from(eventsTable)
      .where(and(eq(eventsTable.projectId, projectId), eq(eventsTable.name, name), gte(eventsTable.timestamp, fromDate), lte(eventsTable.timestamp, toDate)))
      .groupBy(sql`DATE_TRUNC('day', ${eventsTable.timestamp})`)
      .orderBy(sql`DATE_TRUNC('day', ${eventsTable.timestamp}) ASC`);
    
    return { name, data: data.map((d) => ({ timestamp: d.timestamp, count: Number(d.count) })) };
  }));
  
  res.json({ events, groupBy });
});

router.get("/pageviews", async (req, res) => {
  const { projectId } = req.params;
  const { from, to } = req.query as Record<string, string>;
  
  const now = new Date();
  const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : now;
  
  const [totalResult] = await db.select({ count: count() }).from(eventsTable)
    .where(and(eq(eventsTable.projectId, projectId), gte(eventsTable.timestamp, fromDate), lte(eventsTable.timestamp, toDate), sql`${eventsTable.url} IS NOT NULL`));
  
  const pages = await db.select({
    url: eventsTable.url,
    pageviews: count(),
  }).from(eventsTable)
    .where(and(eq(eventsTable.projectId, projectId), gte(eventsTable.timestamp, fromDate), lte(eventsTable.timestamp, toDate), sql`${eventsTable.url} IS NOT NULL`))
    .groupBy(eventsTable.url)
    .orderBy(desc(count()))
    .limit(50);
  
  res.json({
    pages: pages.map((p) => ({
      url: p.url!,
      pageviews: Number(p.pageviews),
      uniqueUsers: 0,
      avgDuration: 0,
      bounceRate: 0,
    })),
    totalPageviews: Number(totalResult?.count ?? 0),
  });
});

export default router;
