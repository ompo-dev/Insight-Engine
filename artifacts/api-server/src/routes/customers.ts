import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, revenueEventsTable, eventsTable } from "@workspace/db";
import { eq, and, ilike, count, desc, or } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { status, plan, search, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const conditions = [eq(customersTable.projectId, projectId)];
  if (status) conditions.push(eq(customersTable.status, status));
  if (plan) conditions.push(eq(customersTable.plan, plan));
  if (search) {
    conditions.push(
      or(
        ilike(customersTable.email, `%${search}%`),
        ilike(customersTable.name!, `%${search}%`)
      )!
    );
  }

  const [totalResult] = await db.select({ count: count() }).from(customersTable).where(and(...conditions));
  const customers = await db.select().from(customersTable)
    .where(and(...conditions))
    .orderBy(desc(customersTable.createdAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  res.json({
    customers,
    total: Number(totalResult?.count ?? 0),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

router.post("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const body = req.body as any;

  const [customer] = await db.insert(customersTable).values({
    projectId,
    email: body.email,
    name: body.name ?? null,
    externalId: body.externalId ?? null,
    status: body.status ?? "active",
    plan: body.plan ?? null,
    mrr: body.mrr ?? 0,
    ltv: body.ltv ?? body.mrr ?? 0,
    country: body.country ?? null,
    metadata: body.metadata ?? null,
  }).returning();

  res.status(201).json(customer);
});

router.get("/:customerId", async (req, res) => {
  const { projectId, customerId } = req.params as { projectId: string; customerId: string };

  const [customer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.id, customerId), eq(customersTable.projectId, projectId)));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const revenueHistory = await db.select().from(revenueEventsTable)
    .where(and(eq(revenueEventsTable.projectId, projectId), eq(revenueEventsTable.customerId, customerId)))
    .orderBy(desc(revenueEventsTable.timestamp))
    .limit(20);

  const events = await db.select().from(eventsTable)
    .where(and(eq(eventsTable.projectId, projectId), eq(eventsTable.userId, customerId)))
    .orderBy(desc(eventsTable.timestamp))
    .limit(20);

  res.json({ customer, revenueHistory, events });
});

export default router;
