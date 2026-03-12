import { Router } from "express";
import { db } from "@workspace/db";
import { requestsTable } from "@workspace/db";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { method, statusCode, from, to, limit = "100", offset = "0" } = req.query as Record<string, string>;
  
  const conditions = [eq(requestsTable.projectId, projectId)];
  if (method) conditions.push(eq(requestsTable.method, method.toUpperCase()));
  if (statusCode) conditions.push(eq(requestsTable.statusCode, parseInt(statusCode)));
  if (from) conditions.push(gte(requestsTable.timestamp, new Date(from)));
  if (to) conditions.push(lte(requestsTable.timestamp, new Date(to)));
  
  const [totalResult] = await db.select({ count: count() }).from(requestsTable).where(and(...conditions));
  const requests = await db.select().from(requestsTable)
    .where(and(...conditions))
    .orderBy(desc(requestsTable.timestamp))
    .limit(parseInt(limit))
    .offset(parseInt(offset));
  
  res.json({
    requests,
    total: Number(totalResult?.count ?? 0),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

router.post("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const body = req.body as any;
  
  const [record] = await db.insert(requestsTable).values({
    projectId,
    method: body.method.toUpperCase(),
    url: body.url,
    statusCode: body.statusCode,
    duration: body.duration,
    requestSize: body.requestSize ?? null,
    responseSize: body.responseSize ?? null,
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
    ip: body.ip ?? null,
    userAgent: body.userAgent ?? null,
    traceId: body.traceId ?? null,
    error: body.error ?? null,
  }).returning();
  
  res.status(201).json(record);
});

export default router;
