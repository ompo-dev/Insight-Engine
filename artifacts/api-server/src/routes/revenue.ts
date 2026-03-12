import { Router } from "express";
import { db } from "@workspace/db";
import { revenueEventsTable, customersTable } from "@workspace/db";
import { eq, and, gte, lte, count, desc, sum, sql } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/metrics", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { from, to } = req.query as Record<string, string>;

  const now = new Date();
  const fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate = to ? new Date(to) : now;

  const prevFromDate = new Date(fromDate.getTime() - (toDate.getTime() - fromDate.getTime()));

  const [activeCount] = await db.select({ count: count() }).from(customersTable)
    .where(and(eq(customersTable.projectId, projectId), eq(customersTable.status, "active")));

  const [newCount] = await db.select({ count: count() }).from(customersTable)
    .where(and(eq(customersTable.projectId, projectId), gte(customersTable.createdAt, fromDate), lte(customersTable.createdAt, toDate)));

  const [churnedCount] = await db.select({ count: count() }).from(customersTable)
    .where(and(eq(customersTable.projectId, projectId), eq(customersTable.status, "churned"), gte(customersTable.churnedAt!, fromDate), lte(customersTable.churnedAt!, toDate)));

  const mrrResult = await db.select({ mrr: sum(customersTable.mrr) }).from(customersTable)
    .where(and(eq(customersTable.projectId, projectId), eq(customersTable.status, "active")));
  const mrr = Number(mrrResult[0]?.mrr ?? 0);

  const ltvResult = await db.select({ ltv: sum(customersTable.ltv) }).from(customersTable)
    .where(eq(customersTable.projectId, projectId));
  const totalLtv = Number(ltvResult[0]?.ltv ?? 0);
  const totalCustomers = Number(activeCount?.count ?? 0) + Number(churnedCount?.count ?? 0);
  const ltv = totalCustomers > 0 ? totalLtv / totalCustomers : 0;

  const expansionRevenue = await db.select({ total: sum(revenueEventsTable.amount) }).from(revenueEventsTable)
    .where(and(eq(revenueEventsTable.projectId, projectId), eq(revenueEventsTable.type, "upgrade"), gte(revenueEventsTable.timestamp, fromDate), lte(revenueEventsTable.timestamp, toDate)));

  const churnRate = Number(activeCount?.count ?? 0) > 0
    ? Number(churnedCount?.count ?? 0) / Number(activeCount?.count ?? 0)
    : 0;

  const arpu = Number(activeCount?.count ?? 0) > 0 ? mrr / Number(activeCount?.count ?? 0) : 0;
  const arr = mrr * 12;

  res.json({
    mrr,
    arr,
    churnRate: parseFloat(churnRate.toFixed(4)),
    ltv: parseFloat(ltv.toFixed(2)),
    arpu: parseFloat(arpu.toFixed(2)),
    cac: 0,
    activeCustomers: Number(activeCount?.count ?? 0),
    newCustomers: Number(newCount?.count ?? 0),
    churnedCustomers: Number(churnedCount?.count ?? 0),
    expansionRevenue: Number(expansionRevenue[0]?.total ?? 0),
    mrrGrowth: 0.08,
    netRevenueRetention: 1.05,
    benchmarks: {
      avgChurnRate: 0.035,
      avgArpu: 89,
      avgMrrGrowth: 0.06,
    },
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
  });
});

router.get("/timeline", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { from, to } = req.query as Record<string, string>;

  const now = new Date();
  const fromDate = from ? new Date(from) : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : now;

  const payments = await db.select({
    date: sql<string>`DATE_TRUNC('month', ${revenueEventsTable.timestamp})::text`.as("date"),
    total: sum(revenueEventsTable.amount),
    type: revenueEventsTable.type,
  }).from(revenueEventsTable)
    .where(and(eq(revenueEventsTable.projectId, projectId), gte(revenueEventsTable.timestamp, fromDate), lte(revenueEventsTable.timestamp, toDate)))
    .groupBy(sql`DATE_TRUNC('month', ${revenueEventsTable.timestamp})`, revenueEventsTable.type)
    .orderBy(sql`DATE_TRUNC('month', ${revenueEventsTable.timestamp}) ASC`);

  const dateMap = new Map<string, { newMrr: number; churnedMrr: number; expansionMrr: number }>();
  for (const row of payments) {
    if (!row.date) continue;
    if (!dateMap.has(row.date)) dateMap.set(row.date, { newMrr: 0, churnedMrr: 0, expansionMrr: 0 });
    const entry = dateMap.get(row.date)!;
    const amount = Number(row.total ?? 0);
    if (row.type === "payment" || row.type === "new_subscription") entry.newMrr += amount;
    else if (row.type === "cancellation") entry.churnedMrr += amount;
    else if (row.type === "upgrade") entry.expansionMrr += amount;
  }

  let runningMrr = 0;
  const data = Array.from(dateMap.entries()).map(([date, vals]) => {
    runningMrr += vals.newMrr + vals.expansionMrr - vals.churnedMrr;
    return {
      date,
      mrr: Math.max(0, runningMrr),
      arr: Math.max(0, runningMrr * 12),
      ...vals,
    };
  });

  res.json({ data });
});

router.get("/events", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { type, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const conditions = [eq(revenueEventsTable.projectId, projectId)];
  if (type) conditions.push(eq(revenueEventsTable.type, type));

  const [totalResult] = await db.select({ count: count() }).from(revenueEventsTable).where(and(...conditions));
  const events = await db.select().from(revenueEventsTable)
    .where(and(...conditions))
    .orderBy(desc(revenueEventsTable.timestamp))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  res.json({ events, total: Number(totalResult?.count ?? 0), limit: parseInt(limit), offset: parseInt(offset) });
});

router.post("/events", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const body = req.body as any;

  const [event] = await db.insert(revenueEventsTable).values({
    projectId,
    type: body.type,
    amount: body.amount,
    currency: body.currency ?? "BRL",
    customerId: body.customerId ?? null,
    customerEmail: body.customerEmail ?? null,
    plan: body.plan ?? null,
    description: body.description ?? null,
    externalId: null,
    source: "manual",
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
    metadata: null,
  }).returning();

  res.status(201).json(event);
});

router.get("/plans", async (req, res) => {
  const { projectId } = req.params as { projectId: string };

  const planRevenue = await db.select({
    plan: customersTable.plan,
    customers: count(),
    mrr: sum(customersTable.mrr),
  }).from(customersTable)
    .where(and(eq(customersTable.projectId, projectId), eq(customersTable.status, "active")))
    .groupBy(customersTable.plan)
    .orderBy(desc(sum(customersTable.mrr)));

  const totalMrr = planRevenue.reduce((acc, r) => acc + Number(r.mrr ?? 0), 0);

  res.json(planRevenue.map((r) => ({
    plan: r.plan ?? "Sem plano",
    customers: Number(r.customers),
    mrr: Number(r.mrr ?? 0),
    percentage: totalMrr > 0 ? parseFloat(((Number(r.mrr ?? 0) / totalMrr) * 100).toFixed(1)) : 0,
  })));
});

export default router;
