import { Router } from "express";
import { db } from "@workspace/db";
import { funnelsTable, eventsTable } from "@workspace/db";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params;
  const funnels = await db.select().from(funnelsTable)
    .where(eq(funnelsTable.projectId, projectId))
    .orderBy(funnelsTable.createdAt);
  res.json(funnels);
});

router.post("/", async (req, res) => {
  const { projectId } = req.params;
  const body = req.body as { name: string; description?: string; steps: any[] };
  
  const [funnel] = await db.insert(funnelsTable).values({
    projectId,
    name: body.name,
    description: body.description ?? null,
    steps: body.steps,
  }).returning();
  
  res.status(201).json(funnel);
});

router.get("/:funnelId/results", async (req, res) => {
  const { projectId, funnelId } = req.params;
  const { from, to } = req.query as Record<string, string>;
  
  const [funnel] = await db.select().from(funnelsTable)
    .where(and(eq(funnelsTable.id, funnelId), eq(funnelsTable.projectId, projectId)));
  
  if (!funnel) return res.status(404).json({ error: "Funnel not found" });
  
  const steps = (funnel.steps as any[]) ?? [];
  const now = new Date();
  const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : now;
  
  let previousUsers = 0;
  const stepResults = await Promise.all(steps.map(async (step, idx) => {
    const [result] = await db.select({ count: count() }).from(eventsTable)
      .where(and(
        eq(eventsTable.projectId, projectId),
        eq(eventsTable.name, step.eventName),
        gte(eventsTable.timestamp, fromDate),
        lte(eventsTable.timestamp, toDate),
      ));
    
    const users = Number(result?.count ?? 0);
    const conversionRate = idx === 0 ? 1 : (previousUsers > 0 ? users / previousUsers : 0);
    const dropoffRate = 1 - conversionRate;
    
    previousUsers = idx === 0 ? users : previousUsers;
    
    return {
      order: step.order,
      label: step.label,
      eventName: step.eventName,
      users,
      conversionRate: parseFloat(conversionRate.toFixed(4)),
      dropoffRate: parseFloat(dropoffRate.toFixed(4)),
    };
  }));
  
  const firstStepUsers = stepResults[0]?.users ?? 0;
  const lastStepUsers = stepResults[stepResults.length - 1]?.users ?? 0;
  const overallConversionRate = firstStepUsers > 0 ? lastStepUsers / firstStepUsers : 0;
  
  res.json({
    funnelId: funnel.id,
    funnelName: funnel.name,
    steps: stepResults,
    overallConversionRate: parseFloat(overallConversionRate.toFixed(4)),
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
  });
});

export default router;
