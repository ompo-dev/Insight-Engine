import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, sessionsTable } from "@workspace/db";
import { eq, and, gte, lte, count, desc, asc, sql } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.post("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { events } = req.body as { events: any[] };
  
  if (!events || !Array.isArray(events)) {
    res.status(400).json({ error: "events array is required" });
    return;
  }
  
  const inserted = await db.insert(eventsTable).values(
    events.map((e) => ({
      projectId,
      name: e.name,
      sessionId: e.sessionId ?? null,
      userId: e.userId ?? null,
      anonymousId: e.anonymousId ?? null,
      properties: e.properties ?? null,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      url: e.url ?? null,
      referrer: e.referrer ?? null,
      userAgent: e.userAgent ?? null,
      ip: e.ip ?? null,
    }))
  ).returning({ id: eventsTable.id });
  
  res.status(201).json({ count: inserted.length, eventIds: inserted.map((r) => r.id) });
});

router.get("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { eventName, sessionId, userId, from, to, limit = "100", offset = "0" } = req.query as Record<string, string>;
  
  const conditions = [eq(eventsTable.projectId, projectId)];
  if (eventName) conditions.push(eq(eventsTable.name, eventName));
  if (sessionId) conditions.push(eq(eventsTable.sessionId, sessionId));
  if (userId) conditions.push(eq(eventsTable.userId, userId));
  if (from) conditions.push(gte(eventsTable.timestamp, new Date(from)));
  if (to) conditions.push(lte(eventsTable.timestamp, new Date(to)));
  
  const [totalResult] = await db.select({ count: count() }).from(eventsTable).where(and(...conditions));
  const events = await db.select().from(eventsTable)
    .where(and(...conditions))
    .orderBy(desc(eventsTable.timestamp))
    .limit(parseInt(limit))
    .offset(parseInt(offset));
  
  res.json({
    events,
    total: Number(totalResult?.count ?? 0),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

export default router;
