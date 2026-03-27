import type { LucideIcon } from "lucide-react";
import type { SpecialTelemetryNodeKind } from "@/lib/telemetry/items";

export const DEFAULT_WORKSPACE_ROLE_ID = "workspace";
export type WorkspaceRoleId = typeof DEFAULT_WORKSPACE_ROLE_ID;
export type CanvasLayer = "map" | "flows";
export type WorkspaceInspectorTab = "overview" | "data" | "actions" | "config";
export type WorkspaceItemEditorSection =
  | "receive"
  | "program"
  | "send"
  | "transform"
  | "display"
  | "action";

export type PluginId =
  | "analytics"
  | "funnels"
  | "experiments"
  | "feature-flags"
  | "revenue"
  | "engineering"
  | "observability"
  | "insights";

export type WorkspaceNodeKind = "plugin" | "item" | "agent";
export type WorkspaceCatalogCategory = "builders" | "templates" | "items";
export type WorkspaceNodeStatus = "healthy" | "attention" | "inactive" | "draft";

export interface WorkspaceNodeMetric {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
}

export interface WorkspaceNodePresentation {
  icon: LucideIcon;
  accentClassName: string;
  status: WorkspaceNodeStatus;
  badgeLabel?: string | null;
  kindLabel: string;
  categoryLabel: string;
  title: string;
  subtitle?: string | null;
  headline: string;
  summary: string;
  metrics: WorkspaceNodeMetric[];
  tags: string[];
  capabilities?: string[];
  formula?: string | null;
  signal?: string | null;
  displayVariant?:
    | "card"
    | "chart"
    | "table"
    | "comparison"
    | "text"
    | "terminal"
    | "markdown"
    | "ai"
    | "file-manager"
    | "file-viewer"
    | "browser";
  specialNodeKind?: SpecialTelemetryNodeKind | null;
  displaySurfaceOnly?: boolean;
  chartPoints?: Array<{ label: string; value: number }>;
  tablePreview?: {
    columns: string[];
    rows: string[][];
    sheetNames?: string[];
    activeSheet?: string | null;
  };
  terminalPreview?: {
    shell: string;
    command: string;
    workingDirectory: string;
    lines: string[];
    streamOutput: boolean;
    sessionStatus?: "disconnected" | "idle" | "running" | "error" | "exited";
    lastExitCode?: number | null;
  };
  markdownPreview?: {
    body: string;
    template: string;
    autoPreview: boolean;
  };
  aiPreview?: {
    provider: string;
    model: string;
    autoRun: boolean;
    response: string;
    systemPrompt: string;
  };
  fileManagerPreview?: {
    assetIds: string[];
    selectedAssetId?: string | null;
    sortBy: "recent" | "name" | "size";
    filter: string;
    viewMode: "list" | "grid";
  };
  fileViewerPreview?: {
    assetId?: string | null;
    viewerType: "document" | "image" | "table" | "text";
    previewState: "ready" | "processing" | "error" | "missing";
    activeSheet?: string | null;
    currentPage?: number;
  };
  browserPreview?: {
    url: string;
    history: string[];
    historyIndex: number;
    title: string;
    loading: boolean;
    lastHtmlText: string;
    lastError?: string | null;
  };
  textPreview?: {
    eyebrow?: string;
    body: string;
    footer?: string;
  };
}

export interface WorkspaceNodeAction {
  id: string;
  label: string;
  description?: string;
  kind: "primary" | "secondary" | "danger";
}

export interface WorkspaceNodeBinding {
  kind: WorkspaceNodeKind;
  entityId: string;
}

export type CanvasDataBinding = WorkspaceNodeBinding;

export interface WorkspaceCatalogItem {
  id: string;
  kind: WorkspaceNodeKind | "builder";
  category: WorkspaceCatalogCategory;
  label: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
  tags: string[];
  defaultSize: { w: number; h: number };
  binding?: WorkspaceNodeBinding;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasNode {
  id: string;
  binding: WorkspaceNodeBinding;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
}

export type CanvasEdgeTone = "neutral" | "positive" | "warning" | "accent" | "info";
export type CanvasEdgeKind =
  | "visual"
  | "data"
  | "trigger"
  | "control"
  | "dependency"
  | "transform"
  | "display"
  | "action"
  | "context"
  | "automation";

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  tone?: CanvasEdgeTone;
  kind?: CanvasEdgeKind;
  dashed?: boolean;
  custom?: boolean;
  animated?: boolean;
}

export interface WorkspaceTab {
  id: string;
  name: string;
  roleId: WorkspaceRoleId;
  source: "preset" | "custom";
  template?: "workspace" | "automation";
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: CanvasViewport;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceView = WorkspaceTab;
export type WorkspacePreset = WorkspaceTab;

export interface WorkspaceDefinition {
  projectId: string;
  roleId: WorkspaceRoleId;
  tabs: WorkspaceTab[];
  activeTabId: string;
  selectedNodeId: string | null;
  inspectorTab: WorkspaceInspectorTab;
  activeLayer?: CanvasLayer;
  viewsByLayer?: Record<CanvasLayer, WorkspaceView[]>;
  activeViewIdByLayer?: Record<CanvasLayer, string>;
  selectedNodeIdByLayer?: Record<CanvasLayer, string | null>;
}
