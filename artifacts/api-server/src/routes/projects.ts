import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, eventsTable, sessionsTable, customersTable } from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";
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
    const [customerCount] = await db.select({ count: count() }).from(customersTable).where(eq(customersTable.projectId, p.id));
    const [mrrResult] = await db.select({ mrr: sum(customersTable.mrr) }).from(customersTable).where(eq(customersTable.projectId, p.id));
    return {
      ...p,
      abacatePayConnected: false,
      eventCount: Number(eventsResult?.count ?? 0),
      sessionCount: Number(sessionsResult?.count ?? 0),
      customerCount: Number(customerCount?.count ?? 0),
      mrr: Number(mrrResult?.mrr ?? 0),
    };
  }));

  res.json(result);
});

router.post("/", async (req, res) => {
  const { name, description, website } = req.body as { name: string; description?: string; website?: string };
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const slug = generateSlug(name);
  const apiKey = generateApiKey();

  const [project] = await db.insert(projectsTable).values({
    name,
    slug,
    apiKey,
    description: description ?? null,
    website: website ?? null,
  }).returning();

  res.status(201).json({ ...project, abacatePayConnected: false, eventCount: 0, sessionCount: 0, customerCount: 0, mrr: 0 });
});

router.get("/:projectId", async (req, res) => {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, req.params.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [eventsResult] = await db.select({ count: count() }).from(eventsTable).where(eq(eventsTable.projectId, project.id));
  const [sessionsResult] = await db.select({ count: count() }).from(sessionsTable).where(eq(sessionsTable.projectId, project.id));
  const [customerCount] = await db.select({ count: count() }).from(customersTable).where(eq(customersTable.projectId, project.id));
  const [mrrResult] = await db.select({ mrr: sum(customersTable.mrr) }).from(customersTable).where(eq(customersTable.projectId, project.id));

  res.json({
    ...project,
    abacatePayConnected: false,
    eventCount: Number(eventsResult?.count ?? 0),
    sessionCount: Number(sessionsResult?.count ?? 0),
    customerCount: Number(customerCount?.count ?? 0),
    mrr: Number(mrrResult?.mrr ?? 0),
  });
});

router.patch("/:projectId", async (req, res) => {
  const body = req.body as { name?: string; description?: string; website?: string };
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.website !== undefined) updates.website = body.website;

  const [project] = await db.update(projectsTable).set(updates)
    .where(eq(projectsTable.id, req.params.projectId)).returning();

  res.json({ ...project, abacatePayConnected: false });
});

router.delete("/:projectId", async (req, res) => {
  await db.delete(projectsTable).where(eq(projectsTable.id, req.params.projectId));
  res.status(204).send();
});

export default router;
