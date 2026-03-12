import { Router } from "express";
import { db } from "@workspace/db";
import { logsTable } from "@workspace/db";
import { eq, and, gte, lte, count, desc, like, sql } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params;
  const { level, service, from, to, search, limit = "100", offset = "0" } = req.query as Record<string, string>;
  
  const conditions = [eq(logsTable.projectId, projectId)];
  if (level) conditions.push(eq(logsTable.level, level));
  if (service) conditions.push(eq(logsTable.service, service));
  if (from) conditions.push(gte(logsTable.timestamp, new Date(from)));
  if (to) conditions.push(lte(logsTable.timestamp, new Date(to)));
  if (search) conditions.push(like(logsTable.message, `%${search}%`));
  
  const [totalResult] = await db.select({ count: count() }).from(logsTable).where(and(...conditions));
  const entries = await db.select().from(logsTable)
    .where(and(...conditions))
    .orderBy(desc(logsTable.timestamp))
    .limit(parseInt(limit))
    .offset(parseInt(offset));
  
  res.json({
    entries,
    total: Number(totalResult?.count ?? 0),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

router.post("/", async (req, res) => {
  const { projectId } = req.params;
  const { entries } = req.body as { entries: any[] };
  
  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ error: "entries array is required" });
  }
  
  await db.insert(logsTable).values(
    entries.map((e) => ({
      projectId,
      level: e.level,
      message: e.message,
      service: e.service ?? null,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      meta: e.meta ?? null,
      traceId: e.traceId ?? null,
      spanId: null,
    }))
  );
  
  res.status(201).json({ count: entries.length });
});

export default router;
