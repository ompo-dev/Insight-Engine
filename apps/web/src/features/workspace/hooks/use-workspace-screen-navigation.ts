import type { WorkspaceItemEditorSection } from "@/lib/workspace/types";
import { buildWorkspaceHref } from "@/lib/workspace/routes";
import { resolveTelemetryItem, type TelemetryItemDefinition } from "@/lib/telemetry/items";
import type {
  CanvasLayer,
  CanvasNode,
  PluginId,
  WorkspaceRoleId,
  WorkspaceView,
} from "@/lib/workspace/types";

type ToastFn = (input: {
  title: string;
  description: string;
}) => void;

export function useWorkspaceScreenNavigation({
  workspaceRoleId,
  activeLayer,
  activeView,
  activeViews,
  ensureEditableItem,
  ensureBindingOnCanvas,
  scopedProjectId,
  setIsProjectSwitcherOpen,
  setIsWorkspaceSwitcherOpen,
  hasProjectAlternatives,
  hasWorkspaceAlternatives,
  isProjectCreating,
  setIsProjectCreating,
  projectsLength,
  createProject,
  setLocation,
  setIsCommandOpen,
  setActiveView,
  duplicateActiveView,
  restoreRolePreset,
  selectNode,
  setNodeCollapsed,
  setInspectorTab,
  setActiveLayer,
  setFocusedItemSection,
  items,
  toast,
}: {
  workspaceRoleId: WorkspaceRoleId;
  activeLayer: CanvasLayer;
  activeView: WorkspaceView | null;
  activeViews: WorkspaceView[];
  ensureEditableItem: (item: TelemetryItemDefinition) => void;
  ensureBindingOnCanvas: (
    binding: { kind: "plugin"; entityId: PluginId } | { kind: "item"; entityId: string },
    shouldSelect?: boolean,
    explicitPosition?: { x: number; y: number } | null,
    explicitSize?: { w: number; h: number } | null,
  ) => CanvasNode | null;
  scopedProjectId: string;
  setIsProjectSwitcherOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setIsWorkspaceSwitcherOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  hasProjectAlternatives: boolean;
  hasWorkspaceAlternatives: boolean;
  isProjectCreating: boolean;
  setIsProjectCreating: (value: boolean) => void;
  projectsLength: number;
  createProject: (input: { name: string; description?: string }) => Promise<{ id: string; name: string }>;
  setLocation: (location: string) => void;
  setIsCommandOpen: (value: boolean) => void;
  setActiveView: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, viewId: string) => void;
  duplicateActiveView: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, name: string) => void;
  restoreRolePreset: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer) => void;
  selectNode: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, nodeId: string | null) => void;
  setNodeCollapsed: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer, nodeId: string, collapsed: boolean) => void;
  setInspectorTab: (projectId: string, roleId: WorkspaceRoleId, tab: "overview" | "data" | "actions" | "config") => void;
  setActiveLayer: (projectId: string, roleId: WorkspaceRoleId, layer: CanvasLayer) => void;
  setFocusedItemSection: (value: WorkspaceItemEditorSection | null) => void;
  items: TelemetryItemDefinition[];
  toast: ToastFn;
}) {
  const handleCloseInlineSwitchers = () => {
    setIsProjectSwitcherOpen(false);
    setIsWorkspaceSwitcherOpen(false);
  };

  const handleToggleProjectSwitcher = () => {
    if (!hasProjectAlternatives) return;
    setIsWorkspaceSwitcherOpen(false);
    setIsProjectSwitcherOpen((current) => !current);
  };

  const handleToggleWorkspaceSwitcher = () => {
    if (!hasWorkspaceAlternatives) return;
    setIsProjectSwitcherOpen(false);
    setIsWorkspaceSwitcherOpen((current) => !current);
  };

  const handleCreateProject = async () => {
    if (isProjectCreating) return;
    handleCloseInlineSwitchers();
    setIsProjectCreating(true);
    try {
      const created = await createProject({
        name: `Novo projeto ${projectsLength + 1}`,
        description: "Projeto vazio criado a partir do canvas.",
      });
      toast({
        title: "Projeto criado",
        description: `Abrimos ${created.name} no canvas.`,
      });
      setLocation(buildWorkspaceHref(created.id));
    } catch {
      toast({
        title: "Nao foi possivel criar o projeto",
        description: "Tente novamente em alguns instantes.",
      });
    } finally {
      setIsProjectCreating(false);
    }
  };

  const handleSelectProject = (projectId: string) => {
    handleCloseInlineSwitchers();
    setIsCommandOpen(false);
    setLocation(buildWorkspaceHref(projectId));
  };

  const handleSelectWorkspaceView = (viewId: string) => {
    if (!scopedProjectId) return;
    setActiveView(scopedProjectId, workspaceRoleId, activeLayer, viewId);
    handleCloseInlineSwitchers();
  };

  const openNode = (nodeId: string, expandNode: boolean) => {
    if (!scopedProjectId || !activeView) return;
    const node = activeView.nodes.find((entry) => entry.id === nodeId);
    const selectedItem =
      node?.binding.kind === "item" ? resolveTelemetryItem(items, node.binding.entityId) : undefined;

    if (selectedItem) {
      ensureEditableItem(selectedItem);
    }

    selectNode(scopedProjectId, workspaceRoleId, activeLayer, nodeId);

    if (expandNode) {
      setNodeCollapsed(scopedProjectId, workspaceRoleId, activeLayer, nodeId, false);
    }

    handleCloseInlineSwitchers();
    setFocusedItemSection(null);

    if (selectedItem) {
      setInspectorTab(scopedProjectId, workspaceRoleId, "config");
    }
  };

  const handleSelectNode = (nodeId: string) => {
    openNode(nodeId, false);
  };

  const handleOpenNodeFromCommand = (nodeId: string) => {
    openNode(nodeId, true);
  };

  const handleOpenAlerts = () => {
    if (!scopedProjectId) return;
    setInspectorTab(scopedProjectId, workspaceRoleId, "data");
    ensureBindingOnCanvas({ kind: "plugin", entityId: "insights" });
  };

  const handleSwitchLayer = (_layer: CanvasLayer) => {
    if (!scopedProjectId) return;
    setActiveLayer(scopedProjectId, workspaceRoleId, "map");
  };

  const handleCreateWorkspaceTab = () => {
    if (!scopedProjectId || !activeView) return;
    duplicateActiveView(scopedProjectId, workspaceRoleId, activeLayer, `Workspace ${activeViews.length + 1}`);
    setIsWorkspaceSwitcherOpen(false);
  };

  const handleRestorePreset = () => {
    if (!scopedProjectId) return;
    restoreRolePreset(scopedProjectId, workspaceRoleId, activeLayer);
  };

  const handleClearSelection = () => {
    if (!scopedProjectId) return;
    selectNode(scopedProjectId, workspaceRoleId, activeLayer, null);
    setFocusedItemSection(null);
  };

  return {
    handleCloseInlineSwitchers,
    handleToggleProjectSwitcher,
    handleToggleWorkspaceSwitcher,
    handleCreateProject,
    handleSelectProject,
    handleSelectWorkspaceView,
    handleSelectNode,
    handleOpenNodeFromCommand,
    handleOpenAlerts,
    handleSwitchLayer,
    handleCreateWorkspaceTab,
    handleRestorePreset,
    handleClearSelection,
  };
}
