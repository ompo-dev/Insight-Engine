import { randomUUID } from "node:crypto";
import type {
  CreateProjectInput,
  ExecuteTerminalCommandInput,
  ExecuteTerminalResponse,
  ProjectSettings,
  ProjectSummary,
  UpdateProjectInput
} from "@workspace/contracts";
import { getPrismaClient } from "@workspace/db";

const fallbackProjects: ProjectSummary[] = [
  {
    id: "proj_orbit",
    name: "Orbit Commerce",
    slug: "orbit-commerce",
    description: "Canvas operacional para crescimento, receita e automacoes.",
    website: "https://orbit.local",
    apiKey: "lynx_orbit_local",
    abacatePayConnected: false,
    eventCount: 28493,
    sessionCount: 4321,
    customerCount: 481,
    mrr: 128430,
    createdAt: new Date("2026-03-10T10:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-03-24T19:00:00.000Z").toISOString()
  },
  {
    id: "proj_atlas",
    name: "Atlas CRM",
    slug: "atlas-crm",
    description: "Operacao unificada de CRM e correlacoes de produto.",
    website: "https://atlas.local",
    apiKey: "lynx_atlas_local",
    abacatePayConnected: false,
    eventCount: 12984,
    sessionCount: 1894,
    customerCount: 172,
    mrr: 67210,
    createdAt: new Date("2026-03-08T09:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-03-25T16:00:00.000Z").toISOString()
  }
];

const fallbackProjectSettings: Record<string, ProjectSettings> = {
  proj_orbit: {
    projectId: "proj_orbit",
    environment: "production",
    website: "https://orbit.local",
    apiBaseUrl: "https://api.orbit.local",
    webhookUrl: "https://orbit.local/api/webhooks/lynx",
    timezone: "America/Sao_Paulo",
    locale: "pt-BR",
    retentionDays: 90,
    enableAnonymizedTracking: true,
    enableSessionReplay: true,
    enableProductEmails: true,
    enableErrorAlerts: true,
    sdkSnippet:
      '<script>\n  window.lynx.init({ apiKey: "lynx_orbit_local", projectId: "proj_orbit" })\n</script>'
  },
  proj_atlas: {
    projectId: "proj_atlas",
    environment: "production",
    website: "https://atlas.local",
    apiBaseUrl: "https://api.atlas.local",
    webhookUrl: "https://atlas.local/api/webhooks/lynx",
    timezone: "America/Sao_Paulo",
    locale: "pt-BR",
    retentionDays: 60,
    enableAnonymizedTracking: true,
    enableSessionReplay: false,
    enableProductEmails: true,
    enableErrorAlerts: true,
    sdkSnippet:
      '<script>\n  window.lynx.init({ apiKey: "lynx_atlas_local", projectId: "proj_atlas" })\n</script>'
  }
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fallbackProjectById(projectId: string) {
  return fallbackProjects.find((project) => project.id === projectId || project.slug === projectId) ?? null;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  if (!process.env.DATABASE_URL) {
    return fallbackProjects;
  }

  try {
    const prisma = getPrismaClient();
    const projects = await prisma.project.findMany({
      orderBy: {
        createdAt: "asc"
      }
    });

    if (!projects.length) {
      return fallbackProjects;
    }

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      website: project.website,
      apiKey: project.apiKey,
      abacatePayConnected: project.abacatePayConnected,
      eventCount: 0,
      sessionCount: 0,
      customerCount: 0,
      mrr: 0,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString()
    }));
  } catch {
    return fallbackProjects;
  }
}

export async function getProject(projectId: string): Promise<ProjectSummary | null> {
  const projects = await listProjects();
  return projects.find((project) => project.id === projectId || project.slug === projectId) ?? null;
}

export async function getProjectSettings(projectId: string): Promise<ProjectSettings> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const fallback =
    fallbackProjectSettings[project.id] ??
    ({
      projectId: project.id,
      environment: "production",
      website: project.website ?? "",
      apiBaseUrl: "https://api.seu-dominio.com",
      webhookUrl: `https://seu-dominio.com/api/webhooks/${project.slug}`,
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
      retentionDays: 90,
      enableAnonymizedTracking: true,
      enableSessionReplay: true,
      enableProductEmails: true,
      enableErrorAlerts: true,
      sdkSnippet: `<script>\n  window.lynx.init({ apiKey: "${project.apiKey}", projectId: "${project.id}" })\n</script>`
    } satisfies ProjectSettings);

  return fallback;
}

export async function updateProjectSettings(
  projectId: string,
  input: Partial<ProjectSettings>
): Promise<ProjectSettings> {
  const current = await getProjectSettings(projectId);
  const next = {
    ...current,
    ...input,
    projectId: current.projectId
  };

  fallbackProjectSettings[current.projectId] = next;

  if (input.website && input.website !== current.website) {
    await updateProject(projectId, { website: input.website });
  }

  return next;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectSummary> {
  const now = new Date().toISOString();
  const project: ProjectSummary = {
    id: `proj_${slugify(input.name)}`,
    name: input.name,
    slug: slugify(input.name),
    description: input.description ?? null,
    website: input.website ?? null,
    apiKey: `lynx_${randomUUID().replace(/-/g, "")}`,
    abacatePayConnected: false,
    eventCount: 0,
    sessionCount: 0,
    customerCount: 0,
    mrr: 0,
    createdAt: now,
    updatedAt: now
  };

  if (!process.env.DATABASE_URL) {
    fallbackProjects.unshift(project);
    return project;
  }

  const prisma = getPrismaClient();
  const created = await prisma.project.create({
    data: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description ?? undefined,
      website: project.website ?? undefined,
      apiKey: project.apiKey,
      abacatePayConnected: false
    }
  });

  return {
    ...project,
    id: created.id,
    slug: created.slug,
    apiKey: created.apiKey,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString()
  };
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectSummary> {
  if (!process.env.DATABASE_URL) {
    const current = fallbackProjectById(projectId);
    if (!current) {
      throw new Error("Project not found");
    }

    const updated = {
      ...current,
      ...input,
      slug: input.name ? slugify(input.name) : current.slug,
      updatedAt: new Date().toISOString()
    };

    const index = fallbackProjects.findIndex((project) => project.id === current.id);
    fallbackProjects[index] = updated;
    return updated;
  }

  const prisma = getPrismaClient();
  const updated = await prisma.project.update({
    where: {
      id: projectId
    },
    data: {
      ...(input.name ? { name: input.name, slug: slugify(input.name) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.website !== undefined ? { website: input.website } : {})
    }
  });

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description,
    website: updated.website,
    apiKey: updated.apiKey,
    abacatePayConnected: updated.abacatePayConnected,
    eventCount: 0,
    sessionCount: 0,
    customerCount: 0,
    mrr: 0,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString()
  };
}

export async function getDefaultProject() {
  const projects = await listProjects();
  return projects[0] ?? null;
}

export type TerminalExecutor = (input: ExecuteTerminalCommandInput) => Promise<ExecuteTerminalResponse>;
