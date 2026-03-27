import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_WORKSPACE_ROLE_ID } from "@/lib/workspace/types";
import type {
  CanvasEdge,
  CanvasLayer,
  CanvasNode,
  CanvasViewport,
  WorkspaceDefinition,
  WorkspaceInspectorTab,
  WorkspaceNodeBinding,
  WorkspaceRoleId,
  WorkspaceView,
} from "@/lib/workspace/types";
import {
  cloneWorkspaceView,
  createCanvasNode,
  createDefaultWorkspaceDefinition,
  createWorkspaceViewPreset,
  resolveBindingEntityId,
  touchWorkspaceView,
} from "@/lib/workspace/presets";

interface WorkspaceStore {
  definitionsByScope: Record<string, WorkspaceDefinition>;
  ensureWorkspace: (projectId: string, roleId: WorkspaceRoleId) => void;
  setActiveLayer: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer) => void;
  setActiveView: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, viewId: string) => void;
  duplicateActiveView: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, name: string) => WorkspaceView | null;
  restoreRolePreset: (projectId: string, roleId: WorkspaceRoleId, layer?: CanvasLayer) => void;
  selectNode: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, nodeId: string | null) => void;
  setNodeCollapsed: (
    projectId: string,
    roleId: WorkspaceRoleId,
    layer: CanvasLayer,
    nodeId: string,
    collapsed: boolean,
  ) => void;
  toggleNodeCollapsed: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, nodeId: string) => void;
  setInspectorTab: (projectId: string, roleId: WorkspaceRoleId, tab: WorkspaceInspectorTab) => void;
  moveNode: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, nodeId: string, x: number, y: number) => void;
  resizeNode: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, nodeId: string, w: number, h: number) => void;
  setViewport: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, viewport: Partial<CanvasViewport>) => void;
  addNode: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, binding: WorkspaceNodeBinding) => CanvasNode | null;
  ensureNode: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, binding: WorkspaceNodeBinding) => CanvasNode | null;
  removeNode: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, nodeId: string) => void;
  connectNodes: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, sourceNodeId: string, targetNodeId: string) => void;
  disconnectEdge: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, edgeId: string) => void;
}

type WorkspacePersistedState = Pick<WorkspaceStore, "definitionsByScope">;

type LegacyCanvasNode = Partial<CanvasNode> & { pluginId?: string };
type LegacyWorkspaceDefinition = WorkspaceDefinition & {
  viewsByLayer?: Record<CanvasLayer, WorkspaceView[]>;
  activeViewIdByLayer?: Record<CanvasLayer, string>;
  selectedNodeIdByLayer?: Record<CanvasLayer, string | null>;
};

function getScopeKey(projectId: string, _roleId: WorkspaceRoleId) {
  return projectId;
}

function withLegacyFields(definition: WorkspaceDefinition): WorkspaceDefinition {
  return {
    ...definition,
    activeLayer: definition.activeLayer ?? "map",
    viewsByLayer: {
      map: definition.tabs,
      flows: [],
    },
    activeViewIdByLayer: {
      map: definition.activeTabId,
      flows: "",
    },
    selectedNodeIdByLayer: {
      map: definition.selectedNodeId,
      flows: null,
    },
  };
}

function getDefinition(projectId: string, roleId: WorkspaceRoleId, definitionsByScope: Record<string, WorkspaceDefinition>) {
  return definitionsByScope[getScopeKey(projectId, roleId)] ?? withLegacyFields(createDefaultWorkspaceDefinition(projectId, roleId));
}

function getActiveView(definition: WorkspaceDefinition) {
  return definition.tabs.find((view) => view.id === definition.activeTabId) ?? definition.tabs[0] ?? null;
}

function mutateActiveView(
  definition: WorkspaceDefinition,
  mutate: (view: WorkspaceView) => WorkspaceView,
): WorkspaceDefinition {
  const activeViewId = definition.activeTabId;
  return withLegacyFields({
    ...definition,
    tabs: definition.tabs.map((view) => (view.id === activeViewId ? mutate(view) : view)),
  });
}

function nextNodePosition(view: WorkspaceView) {
  const column = view.nodes.length % 3;
  const row = Math.floor(view.nodes.length / 3);
  return {
    x: 120 + column * 340,
    y: 80 + row * 240,
  };
}

function clampZoom(zoom: number) {
  return Math.max(0.1, Math.min(9.99, Number(zoom.toFixed(2))));
}

function sanitizeNode(node: LegacyCanvasNode, projectId?: string): CanvasNode | null {
  const rawBinding = node.binding ?? (node.pluginId ? { kind: "plugin" as const, entityId: node.pluginId } : null);
  if (!rawBinding) return null;

  const legacyBinding = rawBinding as { kind: string; entityId: string };
  const binding = legacyBinding.kind === "collection" || legacyBinding.kind === "metric" || legacyBinding.kind === "model" || legacyBinding.kind === "view"
    ? {
        kind: "item" as const,
        entityId: projectId
          ? legacyBinding.entityId.replace(new RegExp(`^${projectId}_${legacyBinding.kind}_`), "")
          : legacyBinding.entityId,
      }
    : rawBinding;

  if (binding.kind === "agent") return null;
  if (binding.kind === "plugin" && binding.entityId === "agents") return null;

  return {
    id: node.id ?? `node_${binding.kind}_${binding.entityId}`,
    binding,
    x: typeof node.x === "number" ? node.x : 120,
    y: typeof node.y === "number" ? node.y : 80,
    w: typeof node.w === "number" ? node.w : 320,
    h: typeof node.h === "number" ? node.h : 184,
    collapsed: typeof node.collapsed === "boolean" ? node.collapsed : true,
  };
}

function sanitizeView(view: WorkspaceView, projectId: string, template?: WorkspaceView["template"]): WorkspaceView {
  return {
    ...view,
    template: view.template ?? template,
    nodes: (view.nodes as LegacyCanvasNode[])
      .map((node) => sanitizeNode(node, projectId))
      .filter((node): node is CanvasNode => Boolean(node)),
    edges: (view.edges ?? []).filter((edge) => edge?.source && edge?.target),
    viewport: {
      x: view.viewport?.x ?? 0,
      y: view.viewport?.y ?? 0,
      zoom: clampZoom(view.viewport?.zoom ?? 1),
    },
  };
}

function sanitizeWorkspaceDefinition(definition: LegacyWorkspaceDefinition): WorkspaceDefinition {
  const explicitTabs = (definition.tabs ?? []).map((tab) => sanitizeView(tab, definition.projectId));
  const migratedTabs = explicitTabs.length
    ? explicitTabs
    : [
        ...(definition.viewsByLayer?.map ?? []).map((view) => sanitizeView(view, definition.projectId, "workspace")),
        ...(definition.viewsByLayer?.flows ?? []).map((view) => sanitizeView(view, definition.projectId, "automation")),
      ];
  const tabs = migratedTabs.length ? migratedTabs : createDefaultWorkspaceDefinition(definition.projectId).tabs;
  const activeTabId = tabs.some((tab) => tab.id === definition.activeTabId)
    ? definition.activeTabId
    : tabs.some((tab) => tab.id === definition.activeViewIdByLayer?.map)
      ? definition.activeViewIdByLayer?.map ?? tabs[0].id
      : tabs[0].id;
  const selectedNodeId = definition.selectedNodeId ?? definition.selectedNodeIdByLayer?.map ?? null;

  return withLegacyFields({
    projectId: definition.projectId,
    roleId: DEFAULT_WORKSPACE_ROLE_ID,
    tabs,
    activeTabId,
    selectedNodeId,
    inspectorTab: ["overview", "data", "actions", "config"].includes(definition.inspectorTab)
      ? definition.inspectorTab
      : "overview",
    activeLayer: "map",
  });
}

function createCustomEdge(sourceNodeId: string, targetNodeId: string): CanvasEdge {
  return {
    id: `edge_${sourceNodeId}_${targetNodeId}_${Math.random().toString(36).slice(2, 8)}`,
    source: sourceNodeId,
    target: targetNodeId,
    label: "binding",
    kind: "data",
    tone: "neutral",
    custom: true,
  };
}

function hasBinding(projectId: string, node: CanvasNode, binding: WorkspaceNodeBinding) {
  return node.binding.kind === binding.kind && node.binding.entityId === resolveBindingEntityId(projectId, binding);
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      definitionsByScope: {},
      ensureWorkspace: (projectId, roleId) => {
        const scopeKey = getScopeKey(projectId, roleId);
        if (get().definitionsByScope[scopeKey]) return;

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: withLegacyFields(createDefaultWorkspaceDefinition(projectId, roleId)),
          },
        }));
      },
      setActiveLayer: (projectId, roleId, layer) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: withLegacyFields({
              ...current,
              activeLayer: layer,
            }),
          },
        }));
      },
      setActiveView: (projectId, roleId, _layer, viewId) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        if (!current.tabs.some((view) => view.id === viewId)) return;
        if (current.activeTabId === viewId) return;

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: withLegacyFields({
              ...current,
              activeTabId: viewId,
              selectedNodeId: null,
            }),
          },
        }));
      },
      duplicateActiveView: (projectId, roleId, _layer, name) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const activeView = getActiveView(current);
        if (!activeView || !name.trim()) return null;

        const duplicated = cloneWorkspaceView(activeView, name.trim());
        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: withLegacyFields({
              ...current,
              tabs: [...current.tabs, duplicated],
              activeTabId: duplicated.id,
              selectedNodeId: null,
            }),
          },
        }));
        return duplicated;
      },
      restoreRolePreset: (projectId, roleId, layer) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const nextTabs = layer === "flows"
          ? [createWorkspaceViewPreset(projectId, roleId, "flows")]
          : [createWorkspaceViewPreset(projectId, roleId, "map")];

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: withLegacyFields({
              projectId,
              roleId,
              tabs: nextTabs,
              activeTabId: nextTabs[0].id,
              selectedNodeId: null,
              inspectorTab: "overview",
              activeLayer: "map",
            }),
          },
        }));
      },
      selectNode: (projectId, roleId, _layer, nodeId) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        if (current.selectedNodeId === nodeId) return;

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: withLegacyFields({
              ...current,
              selectedNodeId: nodeId,
            }),
          },
        }));
      },
      setNodeCollapsed: (projectId, roleId, _layer, nodeId, collapsed) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const nextDefinition = mutateActiveView(current, (view) =>
          touchWorkspaceView({
            ...view,
            nodes: view.nodes.map((node) => (node.id === nodeId ? { ...node, collapsed } : node)),
          }),
        );

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: nextDefinition,
          },
        }));
      },
      toggleNodeCollapsed: (projectId, roleId, layer, nodeId) => {
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const activeView = getActiveView(current);
        const node = activeView?.nodes.find((item) => item.id === nodeId);
        if (!node) return;
        get().setNodeCollapsed(projectId, roleId, layer, nodeId, !node.collapsed);
      },
      setInspectorTab: (projectId, roleId, tab) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        if (current.inspectorTab === tab) return;

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: withLegacyFields({
              ...current,
              inspectorTab: tab,
            }),
          },
        }));
      },
      moveNode: (projectId, roleId, _layer, nodeId, x, y) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const nextDefinition = mutateActiveView(current, (view) =>
          touchWorkspaceView({
            ...view,
            nodes: view.nodes.map((node) => (node.id === nodeId ? { ...node, x, y } : node)),
          }),
        );

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: nextDefinition,
          },
        }));
      },
      resizeNode: (projectId, roleId, _layer, nodeId, w, h) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const nextDefinition = mutateActiveView(current, (view) =>
          touchWorkspaceView({
            ...view,
            nodes: view.nodes.map((node) => (node.id === nodeId ? { ...node, w, h } : node)),
          }),
        );

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: nextDefinition,
          },
        }));
      },
      setViewport: (projectId, roleId, _layer, viewport) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const activeView = getActiveView(current);
        if (!activeView) return;

        const nextViewport = {
          ...activeView.viewport,
          ...viewport,
          zoom: viewport.zoom === undefined ? activeView.viewport.zoom : clampZoom(viewport.zoom),
        };

        const nextDefinition = mutateActiveView(current, (view) =>
          touchWorkspaceView({
            ...view,
            viewport: nextViewport,
          }),
        );

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: nextDefinition,
          },
        }));
      },
      addNode: (projectId, roleId, layer, binding) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const activeView = getActiveView(current);
        if (!activeView) return null;

        const position = nextNodePosition(activeView);
        const node = createCanvasNode(projectId, binding, activeView.nodes.length, layer);
        node.x = position.x;
        node.y = position.y;

        const nextDefinition = mutateActiveView(current, (view) =>
          touchWorkspaceView({
            ...view,
            nodes: [...view.nodes, node],
          }),
        );

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: nextDefinition,
          },
        }));

        return node;
      },
      ensureNode: (projectId, roleId, layer, binding) => {
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const activeView = getActiveView(current);
        const existing = activeView?.nodes.find((node) => hasBinding(projectId, node, binding));
        if (existing) return existing;
        return get().addNode(projectId, roleId, layer, binding);
      },
      removeNode: (projectId, roleId, _layer, nodeId) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const nextDefinition = mutateActiveView(current, (view) => {
          const nodes = view.nodes.filter((node) => node.id !== nodeId);
          const edges = view.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
          return touchWorkspaceView({
            ...view,
            nodes,
            edges,
          });
        });

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: withLegacyFields({
              ...nextDefinition,
              selectedNodeId: nextDefinition.selectedNodeId === nodeId ? null : nextDefinition.selectedNodeId,
            }),
          },
        }));
      },
      connectNodes: (projectId, roleId, _layer, sourceNodeId, targetNodeId) => {
        if (sourceNodeId === targetNodeId) return;
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const activeView = getActiveView(current);
        if (!activeView) return;

        const sourceExists = activeView.nodes.some((node) => node.id === sourceNodeId);
        const targetExists = activeView.nodes.some((node) => node.id === targetNodeId);
        const alreadyExists = activeView.edges.some((edge) => edge.source === sourceNodeId && edge.target === targetNodeId);
        if (!sourceExists || !targetExists || alreadyExists) return;

        const nextDefinition = mutateActiveView(current, (view) =>
          touchWorkspaceView({
            ...view,
            edges: [...view.edges, createCustomEdge(sourceNodeId, targetNodeId)],
          }),
        );

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: nextDefinition,
          },
        }));
      },
      disconnectEdge: (projectId, roleId, _layer, edgeId) => {
        const scopeKey = getScopeKey(projectId, roleId);
        const current = getDefinition(projectId, roleId, get().definitionsByScope);
        const nextDefinition = mutateActiveView(current, (view) =>
          touchWorkspaceView({
            ...view,
            edges: view.edges.filter((edge) => edge.id !== edgeId),
          }),
        );

        set((state) => ({
          definitionsByScope: {
            ...state.definitionsByScope,
            [scopeKey]: nextDefinition,
          },
        }));
      },
    }),
    {
      name: "lynx-workspace-store",
      storage: createJSONStorage(() => localStorage),
      version: 8,
      migrate: (persistedState) => {
        const state = persistedState as WorkspacePersistedState | undefined;
        const definitionsByScope = Object.entries(state?.definitionsByScope ?? {}).reduce<Record<string, WorkspaceDefinition>>(
          (accumulator, [scopeKey, definition]) => {
            const projectId =
              (definition as LegacyWorkspaceDefinition | undefined)?.projectId ??
              scopeKey.split("::")[0] ??
              scopeKey;
            if (!projectId || accumulator[projectId]) return accumulator;
            accumulator[projectId] = sanitizeWorkspaceDefinition({
              ...(definition as LegacyWorkspaceDefinition),
              projectId,
            });
            return accumulator;
          },
          {},
        );

        return { definitionsByScope } satisfies WorkspacePersistedState;
      },
      partialize: (state): WorkspacePersistedState => ({
        definitionsByScope: state.definitionsByScope,
      }),
    },
  ),
);
