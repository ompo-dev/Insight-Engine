import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, eventsTable, sessionsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function generateApiKey(): string {
  return `lx_${randomUUID().replace(/-/g, "")}`;
}

router.get("/", async (_req, res) => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  
  const result = await Promise.all(projects.map(async (p) => {
    const [eventsResult] = await db.select({ count: count() }).from(eventsTable).where(eq(eventsTable.projectId, p.id));
    const [sessionsResult] = await db.select({ count: count() }).from(sessionsTable).where(eq(sessionsTable.projectId, p.id));
    return {
      ...p,
      eventCount: Number(eventsResult?.count ?? 0),
      sessionCount: Number(sessionsResult?.count ?? 0),
    };
  }));
  
  res.json(result);
});

router.post("/", async (req, res) => {
  const { name, description } = req.body as { name: string; description?: string };
  if (!name) return res.status(400).json({ error: "name is required" });
  
  const slug = generateSlug(name);
  const apiKey = generateApiKey();
  
  const [project] = await db.insert(projectsTable).values({
    name,
    slug,
    apiKey,
    description: description ?? null,
  }).returning();
  
  res.status(201).json(project);
});

router.get("/:projectId", async (req, res) => {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, req.params.projectId));
  if (!project) return res.status(404).json({ error: "Project not found" });
  
  const [eventsResult] = await db.select({ count: count() }).from(eventsTable).where(eq(eventsTable.projectId, project.id));
  const [sessionsResult] = await db.select({ count: count() }).from(sessionsTable).where(eq(sessionsTable.projectId, project.id));
  
  res.json({
    ...project,
    eventCount: Number(eventsResult?.count ?? 0),
    sessionCount: Number(sessionsResult?.count ?? 0),
  });
});

router.delete("/:projectId", async (req, res) => {
  await db.delete(projectsTable).where(eq(projectsTable.id, req.params.projectId));
  res.status(204).send();
});

export default router;
