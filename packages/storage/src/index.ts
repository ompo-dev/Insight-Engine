import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ArtifactRecord, AuditEvent } from "@workspace/runtime-core";

export interface LynxProjectPaths {
  projectRoot: string;
  lynxRoot: string;
  stateFile: string;
  projectsRoot: string;
  projectDir: string;
  workspaceSnapshotsDir: string;
  artifactsDir: string;
  cacheDir: string;
  auditFile: string;
}

export interface PersistedProjectWorkspaceState<TDefinition = unknown, TCustomItem = Record<string, unknown>> {
  projectId: string;
  definition: TDefinition | null;
  customItems: TCustomItem[];
  updatedAt: string;
}

export interface WorkspaceStateDatabase<TDefinition = unknown, TCustomItem = Record<string, unknown>> {
  projects: Record<string, PersistedProjectWorkspaceState<TDefinition, TCustomItem>>;
}

const writeQueues = new Map<string, Promise<unknown>>();

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function nextWriteQueue(filePath: string, job: () => Promise<void>) {
  const current = writeQueues.get(filePath) ?? Promise.resolve();
  const next = current.catch(() => undefined).then(job);
  writeQueues.set(filePath, next);
  return next;
}

export function resolveProjectRoot(projectRoot?: string) {
  return resolve(projectRoot?.trim() || resolve(process.cwd(), "..", ".."));
}

export function resolveLynxProjectPaths(projectId: string, projectRoot?: string): LynxProjectPaths {
  const resolvedProjectRoot = resolveProjectRoot(projectRoot);
  const lynxRoot = resolve(resolvedProjectRoot, ".lynx");
  const projectsRoot = resolve(lynxRoot, "projects");
  const projectDir = resolve(projectsRoot, projectId);

  return {
    projectRoot: resolvedProjectRoot,
    lynxRoot,
    stateFile: resolve(lynxRoot, "workspace-state.json"),
    projectsRoot,
    projectDir,
    workspaceSnapshotsDir: resolve(projectDir, "workspaces"),
    artifactsDir: resolve(projectDir, "artifacts"),
    cacheDir: resolve(projectDir, "cache"),
    auditFile: resolve(projectDir, "audit.ndjson"),
  };
}

export async function ensureLynxProjectLayout(projectId: string, projectRoot?: string) {
  const paths = resolveLynxProjectPaths(projectId, projectRoot);
  await mkdir(paths.lynxRoot, { recursive: true });
  await mkdir(paths.projectsRoot, { recursive: true });
  await mkdir(paths.projectDir, { recursive: true });
  await mkdir(paths.workspaceSnapshotsDir, { recursive: true });
  await mkdir(paths.artifactsDir, { recursive: true });
  await mkdir(paths.cacheDir, { recursive: true });
  return paths;
}

export async function loadWorkspaceDatabase<TDefinition = unknown, TCustomItem = Record<string, unknown>>(
  projectRoot?: string,
) {
  const paths = resolveLynxProjectPaths("default", projectRoot);
  if (!existsSync(paths.stateFile)) {
    return { projects: {} } satisfies WorkspaceStateDatabase<TDefinition, TCustomItem>;
  }

  try {
    const raw = await readFile(paths.stateFile, "utf8");
    const parsed = JSON.parse(raw) as WorkspaceStateDatabase<TDefinition, TCustomItem>;
    return {
      projects: parsed.projects ?? {},
    } satisfies WorkspaceStateDatabase<TDefinition, TCustomItem>;
  } catch {
    return { projects: {} } satisfies WorkspaceStateDatabase<TDefinition, TCustomItem>;
  }
}

export async function persistWorkspaceDatabase<TDefinition = unknown, TCustomItem = Record<string, unknown>>(
  database: WorkspaceStateDatabase<TDefinition, TCustomItem>,
  projectRoot?: string,
) {
  const paths = resolveLynxProjectPaths("default", projectRoot);
  await mkdir(dirname(paths.stateFile), { recursive: true });
  await nextWriteQueue(paths.stateFile, async () => {
    await writeFile(paths.stateFile, JSON.stringify(database, null, 2), "utf8");
  });
}

export async function appendAuditEvent(projectId: string, event: AuditEvent, projectRoot?: string) {
  const paths = await ensureLynxProjectLayout(projectId, projectRoot);
  const serialized = `${JSON.stringify(event)}\n`;
  await nextWriteQueue(paths.auditFile, async () => {
    const previous = existsSync(paths.auditFile) ? await readFile(paths.auditFile, "utf8") : "";
    await writeFile(paths.auditFile, `${previous}${serialized}`, "utf8");
  });
}

export async function listAuditEvents(projectId: string, projectRoot?: string) {
  const paths = resolveLynxProjectPaths(projectId, projectRoot);
  if (!existsSync(paths.auditFile)) return [] as AuditEvent[];
  const raw = await readFile(paths.auditFile, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditEvent);
}

export async function writeWorkspaceSnapshot<TDefinition = unknown, TCustomItem = Record<string, unknown>>(
  projectId: string,
  state: PersistedProjectWorkspaceState<TDefinition, TCustomItem>,
  reason = "snapshot",
  projectRoot?: string,
) {
  const paths = await ensureLynxProjectLayout(projectId, projectRoot);
  const fileName = `${state.updatedAt.replace(/[:.]/g, "-")}_${reason}.json`;
  const filePath = resolve(paths.workspaceSnapshotsDir, fileName);
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
  return filePath;
}

export async function writeArtifact(projectId: string, artifact: ArtifactRecord, content: string, projectRoot?: string) {
  const paths = await ensureLynxProjectLayout(projectId, projectRoot);
  const filePath = resolve(paths.projectDir, artifact.relativePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  const metadataPath = resolve(paths.artifactsDir, `${artifact.id}.json`);
  await writeFile(metadataPath, JSON.stringify(artifact, null, 2), "utf8");
  return { filePath, metadataPath };
}

export async function listArtifacts(projectId: string, projectRoot?: string) {
  const paths = resolveLynxProjectPaths(projectId, projectRoot);
  if (!existsSync(paths.artifactsDir)) return [] as ArtifactRecord[];
  const files = await readdir(paths.artifactsDir);
  const records = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => readFile(resolve(paths.artifactsDir, file), "utf8")),
  );
  return records.map((raw) => JSON.parse(raw) as ArtifactRecord);
}

export function clonePersistedState<TDefinition = unknown, TCustomItem = Record<string, unknown>>(
  state: PersistedProjectWorkspaceState<TDefinition, TCustomItem>,
) {
  return cloneValue(state);
}
