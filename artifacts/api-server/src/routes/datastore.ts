import { Router } from "express";
import { db } from "@workspace/db";
import { datastoreTable } from "@workspace/db";
import { eq, and, count, desc, max, min, sql } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params;
  
  const collections = await db.select({
    name: datastoreTable.collection,
    recordCount: count(),
    updatedAt: max(datastoreTable.createdAt),
    createdAt: min(datastoreTable.createdAt),
  }).from(datastoreTable)
    .where(eq(datastoreTable.projectId, projectId))
    .groupBy(datastoreTable.collection)
    .orderBy(datastoreTable.collection);
  
  res.json(collections.map((c) => ({
    name: c.name,
    recordCount: Number(c.recordCount),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  })));
});

router.get("/:collection", async (req, res) => {
  const { projectId, collection } = req.params;
  const { limit = "50", offset = "0" } = req.query as Record<string, string>;
  
  const [totalResult] = await db.select({ count: count() }).from(datastoreTable)
    .where(and(eq(datastoreTable.projectId, projectId), eq(datastoreTable.collection, collection)));
  
  const records = await db.select().from(datastoreTable)
    .where(and(eq(datastoreTable.projectId, projectId), eq(datastoreTable.collection, collection)))
    .orderBy(desc(datastoreTable.createdAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));
  
  res.json({
    collection,
    records,
    total: Number(totalResult?.count ?? 0),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

router.post("/:collection", async (req, res) => {
  const { projectId, collection } = req.params;
  const { data } = req.body as { data: Record<string, any> };
  
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "data object is required" });
  }
  
  const [record] = await db.insert(datastoreTable).values({
    projectId,
    collection,
    data,
  }).returning();
  
  res.status(201).json(record);
});

export default router;
