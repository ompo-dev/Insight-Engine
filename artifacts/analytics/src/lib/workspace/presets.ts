import { defaultTeamPersonaId } from "@/lib/personas/team-personas";
import { getDefaultNodeSize, pluginManifestMap } from "@/lib/workspace/registry";
import { getTelemetryItemSourceIds, type TelemetryItemDefinition } from "@/lib/telemetry/items";
import type {
  CanvasEdge,
  CanvasEdgeKind,
  CanvasLayer,
  CanvasNode,
  PluginId,
  WorkspaceDefinition,
  WorkspaceNodeBinding,
  WorkspaceRoleId,
  WorkspaceTab,
  WorkspaceView,
} from "@/lib/workspace/types";

const now = () => new Date().toISOString();

const item = (entityId: string): WorkspaceNodeBinding => ({ kind: "item", entityId });

const workspacePresetBindings: Record<WorkspaceRoleId, WorkspaceNodeBinding[]> = {
  executive: [
    { kind: "plugin", entityId: "revenue" },
    item("potential_mrr_if_recovered"),
    item("lost_sales_stat"),
    { kind: "plugin", entityId: "engineering" },
    { kind: "plugin", entityId: "insights" },
    item("lost_sales_queue"),
  ],
  finance: [
    { kind: "plugin", entityId: "revenue" },
    item("abandoned_cart_value"),
    item("potential_mrr_if_recovered"),
    item("lost_sales_stat"),
    item("cart_sessions"),
    { kind: "plugin", entityId: "insights" },
  ],
  marketing: [
    { kind: "plugin", entityId: "analytics" },
    item("cart_sessions"),
    item("abandoned_cart_value"),
    item("lost_sales_queue"),
    item("lost_sales_table"),
    { kind: "plugin", entityId: "experiments" },
  ],
  product: [
    { kind: "plugin", entityId: "analytics" },
    { kind: "plugin", entityId: "funnels" },
    item("cart_sessions"),
    item("abandoned_cart_value"),
    { kind: "plugin", entityId: "feature-flags" },
    item("lost_sales_table"),
  ],
  design: [
    { kind: "plugin", entityId: "analytics" },
    { kind: "plugin", entityId: "funnels" },
    { kind: "plugin", entityId: "experiments" },
    item("cart_sessions"),
    item("abandoned_cart_value"),
    { kind: "plugin", entityId: "insights" },
  ],
  engineering: [
    { kind: "plugin", entityId: "engineering" },
    { kind: "plugin", entityId: "observability" },
    item("support_tickets"),
    item("lost_sales_queue"),
    { kind: "plugin", entityId: "feature-flags" },
    { kind: "plugin", entityId: "agents" },
  ],
  "customer-success": [
    { kind: "plugin", entityId: "revenue" },
    item("support_tickets"),
    item("cart_sessions"),
    item("lost_sales_table"),
    { kind: "plugin", entityId: "insights" },
    { kind: "plugin", entityId: "agents" },
  ],
  operations: [
    { kind: "plugin", entityId: "observability" },
    { kind: "plugin", entityId: "engineering" },
    item("support_tickets"),
    item("lost_sales_table"),
    { kind: "plugin", entityId: "insights" },
    { kind: "plugin", entityId: "agents" },
  ],
};

const automationPresetBindings: Record<WorkspaceRoleId, WorkspaceNodeBinding[]> = {
  executive: [
    { kind: "plugin", entityId: "agents" },
    { kind: "plugin", entityId: "revenue" },
    item("potential_mrr_if_recovered"),
    { kind: "plugin", entityId: "insights" },
  ],
  finance: [
    { kind: "plugin", entityId: "agents" },
    { kind: "plugin", entityId: "revenue" },
    item("abandoned_cart_value"),
    item("lost_sales_stat"),
  ],
  marketing: [
    { kind: "plugin", entityId: "agents" },
    { kind: "plugin", entityId: "analytics" },
    item("cart_sessions"),
    { kind: "plugin", entityId: "experiments" },
  ],
  product: [
    { kind: "plugin", entityId: "agents" },
    { kind: "plugin", entityId: "analytics" },
    { kind: "plugin", entityId: "funnels" },
    { kind: "plugin", entityId: "feature-flags" },
  ],
  design: [
    { kind: "plugin", entityId: "agents" },
    { kind: "plugin", entityId: "analytics" },
    { kind: "plugin", entityId: "experiments" },
    item("cart_sessions"),
  ],
  engineering: [
    { kind: "plugin", entityId: "agents" },
    { kind: "plugin", entityId: "engineering" },
    { kind: "plugin", entityId: "observability" },
    item("support_tickets"),
  ],
  "customer-success": [
    { kind: "plugin", entityId: "agents" },
    { kind: "plugin", entityId: "revenue" },
    item("support_tickets"),
    item("lost_sales_queue"),
  ],
  operations: [
    { kind: "plugin", entityId: "agents" },
    { kind: "plugin", entityId: "observability" },
    { kind: "plugin", entityId: "engineering" },
    item("support_tickets"),
  ],
};

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
  if (targetNode.binding.kind === "agent" || targetNode.binding.entityId === "agents") return "automation";
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
  const presetBindings = layer === "flows" ? automationPresetBindings[roleId] : workspacePresetBindings[roleId];
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
  roleId: WorkspaceRoleId = defaultTeamPersonaId,
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

export function getRolePresetBindings(roleId: WorkspaceRoleId, layer: CanvasLayer = "map"): WorkspaceNodeBinding[] {
  return layer === "flows" ? automationPresetBindings[roleId] : workspacePresetBindings[roleId];
}

export function getBindingLabel(binding: WorkspaceNodeBinding) {
  return binding.entityId;
}


