import { getTelemetryItemSourceIds, type TelemetryItemDefinition } from "@/lib/telemetry/items";
import { getDefaultNodeSize, pluginManifestMap } from "@/lib/workspace/registry";
import { DEFAULT_WORKSPACE_ROLE_ID } from "@/lib/workspace/types";
import type {
  CanvasEdge,
  CanvasEdgeKind,
  CanvasLayer,
  CanvasNode,
  PluginId,
  WorkspaceDefinition,
  WorkspaceNodeBinding,
  WorkspaceRoleId,
  WorkspaceView,
} from "@/lib/workspace/types";

const now = () => new Date().toISOString();

const workspacePresetBindings: WorkspaceNodeBinding[] = [
  { kind: "plugin", entityId: "analytics" },
  { kind: "plugin", entityId: "revenue" },
  { kind: "plugin", entityId: "engineering" },
  { kind: "plugin", entityId: "observability" },
  { kind: "plugin", entityId: "insights" },
  { kind: "item", entityId: "cart_sessions" },
  { kind: "item", entityId: "lost_sales_table" },
];

const automationPresetBindings: WorkspaceNodeBinding[] = [
  { kind: "plugin", entityId: "analytics" },
  { kind: "plugin", entityId: "experiments" },
  { kind: "plugin", entityId: "feature-flags" },
  { kind: "plugin", entityId: "insights" },
];

const workspacePositions: Array<{ x: number; y: number }> = [
  { x: 80, y: 80 },
  { x: 440, y: 80 },
  { x: 800, y: 80 },
  { x: 1160, y: 80 },
  { x: 260, y: 340 },
  { x: 620, y: 340 },
  { x: 980, y: 340 },
];

const automationPositions: Array<{ x: number; y: number }> = [
  { x: 120, y: 120 },
  { x: 520, y: 80 },
  { x: 900, y: 80 },
  { x: 1320, y: 160 },
  { x: 900, y: 420 },
  { x: 520, y: 420 },
  { x: 120, y: 420 },
];

export function resolveBindingEntityId(_projectId: string, binding: WorkspaceNodeBinding) {
  return binding.entityId;
}

export function createCanvasNode(
  projectId: string,
  binding: WorkspaceNodeBinding,
  index: number,
  layer: CanvasLayer = "map",
): CanvasNode {
  const resolvedBinding = {
    ...binding,
    entityId: resolveBindingEntityId(projectId, binding),
  } satisfies WorkspaceNodeBinding;
  const positions = layer === "flows" ? automationPositions : workspacePositions;
  const point = positions[index] ?? {
    x: 120 + (index % 3) * 360,
    y: 80 + Math.floor(index / 3) * 250,
  };
  const size = getDefaultNodeSize(resolvedBinding);

  return {
    id: `node_${resolvedBinding.kind}_${resolvedBinding.entityId}`,
    binding: resolvedBinding,
    x: point.x,
    y: point.y,
    w: size.w,
    h: size.h,
    collapsed: true,
  };
}

function bindingLookupKey(kind: WorkspaceNodeBinding["kind"], entityId: string) {
  return `${kind}:${entityId}`;
}

function resolveEdgeTone(kind: CanvasEdgeKind): CanvasEdge["tone"] {
  switch (kind) {
    case "display":
      return "positive";
    case "action":
      return "warning";
    case "automation":
      return "accent";
    case "data":
      return "info";
    default:
      return "neutral";
  }
}

function isEdgeDashed(kind: CanvasEdgeKind) {
  return kind === "action" || kind === "automation";
}

function inferItemEdgeKind(
  targetItem: TelemetryItemDefinition,
  sourceItem?: TelemetryItemDefinition,
): CanvasEdgeKind {
  if (targetItem.actionEnabled) return "action";
  if (targetItem.mode === "canvas" || targetItem.displayEnabled) return "display";
  if (targetItem.hasLogic) return "transform";
  if (sourceItem?.acceptsInput || targetItem.acceptsInput) return "data";
  return "context";
}

function inferCustomEdgeKind(
  edge: CanvasEdge,
  sourceNode: CanvasNode,
  targetNode: CanvasNode,
  itemMap: Map<string, TelemetryItemDefinition>,
): CanvasEdgeKind {
  if (edge.kind) return edge.kind;
  if (sourceNode.binding.kind === "plugin" || targetNode.binding.kind === "plugin") return "context";

  const sourceItem = sourceNode.binding.kind === "item" ? itemMap.get(sourceNode.binding.entityId) : undefined;
  const targetItem = targetNode.binding.kind === "item" ? itemMap.get(targetNode.binding.entityId) : undefined;

  if (targetItem) {
    return inferItemEdgeKind(targetItem, sourceItem);
  }

  return "data";
}

export function buildWorkspaceEdges(options: {
  nodes: CanvasNode[];
  layer?: CanvasLayer;
  items: TelemetryItemDefinition[];
  customEdges?: CanvasEdge[];
}): CanvasEdge[] {
  const { nodes, layer, items, customEdges = [] } = options;
  const nodeMap = new Map(nodes.map((node) => [bindingLookupKey(node.binding.kind, node.binding.entityId), node]));
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const canvasNodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges: CanvasEdge[] = [];

  for (const node of nodes) {
    if (node.binding.kind !== "plugin") continue;
    const manifest = pluginManifestMap[node.binding.entityId as PluginId];
    for (const connection of manifest.connections) {
      if (layer && connection.layer && connection.layer !== layer) continue;
      const sourceNode = nodeMap.get(bindingLookupKey("plugin", connection.source));
      const targetNode = nodeMap.get(bindingLookupKey("plugin", connection.target));
      if (!sourceNode || !targetNode) continue;
      const kind = connection.kind ?? (connection.layer === "flows" ? "automation" : "context");
      edges.push({
        id: `${connection.source}_${connection.target}_${connection.layer ?? "workspace"}`,
        source: sourceNode.id,
        target: targetNode.id,
        label: connection.label,
        kind,
        tone: resolveEdgeTone(kind),
        dashed: isEdgeDashed(kind),
        animated: true,
      });
    }
  }

  for (const item of items) {
    const targetNode = nodeMap.get(bindingLookupKey("item", item.id));
    if (!targetNode) continue;

    getTelemetryItemSourceIds(item).forEach((sourceItemId, index) => {
      const sourceItem = itemMap.get(sourceItemId);
      const sourceNode = nodeMap.get(bindingLookupKey("item", sourceItemId));
      if (!sourceItem || !sourceNode) return;
      if (sourceNode.id === targetNode.id) return;
      const kind = inferItemEdgeKind(item, sourceItem);
      edges.push({
        id: `${sourceNode.id}_${targetNode.id}_${index}`,
        source: sourceNode.id,
        target: targetNode.id,
        label: item.mode === "canvas" ? item.presentation ?? "canvas" : sourceItem.mode === "capture" ? "entrada" : "derivacao",
        kind,
        tone: resolveEdgeTone(kind),
        dashed: isEdgeDashed(kind),
        animated: true,
      });
    });
  }

  const validNodeIds = new Set(nodes.map((node) => node.id));
  const normalizedCustomEdges = customEdges
    .filter((edge) => edge.custom && validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
    .reduce<CanvasEdge[]>((accumulator, edge) => {
      const sourceNode = canvasNodeMap.get(edge.source);
      const targetNode = canvasNodeMap.get(edge.target);
      if (!sourceNode || !targetNode) return accumulator;
      const kind = inferCustomEdgeKind(edge, sourceNode, targetNode, itemMap);
      accumulator.push({
        ...edge,
        label: edge.label?.trim() || "binding",
        kind,
        tone: edge.tone ?? resolveEdgeTone(kind),
        dashed: edge.dashed ?? isEdgeDashed(kind),
        animated: edge.animated ?? true,
      });
      return accumulator;
    }, []);

  return [...edges, ...normalizedCustomEdges];
}

export function createWorkspaceViewPreset(
  projectId: string,
  roleId: WorkspaceRoleId,
  layer: CanvasLayer = "map",
): WorkspaceView {
  const createdAt = now();
  const presetBindings = layer === "flows" ? automationPresetBindings : workspacePresetBindings;
  const nodes = presetBindings.map((binding, index) => createCanvasNode(projectId, binding, index, layer));

  return {
    id: `workspace_${projectId}_${roleId}_${layer}_${Math.random().toString(36).slice(2, 8)}`,
    name: layer === "flows" ? "Automation" : "Workspace 1",
    roleId,
    source: "preset",
    template: layer === "flows" ? "automation" : "workspace",
    nodes,
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt,
    updatedAt: createdAt,
  };
}

export function createDefaultWorkspaceDefinition(
  projectId: string,
  roleId: WorkspaceRoleId = DEFAULT_WORKSPACE_ROLE_ID,
): WorkspaceDefinition {
  const workspaceTab = createWorkspaceViewPreset(projectId, roleId, "map");

  return {
    projectId,
    roleId,
    tabs: [workspaceTab],
    activeTabId: workspaceTab.id,
    selectedNodeId: null,
    inspectorTab: "overview",
    activeLayer: "map",
  };
}

export function cloneWorkspaceView(view: WorkspaceView, name: string): WorkspaceView {
  const timestamp = now();
  return {
    ...view,
    id: `${view.id}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    source: "custom",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function touchWorkspaceView(view: WorkspaceView): WorkspaceView {
  return {
    ...view,
    updatedAt: now(),
  };
}

export function getRolePresetBindings(_roleId: WorkspaceRoleId, layer: CanvasLayer = "map"): WorkspaceNodeBinding[] {
  return layer === "flows" ? automationPresetBindings : workspacePresetBindings;
}

export function getBindingLabel(binding: WorkspaceNodeBinding) {
  return binding.entityId;
}
