import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import {
  appendAuditEvent,
  clonePersistedState,
  loadWorkspaceDatabase,
  persistWorkspaceDatabase,
  writeWorkspaceSnapshot,
  type PersistedProjectWorkspaceState,
  type WorkspaceStateDatabase,
} from "@workspace/storage";
import { createAuditEvent } from "@workspace/runtime-core";

export type PersistedWorkspaceNodeKind = "plugin" | "item";
export type PersistedWorkspaceViewTemplate = "workspace" | "automation";
export type PersistedSpecialNodeKind =
  | "terminal"
  | "markdown"
  | "ai"
  | "file-manager"
  | "file-viewer"
  | "browser";

export interface PersistedWorkspaceNodeBinding {
  kind: PersistedWorkspaceNodeKind;
  entityId: string;
}

export interface PersistedCanvasNode {
  id: string;
  binding: PersistedWorkspaceNodeBinding;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
}

export interface PersistedCanvasEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  tone?: string;
  kind?: string;
  type?: string;
  dashed?: boolean;
  custom?: boolean;
  animated?: boolean;
}

export interface PersistedWorkspaceView {
  id: string;
  name: string;
  roleId: string;
  source: "preset" | "custom";
  template?: PersistedWorkspaceViewTemplate;
  nodes: PersistedCanvasNode[];
  edges: PersistedCanvasEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PersistedWorkspaceDefinition {
  projectId: string;
  roleId: string;
  tabs: PersistedWorkspaceView[];
  activeTabId: string;
  selectedNodeId: string | null;
  inspectorTab: "overview" | "data" | "actions" | "config";
  activeLayer?: "map" | "flows";
}

export interface PersistedTerminalConfig {
  shell: "bash" | "zsh" | "powershell" | "cmd";
  command: string;
  workingDirectory: string;
  cols?: number;
  rows?: number;
  streamOutput: boolean;
  stdinExpression: string;
  liveOutput: string;
  sessionId?: string | null;
  sessionStatus?: "disconnected" | "idle" | "running" | "error" | "exited";
  lastExitCode?: number | null;
  lastRunAt?: string | null;
}

export interface PersistedCustomItemDefinition {
  id: string;
  projectId: string;
  slug: string;
  label: string;
  description?: string | null;
  tags: string[];
  status: "healthy" | "attention" | "inactive" | "draft";
  inputEnabled: boolean;
  schema?: Record<string, unknown>;
  samplePayload?: Record<string, unknown> | null;
  identityKeys: string[];
  timestampField?: string | null;
  expression: string;
  resultType: "auto" | "number" | "currency" | "percentage" | "text" | "dataset";
  displayEnabled: boolean;
  presentation: "stat" | "table" | "line" | "comparison" | "text";
  actionEnabled: boolean;
  actionType: "webhook" | "dataset-export" | "integration" | "ai-trigger";
  actionTarget?: string | null;
  actionMethod: "POST" | "PUT" | "PATCH";
  actionLive: boolean;
  actionPayloadExpression: string;
  specialKind?: PersistedSpecialNodeKind | null;
  terminal?: PersistedTerminalConfig;
  markdown?: {
    document: string;
    template: "report" | "notes" | "freeform";
    autoPreview: boolean;
  };
  ai?: {
    provider: "openai" | "anthropic" | "google" | "custom";
    model: string;
    apiKey: string;
    systemPrompt: string;
    autoRun: boolean;
    temperature: number;
    lastResponse: string;
  };
  fileManager?: {
    assetIds: string[];
    sortBy: "recent" | "name" | "size";
    filter: string;
    selectedAssetId?: string | null;
    viewMode: "list" | "grid";
  };
  fileViewer?: {
    assetId?: string | null;
    viewerType: "document" | "image" | "table" | "text";
    previewState: "ready" | "processing" | "error" | "missing";
    activeSheet?: string | null;
    currentPage?: number;
  };
  browser?: {
    url: string;
    history: string[];
    historyIndex: number;
    title: string;
    loading: boolean;
    lastHtmlText: string;
    lastError?: string | null;
  };
  executionRuns?: Array<Record<string, unknown>>;
  actionDeliveries?: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface CreateSpecialNodeInput {
  tabId?: string;
  kind: PersistedSpecialNodeKind | "default";
  label?: string;
  description?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  command?: string;
}

const DEFAULT_WORKING_DIRECTORY = resolveProjectRoot();

const SPECIAL_NODE_SIZE: Record<CreateSpecialNodeInput["kind"], { w: number; h: number }> = {
  default: { w: 360, h: 216 },
  terminal: { w: 520, h: 320 },
  markdown: { w: 520, h: 344 },
  ai: { w: 420, h: 272 },
  "file-manager": { w: 560, h: 380 },
  "file-viewer": { w: 760, h: 520 },
  browser: { w: 760, h: 520 },
};

let databaseCache: WorkspaceStateDatabase<PersistedWorkspaceDefinition, PersistedCustomItemDefinition> | null = null;

function resolveProjectRoot() {
  return process.cwd().includes("\\apps\\api") || process.cwd().includes("/apps/api")
    ? resolve(process.cwd(), "..", "..")
    : process.cwd();
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "node"
  );
}

function nextTimestamp() {
  return new Date().toISOString();
}

function defaultSchema() {
  return {
    type: "object",
    properties: {
      id: { type: "string", required: true },
      updatedAt: { type: "date-time", required: true },
      payload: { type: "string" },
    },
  } satisfies Record<string, unknown>;
}

function defaultPayload(slug: string) {
  return {
    id: `${slug}_001`,
    updatedAt: nextTimestamp(),
    payload: "",
  } satisfies Record<string, unknown>;
}

function defaultTerminalConfig(command?: string): PersistedTerminalConfig {
  return {
    shell: process.platform === "win32" ? "cmd" : "bash",
    command: command?.trim() || (process.platform === "win32" ? "dir" : "ls"),
    workingDirectory: DEFAULT_WORKING_DIRECTORY,
    cols: 120,
    rows: 30,
    streamOutput: true,
    stdinExpression: "result",
    liveOutput: [
      process.platform === "win32" ? "Microsoft Windows [versao local]" : "local shell ready",
      process.platform === "win32" ? `${DEFAULT_WORKING_DIRECTORY}>` : `${DEFAULT_WORKING_DIRECTORY}$`,
      "runtime local conectado",
      "session pronta para receber comandos",
    ].join("\n"),
    sessionId: null,
    sessionStatus: "disconnected",
    lastExitCode: null,
    lastRunAt: null,
  };
}

function defaultMarkdownConfig() {
  return {
    document: ["# Relatorio", "", "## Contexto", "- Node local-first pronto para automacao.", "", "## Proximos passos"].join("\n"),
    template: "report" as const,
    autoPreview: true,
  };
}

function defaultAiConfig() {
  return {
    provider: "openai" as const,
    model: "gpt-5.4-mini",
    apiKey: "",
    systemPrompt: "Leia o contexto recebido, planeje o fluxo necessario e responda com passos acionaveis.",
    autoRun: false,
    temperature: 0.3,
    lastResponse: "Aguardando contexto para executar o fluxo.",
  };
}

function defaultFileManagerConfig() {
  return {
    assetIds: [],
    sortBy: "recent" as const,
    filter: "",
    selectedAssetId: null,
    viewMode: "list" as const,
  };
}

function defaultFileViewerConfig() {
  return {
    assetId: null,
    viewerType: "document" as const,
    previewState: "missing" as const,
    activeSheet: null,
    currentPage: 1,
  };
}

function defaultBrowserConfig(label?: string) {
  return {
    url: "https://example.com",
    history: ["https://example.com"],
    historyIndex: 0,
    title: label?.trim() || "Browser Node",
    loading: false,
    lastHtmlText: "",
    lastError: null,
  };
}

function createWorkspaceView(name: string, template: PersistedWorkspaceViewTemplate = "workspace"): PersistedWorkspaceView {
  const now = nextTimestamp();
  return {
    id: `view_${slugify(name)}_${randomUUID().slice(0, 8)}`,
    name,
    roleId: "workspace",
    source: "custom",
    template,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  };
}

function createDefaultWorkspaceDefinition(projectId: string): PersistedWorkspaceDefinition {
  const firstView = createWorkspaceView("Workspace", "workspace");
  return {
    projectId,
    roleId: "workspace",
    tabs: [firstView],
    activeTabId: firstView.id,
    selectedNodeId: null,
    inspectorTab: "overview",
    activeLayer: "map",
  };
}

function ensureUniqueSlug(desiredSlug: string, items: PersistedCustomItemDefinition[], itemId?: string) {
  const baseSlug = slugify(desiredSlug);
  const taken = new Set(items.filter((item) => item.id !== itemId).map((item) => item.slug));
  if (!taken.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (taken.has(`${baseSlug}_${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}_${counter}`;
}

function createCustomItem(
  projectId: string,
  items: PersistedCustomItemDefinition[],
  input: { label?: string; description?: string; specialKind?: PersistedSpecialNodeKind | null; command?: string } = {},
) {
  const now = nextTimestamp();
  const label = input.label?.trim() || `Node ${items.length + 1}`;
  const slug = ensureUniqueSlug(label, items);
  const specialKind = input.specialKind ?? null;

  return {
    id: slug,
    projectId,
    slug,
    label,
    description: input.description?.trim() || "Node programavel controlado pelo workspace.",
    tags: specialKind ? [specialKind, "automation"] : ["node", "logic"],
    status: "draft" as const,
    inputEnabled: Boolean(specialKind),
    schema: defaultSchema(),
    samplePayload: defaultPayload(slug),
    identityKeys: ["id"],
    timestampField: "updatedAt",
    expression: "",
    resultType: specialKind ? ("text" as const) : ("auto" as const),
    displayEnabled: Boolean(specialKind),
    presentation: "text" as const,
    actionEnabled: false,
    actionType: "webhook" as const,
    actionTarget: "https://api.exemplo.dev/hooks/lynx",
    actionMethod: "POST" as const,
    actionLive: false,
    actionPayloadExpression: "result",
    specialKind,
    terminal: specialKind === "terminal" ? defaultTerminalConfig(input.command) : undefined,
    markdown: specialKind === "markdown" ? defaultMarkdownConfig() : undefined,
    ai: specialKind === "ai" ? defaultAiConfig() : undefined,
    fileManager: specialKind === "file-manager" ? defaultFileManagerConfig() : undefined,
    fileViewer: specialKind === "file-viewer" ? defaultFileViewerConfig() : undefined,
    browser: specialKind === "browser" ? defaultBrowserConfig(label) : undefined,
    executionRuns: [],
    actionDeliveries: [],
    createdAt: now,
    updatedAt: now,
  } satisfies PersistedCustomItemDefinition;
}

function resolveNodePosition(view: PersistedWorkspaceView) {
  const column = view.nodes.length % 3;
  const row = Math.floor(view.nodes.length / 3);
  return { x: 120 + column * 340, y: 80 + row * 240 };
}

function touchView(view: PersistedWorkspaceView): PersistedWorkspaceView {
  return {
    ...view,
    updatedAt: nextTimestamp(),
  };
}

async function loadDatabase() {
  if (databaseCache) return databaseCache;
  databaseCache = await loadWorkspaceDatabase<PersistedWorkspaceDefinition, PersistedCustomItemDefinition>();
  return databaseCache;
}

async function persistDatabase(nextDatabase: WorkspaceStateDatabase<PersistedWorkspaceDefinition, PersistedCustomItemDefinition>) {
  databaseCache = nextDatabase;
  await persistWorkspaceDatabase(nextDatabase);
}

async function persistProjectState(
  projectId: string,
  database: WorkspaceStateDatabase<PersistedWorkspaceDefinition, PersistedCustomItemDefinition>,
  state: PersistedProjectWorkspaceState<PersistedWorkspaceDefinition, PersistedCustomItemDefinition>,
  action: string,
  entityType: "workspace" | "view" | "node" | "edge" | "artifact",
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  database.projects[projectId] = state;
  await persistDatabase(database);
  await writeWorkspaceSnapshot(projectId, state, action);
  await appendAuditEvent(
    projectId,
    createAuditEvent({
      projectId,
      channel: "workspace.changed",
      action,
      entityType,
      entityId,
      actor: {
        id: "system_local_runtime",
        type: "system",
        label: "local-runtime",
      },
      metadata,
    }),
  );
}

function ensureProjectState(
  database: WorkspaceStateDatabase<PersistedWorkspaceDefinition, PersistedCustomItemDefinition>,
  projectId: string,
) {
  const existing = database.projects[projectId];
  if (existing) return existing;

  const created = {
    projectId,
    definition: createDefaultWorkspaceDefinition(projectId),
    customItems: [],
    updatedAt: nextTimestamp(),
  } satisfies PersistedProjectWorkspaceState<PersistedWorkspaceDefinition, PersistedCustomItemDefinition>;
  database.projects[projectId] = created;
  return created;
}

function getTabById(definition: PersistedWorkspaceDefinition, tabId?: string) {
  return definition.tabs.find((tab) => tab.id === (tabId ?? definition.activeTabId)) ?? definition.tabs[0] ?? null;
}

export async function getProjectWorkspaceState(projectId: string) {
  const database = await loadDatabase();
  const state = database.projects[projectId];
  return state ? clonePersistedState(state) : null;
}

export async function saveProjectWorkspaceState(
  projectId: string,
  input: {
    definition: PersistedWorkspaceDefinition | null;
    customItems: PersistedCustomItemDefinition[];
  },
) {
  const database = await loadDatabase();
  const nextState = {
    projectId,
    definition: input.definition ? cloneValue(input.definition) : null,
    customItems: cloneValue(input.customItems ?? []),
    updatedAt: nextTimestamp(),
  } satisfies PersistedProjectWorkspaceState<PersistedWorkspaceDefinition, PersistedCustomItemDefinition>;

  await persistProjectState(projectId, database, nextState, "workspace_replace_state", "workspace", projectId, {
    customItems: nextState.customItems.length,
    hasDefinition: Boolean(nextState.definition),
  });
  return clonePersistedState(nextState);
}

export async function createWorkspaceViewForProject(
  projectId: string,
  input: { name: string; template?: PersistedWorkspaceViewTemplate },
) {
  const database = await loadDatabase();
  const state = ensureProjectState(database, projectId);
  const definition = state.definition ?? createDefaultWorkspaceDefinition(projectId);
  const createdView = createWorkspaceView(input.name.trim() || "Workspace", input.template ?? "workspace");

  state.definition = {
    ...definition,
    tabs: [...definition.tabs, createdView],
    activeTabId: createdView.id,
    selectedNodeId: null,
  };
  state.updatedAt = nextTimestamp();

  await persistProjectState(projectId, database, state, "workspace_create_view", "view", createdView.id, {
    name: createdView.name,
    template: createdView.template ?? "workspace",
  });
  return { state: clonePersistedState(state), view: cloneValue(createdView) };
}

export async function createSpecialNodeForProject(projectId: string, input: CreateSpecialNodeInput) {
  const database = await loadDatabase();
  const state = ensureProjectState(database, projectId);
  const definition = state.definition ?? createDefaultWorkspaceDefinition(projectId);
  const tab = getTabById(definition, input.tabId);
  if (!tab) throw new Error("Workspace view not found.");

  const item = createCustomItem(projectId, state.customItems, {
    label: input.label,
    description: input.description,
    specialKind: input.kind === "default" ? null : input.kind,
    command: input.command,
  });
  const fallbackPosition = resolveNodePosition(tab);
  const size = SPECIAL_NODE_SIZE[input.kind];
  const node = {
    id: `node_item_${item.id}`,
    binding: {
      kind: "item" as const,
      entityId: item.id,
    },
    x: Math.round(input.x ?? fallbackPosition.x),
    y: Math.round(input.y ?? fallbackPosition.y),
    w: Math.round(input.w ?? size.w),
    h: Math.round(input.h ?? size.h),
    collapsed: true,
  } satisfies PersistedCanvasNode;

  state.customItems = [...state.customItems, item];
  state.definition = {
    ...definition,
    tabs: definition.tabs.map((currentTab) =>
      currentTab.id === tab.id
        ? touchView({
            ...currentTab,
            nodes: [...currentTab.nodes, node],
          })
        : currentTab,
    ),
    activeTabId: tab.id,
    selectedNodeId: node.id,
  };
  state.updatedAt = nextTimestamp();

  await persistProjectState(projectId, database, state, "workspace_create_special_node", "node", node.id, {
    kind: input.kind,
    itemId: item.id,
  });
  return { state: clonePersistedState(state), item: cloneValue(item), node: cloneValue(node) };
}

export async function upsertCustomItemForProject(
  projectId: string,
  itemId: string,
  patch: Partial<PersistedCustomItemDefinition>,
) {
  const database = await loadDatabase();
  const state = ensureProjectState(database, projectId);
  const current = state.customItems.find((entry) => entry.id === itemId || entry.slug === itemId);
  if (!current) throw new Error("Custom item not found.");

  const nextItem = {
    ...current,
    ...cloneValue(patch),
    id: current.id,
    slug: patch.slug ? ensureUniqueSlug(patch.slug, state.customItems, current.id) : current.slug,
    updatedAt: nextTimestamp(),
  } satisfies PersistedCustomItemDefinition;

  state.customItems = state.customItems.map((entry) => (entry.id === current.id ? nextItem : entry));
  state.updatedAt = nextTimestamp();

  await persistProjectState(projectId, database, state, "workspace_update_custom_item", "node", nextItem.id, {
    patchKeys: Object.keys(patch),
  });
  return { state: clonePersistedState(state), item: cloneValue(nextItem) };
}

export async function removeNodeFromProject(
  projectId: string,
  input: { tabId?: string; nodeId: string },
) {
  const database = await loadDatabase();
  const state = ensureProjectState(database, projectId);
  const definition = state.definition ?? createDefaultWorkspaceDefinition(projectId);
  const tab = getTabById(definition, input.tabId);
  if (!tab) throw new Error("Workspace view not found.");

  const removedNode = tab.nodes.find((node) => node.id === input.nodeId);
  if (!removedNode) throw new Error("Node not found.");

  const nextTabs = definition.tabs.map((currentTab) =>
    currentTab.id === tab.id
      ? touchView({
          ...currentTab,
          nodes: currentTab.nodes.filter((node) => node.id !== input.nodeId),
          edges: currentTab.edges.filter((edge) => edge.source !== input.nodeId && edge.target !== input.nodeId),
        })
      : currentTab,
  );

  const itemId = removedNode.binding.kind === "item" ? removedNode.binding.entityId : null;
  const stillReferenced = itemId
    ? nextTabs.some((currentTab) => currentTab.nodes.some((node) => node.binding.kind === "item" && node.binding.entityId === itemId))
    : true;

  if (itemId && !stillReferenced) {
    state.customItems = state.customItems.filter((entry) => entry.id !== itemId && entry.slug !== itemId);
  }

  state.definition = {
    ...definition,
    tabs: nextTabs,
    selectedNodeId: definition.selectedNodeId === input.nodeId ? null : definition.selectedNodeId,
  };
  state.updatedAt = nextTimestamp();

  await persistProjectState(projectId, database, state, "workspace_delete_node", "node", input.nodeId, {
    removedItemId: itemId,
  });
  return clonePersistedState(state);
}

export async function connectNodesInProject(
  projectId: string,
  input: { tabId?: string; sourceNodeId: string; targetNodeId: string; label?: string; kind?: string; type?: string },
) {
  const database = await loadDatabase();
  const state = ensureProjectState(database, projectId);
  const definition = state.definition ?? createDefaultWorkspaceDefinition(projectId);
  const tab = getTabById(definition, input.tabId);
  if (!tab) throw new Error("Workspace view not found.");

  const hasSource = tab.nodes.some((node) => node.id === input.sourceNodeId);
  const hasTarget = tab.nodes.some((node) => node.id === input.targetNodeId);
  if (!hasSource || !hasTarget) throw new Error("Source or target node not found.");

  const edge = {
    id: `edge_${input.sourceNodeId}_${input.targetNodeId}_${randomUUID().slice(0, 6)}`,
    source: input.sourceNodeId,
    target: input.targetNodeId,
    label: input.label?.trim() || "binding",
    kind: input.kind?.trim() || input.type?.trim() || "data",
    type: input.type?.trim() || input.kind?.trim() || "data",
    tone: "neutral",
    custom: true,
    animated: true,
  } satisfies PersistedCanvasEdge;

  state.definition = {
    ...definition,
    tabs: definition.tabs.map((currentTab) =>
      currentTab.id === tab.id
        ? touchView({
            ...currentTab,
            edges: [...currentTab.edges, edge],
          })
        : currentTab,
    ),
  };
  state.updatedAt = nextTimestamp();

  await persistProjectState(projectId, database, state, "workspace_connect_nodes", "edge", edge.id, {
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    type: edge.type,
  });
  return { state: clonePersistedState(state), edge: cloneValue(edge) };
}

export async function disconnectEdgeInProject(
  projectId: string,
  input: { tabId?: string; edgeId: string },
) {
  const database = await loadDatabase();
  const state = ensureProjectState(database, projectId);
  const definition = state.definition ?? createDefaultWorkspaceDefinition(projectId);
  const tab = getTabById(definition, input.tabId);
  if (!tab) throw new Error("Workspace view not found.");

  state.definition = {
    ...definition,
    tabs: definition.tabs.map((currentTab) =>
      currentTab.id === tab.id
        ? touchView({
            ...currentTab,
            edges: currentTab.edges.filter((edge) => edge.id !== input.edgeId),
          })
        : currentTab,
    ),
  };
  state.updatedAt = nextTimestamp();

  await persistProjectState(projectId, database, state, "workspace_disconnect_edge", "edge", input.edgeId);
  return clonePersistedState(state);
}
