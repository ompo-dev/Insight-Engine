export type WorkspaceNodeBindingKind = "plugin" | "item";
export type WorkspaceEdgeType = "visual" | "data" | "trigger" | "control" | "dependency";
export type WorkspaceNodeFamily =
  | "terminal"
  | "ai"
  | "markdown-report"
  | "file-manager"
  | "file-viewer"
  | "browser"
  | "dataset-query"
  | "http-webhook"
  | "workflow-router"
  | "custom-plugin";
export type WorkspaceExecutionStatus = "idle" | "running" | "success" | "error" | "cancelled";
export type TerminalSessionShell = "bash" | "zsh" | "powershell" | "cmd";
export type TerminalSessionStatus = "idle" | "running" | "error" | "exited";
export type TerminalSignal = "SIGINT" | "SIGTERM" | "EOF";
export type StreamChannel =
  | "terminal.output"
  | "node.updated"
  | "run.started"
  | "run.finished"
  | "artifact.created"
  | "workspace.changed";

export interface WorkspaceNodeBinding {
  kind: WorkspaceNodeBindingKind;
  entityId: string;
}

export interface WorkspaceViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkspaceCanvasNode {
  id: string;
  binding: WorkspaceNodeBinding;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
}

export interface WorkspaceCanvasEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: WorkspaceEdgeType;
  tone?: string;
  dashed?: boolean;
  animated?: boolean;
  custom?: boolean;
}

export interface WorkspaceView {
  id: string;
  name: string;
  source: "preset" | "custom";
  template?: "workspace" | "automation";
  nodes: WorkspaceCanvasNode[];
  edges: WorkspaceCanvasEdge[];
  viewport: WorkspaceViewport;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceGraph {
  projectId: string;
  tabs: WorkspaceView[];
  activeTabId: string;
  selectedNodeId: string | null;
  inspectorTab: "overview" | "data" | "actions" | "config";
  activeLayer: "map" | "flows";
}

export interface WorkspaceNodeDefinition {
  type: string;
  family: WorkspaceNodeFamily;
  label: string;
  description: string;
  capabilities: string[];
  configSchema: Record<string, unknown>;
  defaultState: Record<string, unknown>;
  renderer: "card" | "surface" | "terminal";
  executor: "none" | "local" | "agent" | "browser";
  mcpActions: string[];
}

export interface WorkspaceNodeExecutionRun {
  id: string;
  projectId: string;
  nodeId: string;
  status: WorkspaceExecutionStatus;
  trigger: "manual" | "agent" | "terminal" | "automation";
  startedAt: string;
  finishedAt?: string | null;
  latencyMs?: number | null;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string | null;
}

export interface AuditActor {
  id: string;
  type: "user" | "agent" | "system";
  label: string;
}

export interface AuditEvent {
  id: string;
  projectId: string;
  channel: StreamChannel | "audit";
  action: string;
  entityType: "workspace" | "view" | "node" | "edge" | "terminal" | "artifact" | "system";
  entityId: string;
  actor: AuditActor;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ArtifactRecord {
  id: string;
  projectId: string;
  kind: "markdown" | "html" | "json" | "text" | "log";
  title: string;
  relativePath: string;
  mimeType: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface TerminalSessionSnapshot {
  id: string;
  projectId: string;
  shell: TerminalSessionShell;
  workingDirectory: string;
  status: TerminalSessionStatus;
  output: string;
  createdAt: string;
  updatedAt: string;
  exitCode: number | null;
  cols: number;
  rows: number;
}

export interface TerminalOutputEvent {
  sessionId: string;
  projectId: string;
  channel: "terminal.output";
  chunk: string;
  output: string;
  status: TerminalSessionStatus;
  createdAt: string;
}

export interface LocalRuntimeConfig {
  projectRoot?: string;
  storageDriver: "json-file" | "sqlite";
  shellAccess: "full";
  publicWorkspace: true;
}

export const DEFAULT_STREAM_CHANNELS: StreamChannel[] = [
  "terminal.output",
  "node.updated",
  "run.started",
  "run.finished",
  "artifact.created",
  "workspace.changed",
];

export function nowIso() {
  return new Date().toISOString();
}

export function createAuditEvent(input: Omit<AuditEvent, "id" | "createdAt">): AuditEvent {
  return {
    id: `audit_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: nowIso(),
    ...input,
  };
}
