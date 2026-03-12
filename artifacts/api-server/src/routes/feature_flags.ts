import { Router } from "express";
import { db } from "@workspace/db";
import { featureFlagsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const flags = await db.select().from(featureFlagsTable)
    .where(eq(featureFlagsTable.projectId, projectId))
    .orderBy(featureFlagsTable.createdAt);
  res.json(flags);
});

router.post("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const body = req.body as any;

  const [flag] = await db.insert(featureFlagsTable).values({
    projectId,
    key: body.key,
    name: body.name,
    description: body.description ?? null,
    enabled: body.enabled ?? false,
    rolloutPercentage: body.rolloutPercentage ?? 0,
    targetingRules: body.targetingRules ?? [],
    variants: body.variants ?? [],
  }).returning();

  res.status(201).json(flag);
});

router.patch("/:flagId", async (req, res) => {
  const { projectId, flagId } = req.params as { projectId: string; flagId: string };
  const body = req.body as any;

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.rolloutPercentage !== undefined) updates.rolloutPercentage = body.rolloutPercentage;
  if (body.targetingRules !== undefined) updates.targetingRules = body.targetingRules;

  const [flag] = await db.update(featureFlagsTable)
    .set(updates)
    .where(and(eq(featureFlagsTable.id, flagId), eq(featureFlagsTable.projectId, projectId)))
    .returning();

  res.json(flag);
});

router.delete("/:flagId", async (req, res) => {
  const { projectId, flagId } = req.params as { projectId: string; flagId: string };
  await db.delete(featureFlagsTable)
    .where(and(eq(featureFlagsTable.id, flagId), eq(featureFlagsTable.projectId, projectId)));
  res.status(204).send();
});

router.post("/evaluate", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { userId, plan, country, properties = {} } = req.body as any;

  const flags = await db.select().from(featureFlagsTable)
    .where(and(eq(featureFlagsTable.projectId, projectId), eq(featureFlagsTable.enabled, true)));

  const result: Record<string, boolean | string> = {};

  for (const flag of flags) {
    const rules = (flag.targetingRules as any[]) ?? [];
    let enabled = false;

    if (flag.rolloutPercentage >= 100) {
      enabled = true;
    } else if (flag.rolloutPercentage > 0) {
      const hash = userId.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
      enabled = (hash % 100) < flag.rolloutPercentage;
    }

    for (const rule of rules) {
      if (rule.type === "plan" && plan && rule.values.includes(plan)) {
        enabled = rule.operator === "in";
      }
      if (rule.type === "country" && country && rule.values.includes(country)) {
        enabled = rule.operator === "in";
      }
      if (rule.type === "user_id" && userId && rule.values.includes(userId)) {
        enabled = rule.operator === "in";
      }
    }

    result[flag.key] = enabled;
  }

  res.json({ flags: result });
});

export default router;
