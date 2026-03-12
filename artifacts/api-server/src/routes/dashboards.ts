import { Router } from "express";
import { db } from "@workspace/db";
import { dashboardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const dashboards = await db.select().from(dashboardsTable)
    .where(eq(dashboardsTable.projectId, projectId))
    .orderBy(dashboardsTable.createdAt);
  res.json(dashboards);
});

router.post("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const body = req.body as { name: string; description?: string };
  
  const [dashboard] = await db.insert(dashboardsTable).values({
    projectId,
    name: body.name,
    description: body.description ?? null,
    widgets: [],
  }).returning();
  
  res.status(201).json(dashboard);
});

export default router;
