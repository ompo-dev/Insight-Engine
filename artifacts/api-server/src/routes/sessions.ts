import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, eventsTable } from "@workspace/db";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { userId, from, to, limit = "50", offset = "0" } = req.query as Record<string, string>;
  
  const conditions = [eq(sessionsTable.projectId, projectId)];
  if (userId) conditions.push(eq(sessionsTable.userId, userId));
  if (from) conditions.push(gte(sessionsTable.startedAt, new Date(from)));
  if (to) conditions.push(lte(sessionsTable.startedAt, new Date(to)));
  
  const [totalResult] = await db.select({ count: count() }).from(sessionsTable).where(and(...conditions));
  const sessions = await db.select().from(sessionsTable)
    .where(and(...conditions))
    .orderBy(desc(sessionsTable.startedAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));
  
  res.json({
    sessions,
    total: Number(totalResult?.count ?? 0),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

router.get("/:sessionId", async (req, res) => {
  const { projectId, sessionId } = req.params as { projectId: string; sessionId: string };
  
  const [session] = await db.select().from(sessionsTable)
    .where(and(eq(sessionsTable.projectId, projectId), eq(sessionsTable.id, sessionId)));
  
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  
  const events = await db.select().from(eventsTable)
    .where(and(eq(eventsTable.projectId, projectId), eq(eventsTable.sessionId, session.sessionId)))
    .orderBy(eventsTable.timestamp);
  
  res.json({ session, events });
});

export default router;
