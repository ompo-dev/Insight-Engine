import { useEffect, useMemo, useRef, useState, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { gsap } from "gsap";
import { useLocation, useParams, useSearch } from "wouter";
import {
  Bot,
  ChevronDown,
  CircleHelp,
  Cloud,
  Download,
  FolderKanban,
  Hand,
  Image,
  Menu,
  Monitor,
  MousePointer2,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Play,
  Plus,
  Share2,
  Sparkles,
  Star,
  User2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PluginCatalogDialog } from "@/components/workspace/PluginCatalogDialog";
import { WorkspaceCanvas } from "@/components/workspace/WorkspaceCanvas";
import { WorkspaceCommandMenu } from "@/components/workspace/WorkspaceCommandMenu";
import { WorkspaceInlineSwitcher } from "@/components/workspace/WorkspaceInlineSwitcher";
import { WorkspaceNodeChatPanel } from "@/components/workspace/WorkspaceNodeChatPanel";
import { WorkspaceNodeDock } from "@/components/workspace/WorkspaceNodeDock";
import { apiClient } from "@/lib/http/axios";
import { teamPersonaMap, type TeamPersonaId } from "@/lib/personas/team-personas";
import type { TelemetrySchemaField } from "@/lib/telemetry/types";
import {
  getTelemetryItemSourceIds,
  resolveTelemetryItem,
  type CreateCustomTelemetryItemInput,
  type SpecialTelemetryNodeKind,
  type TelemetryItemDefinition,
} from "@/lib/telemetry/items";
import { buildWorkspaceCatalog } from "@/lib/workspace/registry";
import { getBindingKey, getWorkspaceNodePresentation } from "@/lib/workspace/presenters";
import { buildWorkspaceEdges } from "@/lib/workspace/presets";
import { buildWorkspaceHref } from "@/lib/workspace/routes";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasLayer,
  PluginId,
  WorkspaceCatalogItem,
  WorkspaceInspectorTab,
  WorkspaceItemEditorSection,
  WorkspaceNodeBinding,
  WorkspaceNodePresentation,
} from "@/lib/workspace/types";
import { useWorkspaceData } from "@/lib/workspace/use-workspace-data";
import { useToast } from "@/hooks/use-toast";
import { useProjectStore } from "@/store/use-project-store";
import { useProjectsStore } from "@/store/use-projects-store";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useCustomItemStore } from "@/store/use-custom-item-store";
import { cn } from "@/lib/utils";

const INSPECTOR_TABS: WorkspaceInspectorTab[] = ["overview", "data", "actions", "config"];
const PERSONA_IDS = Object.keys(teamPersonaMap) as TeamPersonaId[];
const SPECIAL_NODE_DIMENSIONS: Record<SpecialTelemetryNodeKind, { w: number; h: number }> = {
  terminal: { w: 520, h: 320 },
  markdown: { w: 520, h: 344 },
  ai: { w: 420, h: 272 },
};

function isCanvasLayer(value: string | null): value is CanvasLayer {
  return value === "map" || value === "flows";
}

function isPluginId(value: string | null): value is PluginId {
  return (
    value === "analytics" ||
    value === "funnels" ||
    value === "experiments" ||
    value === "feature-flags" ||
    value === "revenue" ||
    value === "engineering" ||
    value === "observability" ||
    value === "insights" ||
    value === "agents"
  );
}

function isInspectorTab(value: string | null): value is WorkspaceInspectorTab {
  return value !== null && INSPECTOR_TABS.includes(value as WorkspaceInspectorTab);
}

export default function Workspace() {
  const { projectId: routeProjectId = "" } = useParams<{ projectId: string }>();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const viewportStateRef = useRef({ x: 0, y: 0, zoom: 1 });
  const viewportTweenRef = useRef<gsap.core.Tween | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [focusedItemSection, setFocusedItemSection] = useState<WorkspaceItemEditorSection | null>(null);
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);
  const [isNodeDockOpen, setIsNodeDockOpen] = useState(false);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [canvasInteractionMode, setCanvasInteractionMode] = useState<"select" | "pan">("select");
  const [isProjectMetaEditing, setIsProjectMetaEditing] = useState(false);
  const [isProjectMetaSaving, setIsProjectMetaSaving] = useState(false);
  const [isProjectCreating, setIsProjectCreating] = useState(false);
  const [projectDraftName, setProjectDraftName] = useState("");
  const [projectDraftDescription, setProjectDraftDescription] = useState("");
  const { toast } = useToast();

  const {
    defaultTeamPersonaId,
    teamPersonaByProject,
    setSelectedProjectId,
    setDefaultTeamPersonaId,
    setProjectTeamPersona,
  } = useProjectStore();

  const data = useWorkspaceData(routeProjectId);
  const projects = data.projectsQuery.data ?? [];
  const activeProject =
    projects.find((project) => project.id === routeProjectId || project.slug === routeProjectId) ?? null;
  const scopedProjectId = activeProject?.id ?? routeProjectId;
  const personaScopeId = scopedProjectId || null;
  const activePersonaId =
    (personaScopeId ? teamPersonaByProject[personaScopeId] : undefined) ?? defaultTeamPersonaId;
  const activePersona = teamPersonaMap[activePersonaId];
  const scopeKey = scopedProjectId ? `${scopedProjectId}::${activePersonaId}` : "";

  const definition = useWorkspaceStore((state) => (scopeKey ? state.definitionsByScope[scopeKey] : undefined));
  const ensureWorkspace = useWorkspaceStore((state) => state.ensureWorkspace);
  const setActiveLayer = useWorkspaceStore((state) => state.setActiveLayer);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const duplicateActiveView = useWorkspaceStore((state) => state.duplicateActiveView);
  const restoreRolePreset = useWorkspaceStore((state) => state.restoreRolePreset);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const setNodeCollapsed = useWorkspaceStore((state) => state.setNodeCollapsed);
  const setInspectorTab = useWorkspaceStore((state) => state.setInspectorTab);
  const moveNode = useWorkspaceStore((state) => state.moveNode);
  const resizeNode = useWorkspaceStore((state) => state.resizeNode);
  const setViewport = useWorkspaceStore((state) => state.setViewport);
  const ensureNode = useWorkspaceStore((state) => state.ensureNode);
  const removeNode = useWorkspaceStore((state) => state.removeNode);
  const connectNodes = useWorkspaceStore((state) => state.connectNodes);
  const createProject = useProjectsStore((state) => state.createProject);
  const updateProject = useProjectsStore((state) => state.updateProject);

  const createCustomItem = useCustomItemStore((state) => state.createItem);
  const updateCustomItem = useCustomItemStore((state) => state.updateItem);
  const storedCustomItems = useCustomItemStore((state) =>
    scopedProjectId ? (state.itemsByProject[scopedProjectId] ?? []) : [],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.uiTheme = "repo";
    root.classList.add("dark");
  }, []);

  useEffect(() => {
    if (activeProject?.id) {
      setSelectedProjectId(activeProject.id);
    }
  }, [activeProject?.id, setSelectedProjectId]);

  useEffect(() => {
    if (!scopedProjectId) return;
    ensureWorkspace(scopedProjectId, activePersonaId);
  }, [activePersonaId, ensureWorkspace, scopedProjectId]);

  const activeLayer: CanvasLayer = "map";
  const activeViews = definition?.tabs ?? [];
  const activeViewId = definition?.activeTabId ?? "";
  const activeView = activeViews.find((view) => view.id === activeViewId) ?? activeViews[0] ?? null;
  const selectedNodeId = definition?.selectedNodeId ?? null;
  const selectedNode = activeView?.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const hasProjectAlternatives = projects.length > 1;
  const hasWorkspaceAlternatives = activeViews.length > 1;
  const projectSubtitle = activeProject?.description?.trim() || activeProject?.slug || "Projeto no canvas";

  useEffect(() => {
    if (!activeView) return;
    viewportStateRef.current = { ...activeView.viewport };
  }, [activeView?.id, activeView?.viewport.x, activeView?.viewport.y, activeView?.viewport.zoom]);

  useEffect(() => {
    setProjectDraftName(activeProject?.name ?? "");
    setProjectDraftDescription(activeProject?.description ?? "");
    setIsProjectMetaEditing(false);
  }, [activeProject?.id, activeProject?.name, activeProject?.description]);

  useEffect(() => {
    if (!isProjectMetaEditing) return;
    const frame = window.requestAnimationFrame(() => {
      projectNameInputRef.current?.focus();
      projectNameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isProjectMetaEditing]);

  const items = data.items;
  const itemsById = useMemo(() => Object.fromEntries(items.map((item) => [item.id, item])), [items]);

  useEffect(() => {
    if (!scopedProjectId || !definition) return;

    const searchParams = new URLSearchParams(search);
    const nextPlugin = searchParams.get("plugin");
    const nextTab = searchParams.get("tab");

    if (definition.activeLayer !== "map") {
      setActiveLayer(scopedProjectId, activePersonaId, "map");
    }

    if (isInspectorTab(nextTab) && nextTab !== definition.inspectorTab) {
      setInspectorTab(scopedProjectId, activePersonaId, nextTab);
    }

    if (isPluginId(nextPlugin)) {
      const ensured = ensureNode(scopedProjectId, activePersonaId, "map", {
        kind: "plugin",
        entityId: nextPlugin,
      });
      if (ensured) {
        selectNode(scopedProjectId, activePersonaId, "map", ensured.id);
        setNodeCollapsed(scopedProjectId, activePersonaId, "map", ensured.id, false);
      }
      if (window.matchMedia("(max-width: 1279px)").matches) {
        setIsMobileInspectorOpen(true);
      }
    }
  }, [
    activePersonaId,
    definition,
    ensureNode,
    scopedProjectId,
    search,
    selectNode,
    setActiveLayer,
    setInspectorTab,
    setNodeCollapsed,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setConnectingNodeId(null);
  }, [activeLayer, activeViewId, scopedProjectId]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 1279px)").matches) return;
    if (!selectedNodeId) {
      setIsNodeDockOpen(false);
      return;
    }
    setIsNodeDockOpen(true);
  }, [selectedNodeId]);

  const catalogItems = useMemo(
    () => buildWorkspaceCatalog({ roleId: activePersonaId, items }),
    [activePersonaId, items],
  );

  const catalogPresentationByBindingKey = useMemo(() => {
    const entries = catalogItems
      .filter((item) => item.binding)
      .map((item) => [
        getBindingKey(item.binding!),
        getWorkspaceNodePresentation(item.binding!, scopedProjectId, activePersonaId, data),
      ]);

    return Object.fromEntries(entries) as Record<string, WorkspaceNodePresentation>;
  }, [activePersonaId, catalogItems, data, scopedProjectId]);

  const presentationsByNodeId = useMemo(() => {
    const entries = (activeView?.nodes ?? []).map((node) => [
      node.id,
      getWorkspaceNodePresentation(node.binding, scopedProjectId, activePersonaId, data),
    ]);

    return Object.fromEntries(entries) as Record<string, WorkspaceNodePresentation>;
  }, [activePersonaId, activeView?.nodes, data, scopedProjectId]);

  const canvasEdges = useMemo(() => {
    if (!activeView) return [];
    return buildWorkspaceEdges({
      nodes: activeView.nodes,
      layer: activeLayer,
      items,
      customEdges: activeView.edges,
    });
  }, [activeLayer, activeView, items]);

  const selectedPresentation = selectedNode ? presentationsByNodeId[selectedNode.id] ?? null : null;
  const selectedItem = selectedNode?.binding.kind === "item"
    ? resolveTelemetryItem(items, selectedNode.binding.entityId)
    : undefined;
  const referenceItems = useMemo(
    () =>
      buildNodeReferenceItems({
        node: selectedNode,
        items,
        nodes: activeView?.nodes ?? [],
        edges: canvasEdges,
      }),
    [activeView?.nodes, canvasEdges, items, selectedNode],
  );

  useEffect(() => {
    if (!scopedProjectId || selectedNode?.binding.kind !== "item" || !selectedItem) return;
    if (selectedItem.mode === "custom") return;

    const existingShadow = storedCustomItems.find(
      (candidate) => candidate.id === selectedItem.id || candidate.slug === selectedItem.slug,
    );
    if (existingShadow) return;

    createCustomItem(scopedProjectId, buildEditableItemSeed(selectedItem));
  }, [
    createCustomItem,
    scopedProjectId,
    selectedItem,
    selectedNode?.binding.kind,
    storedCustomItems,
  ]);

  useEffect(() => {
    if (!scopedProjectId || !selectedNode || window.matchMedia("(max-width: 1279px)").matches) {
      return;
    }

    const targetZoom = clampCanvasZoom(
      selectedPresentation?.displayVariant === "table"
        ? 0.8
        : selectedPresentation?.displayVariant === "terminal" ||
            selectedPresentation?.displayVariant === "markdown"
          ? 0.78
          : selectedPresentation?.displayVariant === "ai"
            ? 0.9
        : selectedPresentation?.displayVariant === "chart"
          ? 0.88
          : 1.04,
    );
    const targetX = window.innerWidth * 0.5 - (selectedNode.x + selectedNode.w / 2) * targetZoom;
    const targetY = window.innerHeight * 0.28 - (selectedNode.y + selectedNode.h / 2) * targetZoom;
    const tweenState = { ...viewportStateRef.current };

    viewportTweenRef.current?.kill();
    viewportTweenRef.current = gsap.to(tweenState, {
      x: targetX,
      y: targetY,
      zoom: targetZoom,
      duration: 0.62,
      ease: "power3.out",
      onUpdate: () => {
        viewportStateRef.current = { ...tweenState };
        setViewport(scopedProjectId, activePersonaId, activeLayer, {
          x: tweenState.x,
          y: tweenState.y,
          zoom: Number(tweenState.zoom.toFixed(2)),
        });
      },
    });

    return () => {
      viewportTweenRef.current?.kill();
    };
  }, [activeLayer, activePersonaId, scopedProjectId, selectedNode?.id, selectedPresentation?.displayVariant, setViewport]);
  const installedBindings = activeView?.nodes.map((node) => node.binding) ?? [];
  const installedNodesForCommand = useMemo(
    () =>
      (activeView?.nodes ?? []).map((node) => ({
        id: node.id,
        label: presentationsByNodeId[node.id]?.title ?? node.binding.entityId,
        description: presentationsByNodeId[node.id]?.summary ?? node.binding.kind,
        kindLabel: presentationsByNodeId[node.id]?.kindLabel ?? node.binding.kind,
      })),
    [activeView?.nodes, presentationsByNodeId],
  );

  const criticalAlerts = (data.alertsQuery.data ?? []).filter((alert) => alert.severity === "critical").length;
  const ensureEditableItem = (
    sourceItem: TelemetryItemDefinition,
    patch?: Partial<CreateCustomTelemetryItemInput>,
  ) => {
    if (!scopedProjectId) return null;

    if (sourceItem.mode === "custom") {
      if (patch) {
        updateCustomItem(
          scopedProjectId,
          sourceItem.id,
          patch as Partial<Parameters<typeof updateCustomItem>[2]>,
        );
      }
      return sourceItem;
    }

    const existingShadow = storedCustomItems.find(
      (candidate) => candidate.id === sourceItem.id || candidate.slug === sourceItem.slug,
    );

    if (existingShadow) {
      if (patch) {
        updateCustomItem(
          scopedProjectId,
          existingShadow.id,
          patch as Partial<Parameters<typeof updateCustomItem>[2]>,
        );
      }
      return existingShadow;
    }

    return createCustomItem(scopedProjectId, {
      ...buildEditableItemSeed(sourceItem),
      ...patch,
    });
  };

  const ensureBindingOnCanvas = (
    binding: WorkspaceNodeBinding,
    openInspector = true,
    position?: { x: number; y: number } | null,
    size?: { w: number; h: number } | null,
  ) => {
    if (!scopedProjectId) return null;
    const node = ensureNode(scopedProjectId, activePersonaId, activeLayer, binding);
    if (!node) return null;
    if (position) {
      moveNode(scopedProjectId, activePersonaId, activeLayer, node.id, position.x, position.y);
    }
    if (size) {
      resizeNode(scopedProjectId, activePersonaId, activeLayer, node.id, size.w, size.h);
    }
    selectNode(scopedProjectId, activePersonaId, activeLayer, node.id);
    setNodeCollapsed(scopedProjectId, activePersonaId, activeLayer, node.id, false);
    setFocusedItemSection(null);
    if (openInspector && window.matchMedia("(max-width: 1279px)").matches) {
      setIsMobileInspectorOpen(true);
    }
    return node;
  };

  const focusItemSection = (
    nodeId: string,
    section: WorkspaceItemEditorSection,
    patch?: { inputEnabled?: boolean; actionEnabled?: boolean },
  ) => {
    if (!scopedProjectId) return;
    const node = activeView.nodes.find((entry) => entry.id === nodeId);
    if (!node || node.binding.kind !== "item") return;
    const currentItem = resolveTelemetryItem(items, node.binding.entityId);
    if (!currentItem) return;

    ensureEditableItem(currentItem, patch);

    selectNode(scopedProjectId, activePersonaId, activeLayer, nodeId);
    setNodeCollapsed(scopedProjectId, activePersonaId, activeLayer, nodeId, false);
    setInspectorTab(scopedProjectId, activePersonaId, "config");
    setFocusedItemSection(section);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setIsMobileInspectorOpen(true);
    }
  };

  const createCanvasItem = (
    position?: { x: number; y: number } | null,
    sourceBinding?: WorkspaceNodeBinding | null,
    seed?: CreateCustomTelemetryItemInput,
  ) => {
    if (!scopedProjectId) return;

    const sourceItem = sourceBinding?.kind === "item" ? resolveTelemetryItem(items, sourceBinding.entityId) : undefined;
    const created = createCustomItem(scopedProjectId, {
      label: sourceItem ? `${sourceItem.label} derivado` : undefined,
      description: sourceItem ? `No criado a partir de ${sourceItem.label}.` : "No dinamico do workspace.",
      tags: sourceItem?.tags.slice(0, 3) ?? [],
      expression: sourceItem ? sourceItem.slug : "",
      displayEnabled: false,
      inputEnabled: false,
      ...seed,
    });

    const createdNode = ensureBindingOnCanvas(
      { kind: "item", entityId: created.id },
      true,
      position ?? undefined,
      created.specialKind ? SPECIAL_NODE_DIMENSIONS[created.specialKind] : null,
    );
    const sourceNode =
      sourceBinding
        ? activeView?.nodes.find(
            (node) =>
              node.binding.kind === sourceBinding.kind && node.binding.entityId === sourceBinding.entityId,
          ) ?? null
        : null;

    if (createdNode && sourceNode && sourceNode.id !== createdNode.id) {
      connectNodes(scopedProjectId, activePersonaId, activeLayer, sourceNode.id, createdNode.id);
    }

    setInspectorTab(scopedProjectId, activePersonaId, "config");
    setFocusedItemSection(created.specialKind ? "program" : sourceItem ? "program" : "receive");
  };

  const handleRunTerminalCommand = async (item: TelemetryItemDefinition, command: string) => {
    if (!scopedProjectId) return;

    const editable = ensureEditableItem(item);
    if (!editable) return;

    const currentTerminal = editable.terminal ?? item.terminal;
    if (!currentTerminal) return;

    const normalizedCommand = command.trim();
    if (!normalizedCommand) return;

    const appendOutput = (nextChunk: string) =>
      [currentTerminal.liveOutput?.trim(), `$ ${normalizedCommand}`, nextChunk.trim()]
        .filter((value) => Boolean(value && value.length))
        .join("\n");

    updateCustomItem(scopedProjectId, editable.id, {
      terminal: {
        ...currentTerminal,
        command: normalizedCommand,
        liveOutput: appendOutput("executando..."),
      },
    });

    try {
      const { data } = await apiClient.post<{
        output: string;
        workingDirectory: string;
        shell: NonNullable<typeof currentTerminal.shell>;
        exitCode: number | null;
      }>(`/projects/${scopedProjectId}/terminal/execute`, {
        shell: currentTerminal.shell,
        command: normalizedCommand,
        workingDirectory: currentTerminal.workingDirectory,
      });

      const output =
        data.output?.trim() ||
        (data.exitCode === 0
          ? "comando finalizado sem output."
          : `processo encerrado com codigo ${data.exitCode ?? "?"}.`);

      updateCustomItem(scopedProjectId, editable.id, {
        terminal: {
          ...currentTerminal,
          shell: data.shell,
          command: normalizedCommand,
          workingDirectory: data.workingDirectory,
          liveOutput: appendOutput(output),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao executar comando.";
      updateCustomItem(scopedProjectId, editable.id, {
        terminal: {
          ...currentTerminal,
          command: normalizedCommand,
          liveOutput: appendOutput(message),
        },
      });
      toast({
        title: "Falha ao executar no terminal",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSelectCatalogItem = (item: WorkspaceCatalogItem) => {
    if (item.id === "builder_item") {
      createCanvasItem();
      setIsCatalogOpen(false);
      return;
    }

    if (item.id === "builder_terminal") {
      createViewportAnchoredNode(createSpecialNodeSeed("terminal"));
      setFocusedItemSection("program");
      setIsCatalogOpen(false);
      return;
    }

    if (item.id === "builder_markdown") {
      createViewportAnchoredNode(createSpecialNodeSeed("markdown"));
      setFocusedItemSection("program");
      setIsCatalogOpen(false);
      return;
    }

    if (item.id === "builder_ai") {
      createViewportAnchoredNode(createSpecialNodeSeed("ai"));
      setFocusedItemSection("program");
      setIsCatalogOpen(false);
      return;
    }

    if (item.binding) {
      ensureBindingOnCanvas(item.binding);
      setIsCatalogOpen(false);
    }
  };

  const handleInspectorAction = (actionId: string, binding: WorkspaceNodeBinding, nodeId: string) => {
    if (!scopedProjectId) return;

    if (actionId === "remove-node") {
      removeNode(scopedProjectId, activePersonaId, activeLayer, nodeId);
      return;
    }

    if (actionId === "new-item") {
      createCanvasItem(undefined, binding);
      return;
    }

    if (actionId === "configure-receive") {
      focusItemSection(nodeId, "receive", { inputEnabled: true });
      return;
    }

    if (actionId === "configure-program") {
      focusItemSection(nodeId, "program");
      return;
    }

    if (actionId === "configure-send") {
      focusItemSection(nodeId, "send", { actionEnabled: true });
      return;
    }

    if (actionId === "focus-source" && binding.kind === "item") {
      const currentItem = resolveTelemetryItem(items, binding.entityId);
      const sourceItemId = currentItem ? getTelemetryItemSourceIds(currentItem)[0] : undefined;
      if (!sourceItemId) return;
      ensureBindingOnCanvas({ kind: "item", entityId: sourceItemId });
    }
  };

  const handlePersonaChange = (personaId: TeamPersonaId) => {
    if (personaScopeId) {
      setProjectTeamPersona(personaScopeId, personaId);
      return;
    }

    setDefaultTeamPersonaId(personaId);
  };

  const handleCyclePersona = () => {
    const currentIndex = PERSONA_IDS.indexOf(activePersonaId);
    const nextPersonaId = PERSONA_IDS[(currentIndex + 1) % PERSONA_IDS.length] ?? PERSONA_IDS[0];
    handlePersonaChange(nextPersonaId);
    toast({
      title: "Persona ativa atualizada",
      description: `Canvas agora em ${teamPersonaMap[nextPersonaId].label}.`,
    });
  };

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

  const handleStartProjectMetaEditing = () => {
    if (!activeProject || isProjectMetaSaving) return;
    setProjectDraftName(activeProject.name);
    setProjectDraftDescription(activeProject.description ?? "");
    setIsProjectMetaEditing(true);
  };

  const handleCancelProjectMetaEditing = () => {
    setProjectDraftName(activeProject?.name ?? "");
    setProjectDraftDescription(activeProject?.description ?? "");
    setIsProjectMetaEditing(false);
  };

  const handleCommitProjectMeta = async () => {
    if (!activeProject) {
      setIsProjectMetaEditing(false);
      return;
    }

    const nextName = projectDraftName.trim();
    const nextDescription = projectDraftDescription.trim();

    if (!nextName) {
      setProjectDraftName(activeProject.name);
      setProjectDraftDescription(activeProject.description ?? "");
      setIsProjectMetaEditing(false);
      return;
    }

    if (nextName === activeProject.name && nextDescription === (activeProject.description ?? "")) {
      setIsProjectMetaEditing(false);
      return;
    }

    setIsProjectMetaSaving(true);
    try {
      await updateProject(activeProject.id, {
        name: nextName,
        description: nextDescription || undefined,
      });
      toast({
        title: "Projeto atualizado",
        description: "Titulo e subtitulo do projeto foram salvos.",
      });
    } catch {
      setProjectDraftName(activeProject.name);
      setProjectDraftDescription(activeProject.description ?? "");
      toast({
        title: "Nao foi possivel salvar o projeto",
        description: "Tente novamente em alguns instantes.",
      });
    } finally {
      setIsProjectMetaSaving(false);
      setIsProjectMetaEditing(false);
    }
  };

  const handleProjectMetaBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const nextFocused = event.relatedTarget as Node | null;
    if (nextFocused && event.currentTarget.contains(nextFocused)) return;
    void handleCommitProjectMeta();
  };

  const handleProjectMetaKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleCommitProjectMeta();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelProjectMetaEditing();
    }
  };

  const handleCreateProject = async () => {
    if (isProjectCreating) return;
    handleCloseInlineSwitchers();
    setIsProjectCreating(true);
    try {
      const created = await createProject({
        name: `Novo projeto ${projects.length + 1}`,
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
    setActiveView(scopedProjectId, activePersonaId, activeLayer, viewId);
    handleCloseInlineSwitchers();
  };

  const handleSelectNode = (nodeId: string) => {
    if (!scopedProjectId) return;
    const node = activeView.nodes.find((entry) => entry.id === nodeId);
    const selectedItem = node?.binding.kind === "item"
      ? resolveTelemetryItem(items, node.binding.entityId)
      : undefined;
    if (selectedItem) {
      ensureEditableItem(selectedItem);
    }
    selectNode(scopedProjectId, activePersonaId, activeLayer, nodeId);
    setIsNodeDockOpen(true);
    handleCloseInlineSwitchers();
    setFocusedItemSection(null);
    if (selectedItem) {
      setInspectorTab(scopedProjectId, activePersonaId, "config");
    }
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setIsMobileInspectorOpen(true);
    }
  };

  const handleOpenNodeFromCommand = (nodeId: string) => {
    if (!scopedProjectId) return;
    const node = activeView.nodes.find((entry) => entry.id === nodeId);
    const selectedItem = node?.binding.kind === "item"
      ? resolveTelemetryItem(items, node.binding.entityId)
      : undefined;
    if (selectedItem) {
      ensureEditableItem(selectedItem);
    }
    selectNode(scopedProjectId, activePersonaId, activeLayer, nodeId);
    setNodeCollapsed(scopedProjectId, activePersonaId, activeLayer, nodeId, false);
    setIsNodeDockOpen(true);
    handleCloseInlineSwitchers();
    setFocusedItemSection(null);
    if (selectedItem) {
      setInspectorTab(scopedProjectId, activePersonaId, "config");
    }
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setIsMobileInspectorOpen(true);
    }
  };

  const handleOpenAlerts = () => {
    if (!scopedProjectId) return;
    setInspectorTab(scopedProjectId, activePersonaId, "data");
    ensureBindingOnCanvas({ kind: "plugin", entityId: "insights" });
  };

  const handleSwitchLayer = (_layer: CanvasLayer) => {
    if (!scopedProjectId) return;
    setActiveLayer(scopedProjectId, activePersonaId, "map");
  };

  const handleCreateWorkspaceTab = () => {
    if (!scopedProjectId || !activeView) return;
    duplicateActiveView(scopedProjectId, activePersonaId, activeLayer, `Workspace ${activeViews.length + 1}`);
    setIsWorkspaceSwitcherOpen(false);
  };

  const handleRestorePreset = () => {
    if (!scopedProjectId) return;
    restoreRolePreset(scopedProjectId, activePersonaId, activeLayer);
  };

  const handleClearSelection = () => {
    if (!scopedProjectId) return;
    selectNode(scopedProjectId, activePersonaId, activeLayer, null);
    setIsNodeDockOpen(false);
    setFocusedItemSection(null);
  };

  const handleToggleInspector = () => {
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setIsMobileInspectorOpen((current) => !current);
      return;
    }
    setIsNodeDockOpen((current) => !current);
  };

  const createViewportAnchoredNode = (seed?: CreateCustomTelemetryItemInput) => {
    if (!scopedProjectId || !activeView) return null;
    const created = createCustomItem(scopedProjectId, seed);
    const position = getViewportAnchor(activeView.viewport);
    const node = ensureBindingOnCanvas(
      { kind: "item", entityId: created.id },
      true,
      position,
      created.specialKind ? SPECIAL_NODE_DIMENSIONS[created.specialKind] : null,
    );
    setInspectorTab(scopedProjectId, activePersonaId, "config");
    setIsNodeDockOpen(true);
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

  const handleCanvasComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
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
        setIsNodeDockOpen(true);
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
        persona: activePersonaId,
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
      setInspectorTab(scopedProjectId, activePersonaId, "actions");
      setIsNodeDockOpen(true);
      if (window.matchMedia("(max-width: 1279px)").matches) {
        setIsMobileInspectorOpen(true);
      }
      return;
    }

    handleOpenAlerts();
    toast({
      title: "Canvas em foco operacional",
      description: "Abrimos insights e alertas para iniciar a leitura do workspace.",
    });
  };

  if (data.projectsQuery.isLoading || !definition || !activeView) {
    return (
      <div className="min-h-[100dvh] bg-background px-4 py-4 text-foreground sm:px-6 lg:px-8">
        <div className="grid min-h-[calc(100dvh-2rem)] gap-4 lg:grid-cols-[88px_minmax(0,1fr)]">
          <div className="hidden rounded-[28px] border border-border/70 bg-card lg:block" />
          <div className="grid min-h-0 gap-4">
            <div className="rounded-[28px] border border-border/70 bg-card px-5 py-4">
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-11 w-48 rounded-2xl bg-muted/70" />
                <Skeleton className="h-11 w-40 rounded-2xl bg-muted/70" />
                <Skeleton className="h-11 w-28 rounded-2xl bg-muted/70" />
              </div>
              <Skeleton className="mt-4 h-7 w-64 rounded-2xl bg-muted/70" />
              <Skeleton className="mt-3 h-4 w-[26rem] max-w-full rounded-2xl bg-muted/50" />
            </div>
            <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <Skeleton className="min-h-[520px] rounded-[28px] bg-muted/40" />
              <Skeleton className="hidden rounded-[28px] bg-muted/40 xl:block" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeProject && !data.projectsQuery.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-xl rounded-[28px] border border-border/70 bg-card p-8">
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" />}
            title="Projeto nao encontrado"
            description="Abra a biblioteca de projetos e selecione um workspace valido."
          />
          <div className="mt-6 flex justify-center">
            <Button onClick={() => setLocation("/")}>
              <FolderKanban className="h-4 w-4" />
              Voltar ao canvas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative h-[100dvh] overflow-hidden bg-[#17191e] text-white">
        <WorkspaceCanvas
          view={activeView}
          edges={canvasEdges}
          selectedNodeId={selectedNodeId}
          connectingNodeId={connectingNodeId}
          presentationsByNodeId={presentationsByNodeId}
          itemsById={itemsById}
          chrome="immersive"
          interactionMode={canvasInteractionMode}
          onSelectNode={handleSelectNode}
          onMoveNode={(nodeId, x, y) => moveNode(scopedProjectId, activePersonaId, activeLayer, nodeId, x, y)}
          onResizeNode={(nodeId, w, h) => resizeNode(scopedProjectId, activePersonaId, activeLayer, nodeId, w, h)}
          onSetViewport={(viewport) => setViewport(scopedProjectId, activePersonaId, activeLayer, viewport)}
          onClearSelection={handleClearSelection}
          onStartConnection={(nodeId) => setConnectingNodeId(nodeId)}
          onCancelConnection={() => setConnectingNodeId(null)}
          onConnectNodes={(sourceNodeId, targetNodeId) => {
            connectNodes(scopedProjectId, activePersonaId, activeLayer, sourceNodeId, targetNodeId);
            setConnectingNodeId(null);
          }}
          onCreateItem={createCanvasItem}
          onRunTerminalCommand={handleRunTerminalCommand}
          onConfigureItem={focusItemSection}
          onRemoveNode={(nodeId) => removeNode(scopedProjectId, activePersonaId, activeLayer, nodeId)}
        />

        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.22)_42%,rgba(0,0,0,0)_100%)]" />

          <div className="pointer-events-auto absolute left-4 top-4 flex items-start gap-3">
            {hasProjectAlternatives ? (
              <WorkspaceInlineSwitcher
                open={isProjectSwitcherOpen}
                placement="below"
                widthClassName="w-[min(360px,calc(100vw-2rem))]"
                shellClassName="rounded-full border border-white/10 bg-[#15181c]/88 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                headerClassName="h-12 w-12 items-center justify-center p-0 transition-colors hover:bg-[#1a1f24]/60"
                bodyInnerClassName="px-3 pb-3"
                collapseTriggerWhenOpen
                collapsedWidth={48}
                collapsedHeight={48}
                collapsedRadius={999}
                expandedRadius={26}
                items={projects
                  .filter((project) => project.id !== scopedProjectId)
                  .map((project) => ({
                    id: project.id,
                    label: project.name,
                    description: project.slug,
                  }))}
                onToggle={handleToggleProjectSwitcher}
                onSelect={handleSelectProject}
                onClose={() => setIsProjectSwitcherOpen(false)}
                trigger={<Menu className="h-5 w-5 text-slate-200" />}
              />
            ) : (
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isProjectCreating}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#15181c]/88 text-slate-200 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-[#1a1f24]/60 disabled:cursor-wait disabled:opacity-70"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0 pt-0.5" onBlur={handleProjectMetaBlur}>
              {isProjectMetaEditing ? (
                <div className="flex min-w-[260px] max-w-[420px] flex-col gap-1 rounded-[20px] border border-white/10 bg-[#15181c]/76 px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <input
                    ref={projectNameInputRef}
                    value={projectDraftName}
                    onChange={(event) => setProjectDraftName(event.target.value)}
                    onKeyDown={handleProjectMetaKeyDown}
                    className="h-7 bg-transparent text-[15px] font-semibold tracking-tight text-white outline-none placeholder:text-white/30"
                    placeholder="Nome do projeto"
                  />
                  <input
                    value={projectDraftDescription}
                    onChange={(event) => setProjectDraftDescription(event.target.value)}
                    onKeyDown={handleProjectMetaKeyDown}
                    className="h-6 bg-transparent text-xs text-white/55 outline-none placeholder:text-white/28"
                    placeholder="Subtitulo do projeto"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartProjectMetaEditing}
                  className="block min-w-[220px] max-w-[420px] rounded-[18px] px-2 py-1 text-left transition hover:bg-white/[0.04]"
                >
                  <p className="truncate text-[15px] font-semibold tracking-tight text-white">
                    {activeProject?.name ?? "Projeto no canvas"}
                  </p>
                  <p className="truncate text-xs text-white/50">{projectSubtitle}</p>
                </button>
              )}
            </div>
          </div>

          <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
            <CanvasChromeButton icon={<Play className="h-4 w-4" />} label="Executar" onClick={handleRunCanvas} />
            <CanvasChromeButton icon={<Download className="h-4 w-4" />} label="Exportar" onClick={handleExportWorkspace} />
            <CanvasChromeButton icon={<Share2 className="h-4 w-4" />} label="Compartilhar" onClick={handleShareWorkspace} />
            <button type="button" onClick={handleCyclePersona}>
              <Avatar className="h-11 w-11 border border-white/10 bg-[#181b20]/92 shadow-[0_12px_28px_rgba(0,0,0,0.32)]">
                <AvatarFallback className="bg-transparent text-slate-100">
                  <User2 className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </button>
          </div>

        <div className="pointer-events-auto absolute left-4 bottom-4 flex w-[min(384px,calc(100vw-2rem))] flex-col gap-3">
            <div className="flex w-full items-end gap-2">
              {hasWorkspaceAlternatives ? (
                <WorkspaceInlineSwitcher
                  open={isWorkspaceSwitcherOpen}
                  placement="above"
                  widthClassName="w-[320px]"
                  shellClassName="rounded-[24px] border border-white/10 bg-[#16181d]/92 shadow-[0_20px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl"
                  headerClassName="min-h-[56px] gap-3 px-4 py-3 transition-colors hover:bg-[#1b1f24]/60"
                  bodyInnerClassName="px-4 pb-4"
                  collapsedWidth={320}
                  collapsedHeight={56}
                  collapsedRadius={24}
                  expandedRadius={28}
                  items={activeViews
                    .filter((view) => view.id !== activeViewId)
                    .map((view) => ({
                      id: view.id,
                      label: view.name,
                      description: `${view.nodes.length} nodes`,
                    }))}
                  onToggle={handleToggleWorkspaceSwitcher}
                  onSelect={handleSelectWorkspaceView}
                  onClose={() => setIsWorkspaceSwitcherOpen(false)}
                  trigger={
                    <>
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-200">
                          {activeViews.length}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{activeView.name}</p>
                          <p className="truncate text-[11px] text-white/45">{activeProject?.name ?? "Workspace"}</p>
                        </div>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/50 transition duration-300", isWorkspaceSwitcherOpen && "rotate-180 text-white/74")} />
                    </>
                  }
                />
              ) : (
                <div className="inline-flex h-14 w-[320px] items-center gap-3 rounded-[24px] border border-white/10 bg-[#16181d]/92 px-4 py-3 text-left shadow-[0_20px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-200">
                    {activeViews.length}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{activeView.name}</p>
                    <p className="truncate text-[11px] text-white/45">{activeProject?.name ?? "Workspace"}</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleCreateWorkspaceTab}
                className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#16181d]/92 text-slate-100 shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-[#1b1f24]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCyclePersona}
              className="inline-flex w-full items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[#16181d]/92 px-4 py-3 text-left shadow-[0_20px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:bg-[#1b1f24]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Bot className="h-4 w-4 text-white/70" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">Registro do agente</p>
                  <p className="truncate text-[11px] text-white/45">{activePersona.label}</p>
                </div>
              </div>
              <Sparkles className="h-4 w-4 text-white/50" />
            </button>
          </div>


          <div className="pointer-events-auto absolute right-4 top-1/2 hidden -translate-y-1/2 xl:flex">
            <div className="flex flex-col items-center gap-2 rounded-[26px] border border-white/10 bg-[#16181d]/94 px-2 py-3 shadow-[0_24px_56px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
              <CanvasToolButton icon={<MousePointer2 className="h-4 w-4" />} active={canvasInteractionMode === "select"} onClick={() => setCanvasInteractionMode("select")} />
              <CanvasToolButton icon={<Sparkles className="h-4 w-4" />} onClick={() => setIsCommandOpen(true)} />
              <CanvasToolButton icon={<Pencil className="h-4 w-4" />} onClick={handleOpenProgramming} />
              <CanvasToolButton icon={<Hand className="h-4 w-4" />} active={canvasInteractionMode === "pan"} onClick={() => setCanvasInteractionMode("pan")} />
              <CanvasToolButton icon={<Image className="h-4 w-4" />} onClick={() => setIsCatalogOpen(true)} />
              <div className="my-1 h-px w-8 bg-white/8" />
              <CanvasToolButton icon={<Bot className="h-4 w-4" />} onClick={handleCyclePersona} />
              <CanvasToolButton icon={<Star className="h-4 w-4" />} onClick={handleRestorePreset} />
              <CanvasToolButton
                icon={isNodeDockOpen && selectedNode ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                active={Boolean(isNodeDockOpen && selectedNode)}
                onClick={handleToggleInspector}
              />
            </div>
          </div>

          <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-2">
            <CanvasStatusPill icon={<Cloud className="h-3.5 w-3.5" />} label={criticalAlerts > 0 ? `${criticalAlerts} alertas` : "sync"} />
            <CanvasStatusPill label={`${Math.round(activeView.viewport.zoom * 100)}%`} />
            <CanvasStatusPill icon={<Monitor className="h-3.5 w-3.5" />} />
            <CanvasStatusPill icon={<CircleHelp className="h-3.5 w-3.5" />} />
          </div>
        </div>

        <WorkspaceNodeDock
          expanded={Boolean(selectedNode && isNodeDockOpen)}
          node={selectedNode}
          presentation={selectedPresentation}
          assistantPrompt={assistantPrompt}
          activePersonaLabel={activePersona.shortLabel}
          onPromptChange={setAssistantPrompt}
          onPromptKeyDown={handleCanvasComposerKeyDown}
          onSubmit={handleCreateNodeFromPrompt}
          onQuickCreate={handleQuickCreateNode}
          onOpenCatalog={() => setIsCatalogOpen(true)}
          onOpenProgramming={handleOpenProgramming}
          onCyclePersona={handleCyclePersona}
          onCloseNode={handleClearSelection}
          inspectorContent={
            <WorkspaceNodeChatPanel
              projectId={scopedProjectId}
              node={selectedNode}
              binding={selectedNode?.binding ?? null}
              presentation={selectedPresentation}
              item={selectedItem}
              items={items}
              referenceItems={referenceItems}
              systemMetrics={data.systemMetrics}
              focusSection={focusedItemSection}
              onAction={handleInspectorAction}
            />
          }
        />
      </div>

      <PluginCatalogDialog
        open={isCatalogOpen}
        onOpenChange={setIsCatalogOpen}
        items={catalogItems}
        installedBindings={installedBindings}
        roleId={activePersonaId}
        presentationByBindingKey={catalogPresentationByBindingKey}
        onSelectItem={handleSelectCatalogItem}
      />

      <WorkspaceCommandMenu
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        installedNodes={installedNodesForCommand}
        catalogItems={catalogItems}
        currentLayer={activeLayer}
        roleLabel={activePersona.label}
        onOpenNode={handleOpenNodeFromCommand}
        onSelectCatalogItem={handleSelectCatalogItem}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        onSwitchLayer={handleSwitchLayer}
        onOpenProjects={() => {
          if (!hasProjectAlternatives) {
            void handleCreateProject();
            return;
          }
          setIsWorkspaceSwitcherOpen(false);
          setIsProjectSwitcherOpen(true);
        }}
        onOpenSettings={() => {
          if (!hasWorkspaceAlternatives) return;
          setIsProjectSwitcherOpen(false);
          setIsWorkspaceSwitcherOpen(true);
        }}
        onRestorePreset={handleRestorePreset}
      />


      <Sheet open={isMobileInspectorOpen} onOpenChange={setIsMobileInspectorOpen}>
        <SheetContent side="right" className="w-full border-l border-border/70 bg-background p-0 sm:max-w-[640px]">
          <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
            <SheetTitle>{selectedPresentation?.title ?? "Node Chat"}</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100dvh-73px)] p-4">
            <WorkspaceNodeChatPanel
              projectId={scopedProjectId}
              node={selectedNode}
              binding={selectedNode?.binding ?? null}
              presentation={selectedPresentation}
              item={selectedItem}
              items={items}
              referenceItems={referenceItems}
              systemMetrics={data.systemMetrics}
              focusSection={focusedItemSection}
              onAction={handleInspectorAction}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function snapToGrid(value: number) {
  return Math.round(value / 24) * 24;
}

function clampCanvasZoom(value: number) {
  return Math.max(0.72, Math.min(1.18, Number(value.toFixed(2))));
}

function getViewportAnchor(viewport: { x: number; y: number; zoom: number }) {
  const viewportWidth = 960;
  const viewportHeight = 560;
  const sceneCenterX = (-viewport.x + viewportWidth * 0.5) / viewport.zoom;
  const sceneCenterY = (-viewport.y + viewportHeight * 0.5) / viewport.zoom;

  return {
    x: snapToGrid(sceneCenterX - 220),
    y: snapToGrid(sceneCenterY - 120),
  };
}

function buildNodeReferenceItems(input: {
  node: CanvasNode | null;
  items: TelemetryItemDefinition[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}) {
  const { node, items, nodes, edges } = input;
  if (!node || node.binding.kind !== "item") {
    return items.filter(isGlobalReferenceItem);
  }

  const nodeById = new Map(nodes.map((entry) => [entry.id, entry]));
  const collected = new Map<string, TelemetryItemDefinition>();
  const currentEntityId = node.binding.entityId;

  const include = (item: TelemetryItemDefinition | undefined) => {
    if (!item) return;
    if (item.id === currentEntityId || item.slug === currentEntityId) return;
    collected.set(item.id, item);
  };

  items.filter(isGlobalReferenceItem).forEach(include);

  edges
    .filter((edge) => edge.target === node.id)
    .forEach((edge) => {
      const sourceNode = nodeById.get(edge.source);
      if (!sourceNode || sourceNode.binding.kind !== "item") return;
      include(resolveTelemetryItem(items, sourceNode.binding.entityId));
    });

  return Array.from(collected.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR"),
  );
}

function isGlobalReferenceItem(item: TelemetryItemDefinition) {
  const receiveEnabled = item.receive?.enabled ?? item.inputEnabled ?? item.acceptsInput ?? false;
  if (receiveEnabled || item.mode === "capture") return true;
  return item.sources.length === 0 || item.sources.every((source) => source.kind !== "item");
}

function buildEditableItemSeed(item: TelemetryItemDefinition): CreateCustomTelemetryItemInput {
  return {
    label: item.label,
    slug: item.slug,
    description: item.description ?? undefined,
    tags: [...item.tags],
    expression: inferEditableExpression(item),
    inputEnabled: item.receive?.enabled ?? item.inputEnabled ?? item.acceptsInput,
    displayEnabled: (
      item.display?.enabled ??
      item.displayEnabled ??
      item.hasDisplay ??
      false
    ) || item.mode === "canvas" || item.mode === "list" || item.mode === "value",
    presentation: inferEditablePresentation(item),
    resultType: inferEditableResultType(item),
    schema: item.schema ?? inferEditableSchema(item),
    samplePayload: inferEditableSamplePayload(item),
    identityKeys: item.identityKeys.length ? [...item.identityKeys] : ["id"],
    timestampField: item.timestampField ?? "updatedAt",
    actionEnabled: item.action?.enabled ?? item.actionEnabled ?? false,
    actionType: item.action?.type ?? item.actionType ?? "webhook",
    actionTarget: item.action?.target ?? item.actionTarget ?? "https://api.exemplo.dev/hooks/lynx",
    actionMethod: item.action?.method ?? item.actionMethod ?? "POST",
    actionLive: item.action?.live ?? item.actionLive ?? false,
    actionPayloadExpression: item.action?.payloadExpression ?? item.actionPayloadExpression ?? "result",
    specialKind: item.specialKind ?? undefined,
    terminal: item.terminal,
    markdown: item.markdown,
    ai: item.ai,
  };
}

function inferEditableExpression(item: TelemetryItemDefinition) {
  if (item.expression?.trim()) return item.expression;
  if (item.mode === "canvas") return item.sources[0]?.ref ?? item.slug;
  return item.slug;
}

function inferEditablePresentation(
  item: TelemetryItemDefinition,
): NonNullable<CreateCustomTelemetryItemInput["presentation"]> {
  if (item.presentation) return item.presentation;
  if (item.mode === "list") return "table";
  if (item.mode === "canvas") return "text";
  return "stat";
}

function inferEditableResultType(
  item: TelemetryItemDefinition,
): NonNullable<CreateCustomTelemetryItemInput["resultType"]> {
  if (item.resultType) return item.resultType;
  if (item.format) return item.format;
  if (item.outputShape === "dataset" || item.outputShape === "records") return "dataset";
  if (item.mode === "canvas" && item.presentation === "text") return "text";
  return "auto";
}

function inferEditableSamplePayload(item: TelemetryItemDefinition) {
  if (item.samplePayload) return item.samplePayload;
  if (item.materializedDataset?.rows?.length) {
    return { rows: item.materializedDataset.rows.slice(0, 3) };
  }
  if (typeof item.materializedMetric?.value === "number") {
    return {
      value: item.materializedMetric.value,
      formattedValue: item.materializedMetric.formattedValue,
      updatedAt: item.materializedMetric.updatedAt,
    };
  }
  if (item.canvasPreview) {
    return {
      headline: item.canvasPreview.headline,
      summary: item.canvasPreview.summary,
      metrics: item.canvasPreview.metrics,
    };
  }
  return {
    id: `${item.slug}_001`,
    updatedAt: item.updatedAt,
  };
}

function inferEditableSchema(item: TelemetryItemDefinition): TelemetrySchemaField {
  if (item.outputShape === "dataset" || item.outputShape === "records") {
    const sampleRecord =
      (Array.isArray(item.materializedDataset?.rows) ? item.materializedDataset?.rows[0] : undefined) ??
      item.samplePayload;

    if (sampleRecord && typeof sampleRecord === "object" && !Array.isArray(sampleRecord)) {
      return {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(sampleRecord).map(([key, value]) => [
            key,
            {
              type: (
                typeof value === "number"
                  ? "number"
                  : typeof value === "boolean"
                    ? "boolean"
                    : key.toLowerCase().includes("at")
                      ? "date-time"
                      : "string"
              ) as TelemetrySchemaField["type"],
            },
          ]),
        ),
      };
    }
  }

  return {
    type: "object",
    properties: {
      value: {
        type: item.outputShape === "value" ? "number" : "string",
      },
      updatedAt: {
        type: "date-time",
      },
    },
  };
}

function inferNodeSeedFromPrompt(prompt: string): CreateCustomTelemetryItemInput {
  const normalized = prompt.trim().toLowerCase();
  const compactLabel = prompt
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 5)
    .join(" ");
  const label =
    compactLabel.length > 0
      ? compactLabel.charAt(0).toUpperCase() + compactLabel.slice(1)
      : "Novo node";
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const tags = Array.from(
    new Set(
      tokens.filter((token) =>
        [
          "input",
          "entrada",
          "trigger",
          "webhook",
          "api",
          "transform",
          "logic",
          "metric",
          "card",
          "grafico",
          "chart",
          "tabela",
          "table",
          "acao",
          "action",
          "agent",
          "terminal",
          "shell",
          "markdown",
          "report",
          "ai",
          "llm",
        ].includes(token),
      ),
    ),
  ).slice(0, 4);

  const inputEnabled = /(input|entrada|receive|receber|captura|source|trigger|webhook|ingest)/.test(normalized);
  const actionEnabled = /(acao|action|enviar|send|post|patch|webhook|integrat|alerta|notific)/.test(normalized);
  const wantsTerminal = /(terminal|shell|bash|powershell|cli|claude code|claude)/.test(normalized);
  const wantsMarkdown = /(markdown|relatorio|report|document|nota|docs)/.test(normalized);
  const wantsAi = /(^|\W)(ia|ai|llm|openai|anthropic|gemini|modelo)(\W|$)/.test(normalized);
  const wantsTable = /(tabela|table|dataset|lista|grid)/.test(normalized);
  const wantsChart = /(grafico|chart|serie|trend|timeline)/.test(normalized);
  const wantsComparison = /(compar|versus|vs\b|delta)/.test(normalized);
  const wantsText = /(texto|summary|resumo|narrativa|insight)/.test(normalized);
  const displayEnabled =
    wantsTable ||
    wantsChart ||
    wantsComparison ||
    wantsText ||
    /(card|visual|display|widget|painel|dashboard)/.test(normalized);

  const specialKind = wantsTerminal
    ? "terminal"
    : wantsMarkdown
      ? "markdown"
      : wantsAi
        ? "ai"
        : undefined;

  const presentation = wantsTable
    ? "table"
    : wantsChart
      ? "line"
      : wantsComparison
        ? "comparison"
        : wantsText
          ? "text"
          : "stat";
  const resultType = wantsTable ? "dataset" : wantsText ? "text" : "auto";
  const expression = /(transform|logic|formula|dsl|deriva|agrega|filtra|manipula|calcula)/.test(normalized)
    ? "// pipeline\nreturn input;"
    : inputEnabled
      ? ""
      : "0";

  return {
    label,
    description: prompt.trim(),
    tags,
    inputEnabled: specialKind ? true : inputEnabled,
    displayEnabled: specialKind ? true : displayEnabled,
    presentation: specialKind ? "text" : presentation,
    resultType: specialKind ? "text" : resultType,
    expression,
    actionEnabled: specialKind === "ai" ? true : actionEnabled,
    specialKind,
  };
}

function createSpecialNodeSeed(kind: SpecialTelemetryNodeKind): CreateCustomTelemetryItemInput {
  if (kind === "terminal") {
    return {
      label: "Terminal Node",
      description: "Sessao shell conectada ao canvas para receber contexto, transmitir stdout e encadear comandos.",
      tags: ["terminal", "shell", "runtime"],
      specialKind: "terminal",
    };
  }

  if (kind === "markdown") {
    return {
      label: "Markdown Report",
      description: "Documento markdown com preview integrado para relatorios, resumos e entregas geradas por IA.",
      tags: ["markdown", "report", "document"],
      specialKind: "markdown",
    };
  }

  return {
    label: "Assistente IA",
    description: "Node de IA conectado ao fluxo para leitura, analise e automacao com modelo configuravel.",
    tags: ["ai", "llm", "automation"],
    specialKind: "ai",
    actionEnabled: true,
    actionType: "ai-trigger",
  };
}

function CanvasChromeButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-[#15181c]/88 px-4 text-sm font-semibold text-slate-100 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-[#1a1f24]"
    >
      <span className="text-white/80">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function CanvasIconButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/8"
    >
      <span className="text-white/70">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function CanvasToolButton({
  icon,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border text-slate-200 transition",
        active
          ? "border-white/20 bg-white text-slate-950 shadow-[0_10px_26px_rgba(255,255,255,0.18)]"
          : "border-transparent bg-transparent hover:border-white/8 hover:bg-white/6",
      )}
    >
      {icon}
    </button>
  );
}

function CanvasStatusPill({
  icon,
  label,
}: {
  icon?: ReactNode;
  label?: string;
}) {
  return (
    <div className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#16181d]/92 px-4 text-sm font-medium text-slate-200 shadow-[0_16px_36px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      {icon ? <span className="text-white/70">{icon}</span> : null}
      {label ? <span>{label}</span> : null}
    </div>
  );
}












