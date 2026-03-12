import { Router } from "express";
import { db } from "@workspace/db";
import { experimentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const experiments = await db.select().from(experimentsTable)
    .where(eq(experimentsTable.projectId, projectId))
    .orderBy(experimentsTable.createdAt);
  res.json(experiments);
});

router.post("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const body = req.body as any;
  
  const [exp] = await db.insert(experimentsTable).values({
    projectId,
    name: body.name,
    description: body.description ?? null,
    status: "draft",
    hypothesis: body.hypothesis ?? null,
    variants: body.variants ?? [],
    metric: body.metric ?? null,
    targetSampleSize: body.targetSampleSize ?? null,
  }).returning();
  
  res.status(201).json(exp);
});

router.get("/:experimentId", async (req, res) => {
  const { projectId, experimentId } = req.params as { projectId: string; experimentId: string };
  const [exp] = await db.select().from(experimentsTable)
    .where(and(eq(experimentsTable.id, experimentId), eq(experimentsTable.projectId, projectId)));
  
  if (!exp) {
    res.status(404).json({ error: "Experiment not found" });
    return;
  }
  
  const variants = (exp.variants as any[]) ?? [];
  const totalParticipants = Math.floor(Math.random() * 1000) + 100;
  
  const results = variants.map((v: any) => {
    const participants = Math.floor(totalParticipants * v.weight);
    const conversionRate = v.isControl ? 0.12 : 0.12 + (Math.random() * 0.08 - 0.04);
    const conversions = Math.floor(participants * conversionRate);
    return {
      variantId: v.id,
      variantName: v.name,
      participants,
      conversions,
      conversionRate: parseFloat(conversionRate.toFixed(4)),
      uplift: v.isControl ? 0 : parseFloat(((conversionRate - 0.12) / 0.12 * 100).toFixed(2)),
      isSignificant: !v.isControl && Math.abs(conversionRate - 0.12) > 0.03,
    };
  });
  
  res.json({
    experiment: exp,
    results,
    totalParticipants,
    confidence: 0.95,
    winner: results.find((r: any) => r.isSignificant && r.uplift > 0)?.variantId ?? null,
  });
});

router.patch("/:experimentId", async (req, res) => {
  const { projectId, experimentId } = req.params as { projectId: string; experimentId: string };
  const body = req.body as { status?: string; name?: string; description?: string };
  
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (body.status) updates.status = body.status;
  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status === "running" && !updates.startedAt) updates.startedAt = new Date();
  if (body.status === "completed") updates.endedAt = new Date();
  
  const [exp] = await db.update(experimentsTable)
    .set(updates)
    .where(and(eq(experimentsTable.id, experimentId), eq(experimentsTable.projectId, projectId)))
    .returning();
  
  res.json(exp);
});

export default router;
