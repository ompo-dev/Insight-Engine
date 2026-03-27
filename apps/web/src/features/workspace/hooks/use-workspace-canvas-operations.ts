import type { KeyboardEvent } from "react";
import { resolveTelemetryItem, type CreateCustomTelemetryItemInput, type TelemetryItemDefinition } from "@/lib/telemetry/items";
import type { ProjectSummary } from "@/lib/data/types";
import type { WorkspaceRoleId } from "@/lib/workspace/types";
import { getViewportAnchor, inferNodeSeedFromPrompt } from "@/features/workspace/lib/workspace-page-helpers";

type ToastFn = (input: {
  title: string;
  description: string;
}) => void;

export function useWorkspaceCanvasOperations({
  scopedProjectId,
  activeProject,
  workspaceRoleId,
  activeLayer,
  activeView,
  selectedNode,
  items,
  assistantPrompt,
  setAssistantPrompt,
  setFocusedItemSection,
  setInspectorTab,
  createCustomItem,
  ensureBindingOnCanvas,
  ensureEditableItem,
  focusItemSection,
  handleOpenAlerts,
  specialNodeDimensions,
  toast,
}: {
  scopedProjectId: string;
  activeProject: ProjectSummary | null;
  workspaceRoleId: WorkspaceRoleId;
  activeLayer: "map" | "flows";
  activeView: { id: string; viewport: { x: number; y: number; zoom: number }; nodes: Array<{ id: string; binding: { kind: string; entityId: string } }> } | null;
  selectedNode: { id: string; binding: { kind: string; entityId: string } } | null;
  items: TelemetryItemDefinition[];
  assistantPrompt: string;
  setAssistantPrompt: (value: string) => void;
  setFocusedItemSection: (value: "receive" | "program" | "send" | "transform" | "display" | "action" | null) => void;
  setInspectorTab: (projectId: string, roleId: WorkspaceRoleId, tab: "overview" | "data" | "actions" | "config") => void;
  createCustomItem: (
    projectId: string,
    seed?: CreateCustomTelemetryItemInput,
  ) => { id: string; label: string; specialKind?: string | null };
  ensureBindingOnCanvas: (
    binding: { kind: "item"; entityId: string },
    openInspector?: boolean,
    explicitPosition?: { x: number; y: number } | null,
    explicitSize?: { w: number; h: number } | null,
  ) => { id: string } | null;
  ensureEditableItem: (item: TelemetryItemDefinition) => unknown;
  focusItemSection: (
    nodeId: string,
    section: "receive" | "program" | "send" | "transform" | "display" | "action",
    patch?: Partial<CreateCustomTelemetryItemInput>,
  ) => void;
  handleOpenAlerts: () => void;
  specialNodeDimensions: Record<string, { w: number; h: number }>;
  toast: ToastFn;
}) {
  const createViewportAnchoredNode = (seed?: CreateCustomTelemetryItemInput) => {
    if (!scopedProjectId || !activeView) return null;
    const created = createCustomItem(scopedProjectId, seed);
    const position = getViewportAnchor(activeView.viewport);
    const node = ensureBindingOnCanvas(
      { kind: "item", entityId: created.id },
      true,
      position,
      created.specialKind ? specialNodeDimensions[created.specialKind] ?? null : null,
    );
    setInspectorTab(scopedProjectId, workspaceRoleId, "config");
    return { created, node };
  };

  const handleCreateNodeFromPrompt = () => {
    const prompt = assistantPrompt.trim();
    if (!prompt) return;

    const seed = inferNodeSeedFromPrompt(prompt);
    const result = createViewportAnchoredNode(seed);
    if (!result || !scopedProjectId) return;

    setAssistantPrompt("");
    setFocusedItemSection(seed.actionEnabled ? "send" : seed.inputEnabled ? "receive" : "program");
    toast({
      title: "Node criado no canvas",
      description: `O node "${result.created.label}" foi adicionado ao workspace.`,
    });
  };

  const handleCanvasComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleCreateNodeFromPrompt();
    }
  };

  const handleQuickCreateNode = () => {
    const result = createViewportAnchoredNode();
    if (!result) return;
    setFocusedItemSection("receive");
  };

  const handleOpenProgramming = () => {
    if (selectedNode?.binding.kind === "item") {
      const currentItem = resolveTelemetryItem(items, selectedNode.binding.entityId);
      if (currentItem) {
        ensureEditableItem(currentItem);
        focusItemSection(selectedNode.id, "program");
        return;
      }
    }

    const result = createViewportAnchoredNode({
      label: "Node Programavel",
      description: "Node criado para compor logica, visual e acoes.",
      tags: ["logic", "canvas"],
    });
    if (!result) return;
    setFocusedItemSection("program");
  };

  const handleShareWorkspace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado",
        description: "O link do canvas foi copiado para a area de transferencia.",
      });
    } catch {
      toast({
        title: "Nao foi possivel copiar o link",
        description: "Tente novamente a partir do navegador.",
      });
    }
  };

  const handleExportWorkspace = () => {
    if (!activeView || !activeProject) return;

    const payload = {
      project: {
        id: activeProject.id,
        name: activeProject.name,
        workspace: activeView.id,
      },
      view: activeView,
      customItems: items.filter((item) => item.mode === "custom"),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeProject.slug}-canvas.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Canvas exportado",
      description: "O snapshot estrutural do workspace foi baixado em JSON.",
    });
  };

  const handleRunCanvas = () => {
    if (!scopedProjectId) return;
    if (selectedNode) {
      setInspectorTab(scopedProjectId, workspaceRoleId, "actions");
      return;
    }

    handleOpenAlerts();
    toast({
      title: "Canvas em foco operacional",
      description: "Abrimos insights e alertas para iniciar a leitura do workspace.",
    });
  };

  return {
    createViewportAnchoredNode,
    handleCreateNodeFromPrompt,
    handleCanvasComposerKeyDown,
    handleQuickCreateNode,
    handleOpenProgramming,
    handleShareWorkspace,
    handleExportWorkspace,
    handleRunCanvas,
  };
}
