 "use client";

import { useEffect, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { gsap } from "gsap";
import { useQueryState } from "nuqs";
import { useLocation, useParams } from "@/lib/router/wouter-compat";
import { PluginCatalogDialog } from "@/components/workspace/PluginCatalogDialog";
import { WorkspaceCommandMenu } from "@/components/workspace/WorkspaceCommandMenu";
import { WorkspaceCanvasChrome } from "@/features/workspace/components/workspace-canvas-chrome";
import { WorkspaceCanvasScene } from "@/features/workspace/components/workspace-canvas-scene";
import { useWorkspaceCanvasOperations } from "@/features/workspace/hooks/use-workspace-canvas-operations";
import { useWorkspaceProjectMeta } from "@/features/workspace/hooks/use-workspace-project-meta";
import { useWorkspaceRemoteSync } from "@/features/workspace/hooks/use-workspace-remote-sync";
import { useWorkspaceScreenNavigation } from "@/features/workspace/hooks/use-workspace-screen-navigation";
import { useWorkspaceScreenLocalState } from "@/features/workspace/hooks/use-workspace-screen-local-state";
import {
  buildEditableItemSeed,
  buildNodeReferenceItems,
  clampCanvasZoom,
  createAssetNodeSeed,
  createSpecialNodeSeed,
  getViewportAnchor,
  inferNodeSeedFromPrompt,
  normalizeBrowserUrl,
  snapToGrid,
} from "@/features/workspace/lib/workspace-page-helpers";
import { getWorkspaceRenderedNodeFrame } from "@/features/workspace/lib/workspace-node-layout";
import {
  SPECIAL_NODE_DIMENSIONS,
  isCanvasLayer,
  isInspectorTab,
  isPluginId,
} from "@/features/workspace/lib/workspace-screen-config";
import { apiClient } from "@/lib/http/axios";
import { DEFAULT_WORKSPACE_ROLE_ID } from "@/lib/workspace/types";
import {
  type CustomTelemetryItemDefinition,
  getTelemetryItemSourceIds,
  resolveTelemetryItem,
  type CreateCustomTelemetryItemInput,
  type TelemetryItemDefinition,
} from "@/lib/telemetry/items";
import {
  type WorkspaceFileAsset,
} from "@/lib/workspace/file-assets";
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
  WorkspaceView,
} from "@/lib/workspace/types";
import { useWorkspaceData } from "@/lib/workspace/use-workspace-data";
import { useToast } from "@/hooks/use-toast";
import { useProjectStore } from "@/store/use-project-store";
import { useProjectsStore } from "@/store/use-projects-store";
import { useWorkspaceAssetStore } from "@/store/use-workspace-asset-store";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useCustomItemStore } from "@/store/use-custom-item-store";
import { cn } from "@/lib/utils";

const EMPTY_CUSTOM_ITEMS: CustomTelemetryItemDefinition[] = [];
const EMPTY_ASSETS: WorkspaceFileAsset[] = [];
const NODE_FOCUS_SIDE_MARGIN = 112;
const NODE_FOCUS_TOP_MARGIN = 112;
const NODE_FOCUS_BOTTOM_MARGIN = 176;

export default function Workspace() {
  const { projectId: routeProjectId = "" } = useParams<{ projectId: string }>();
  const [, setLocation] = useLocation();
  const [queryPlugin] = useQueryState("plugin");
  const [queryTab] = useQueryState("tab");
  const [queryLayer] = useQueryState("layer");
  const { toast } = useToast();
  const selectionViewportRestoreRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const previousSelectedNodeIdRef = useRef<string | null>(null);
  const previousFocusedViewIdRef = useRef<string | null>(null);

  const { setSelectedProjectId } = useProjectStore();

  const data = useWorkspaceData(routeProjectId);
  const projects = data.projectsQuery.data ?? [];
  const activeProject =
    projects.find((project) => project.id === routeProjectId || project.slug === routeProjectId) ?? null;
  const {
    viewportStateRef,
    viewportTweenRef,
    projectNameInputRef,
    isProjectSwitcherOpen,
    setIsProjectSwitcherOpen,
    isWorkspaceSwitcherOpen,
    setIsWorkspaceSwitcherOpen,
    isCatalogOpen,
    setIsCatalogOpen,
    isCommandOpen,
    setIsCommandOpen,
    focusedItemSection,
    setFocusedItemSection,
    assistantPrompt,
    setAssistantPrompt,
    canvasInteractionMode,
    setCanvasInteractionMode,
    isProjectMetaEditing,
    setIsProjectMetaEditing,
    isProjectMetaSaving,
    setIsProjectMetaSaving,
    isProjectCreating,
    setIsProjectCreating,
    projectDraftName,
    setProjectDraftName,
    projectDraftDescription,
    setProjectDraftDescription,
  } = useWorkspaceScreenLocalState(activeProject);
  const scopedProjectId = activeProject?.id ?? routeProjectId;
  const workspaceRoleId = DEFAULT_WORKSPACE_ROLE_ID;
  const scopeKey = scopedProjectId;

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
  const disconnectEdge = useWorkspaceStore((state) => state.disconnectEdge);
  const createProject = useProjectsStore((state) => state.createProject);
  const updateProject = useProjectsStore((state) => state.updateProject);

  const createCustomItem = useCustomItemStore((state) => state.createItem);
  const updateCustomItem = useCustomItemStore((state) => state.updateItem);
  const customItemsByProject = useCustomItemStore((state) => state.itemsByProject);
  const assetsByProject = useWorkspaceAssetStore((state) => state.assetsByProject);
  const loadProjectAssets = useWorkspaceAssetStore((state) => state.loadProjectAssets);
  const addProjectFiles = useWorkspaceAssetStore((state) => state.addFiles);
  const updateProjectAsset = useWorkspaceAssetStore((state) => state.updateAsset);
  const deleteProjectAsset = useWorkspaceAssetStore((state) => state.deleteAsset);

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
    ensureWorkspace(scopedProjectId, workspaceRoleId);
  }, [workspaceRoleId, ensureWorkspace, scopedProjectId]);

  useEffect(() => {
    if (!scopedProjectId) return;
    void loadProjectAssets(scopedProjectId);
  }, [loadProjectAssets, scopedProjectId]);

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
    if (previousFocusedViewIdRef.current === activeView?.id) return;
    previousFocusedViewIdRef.current = activeView?.id ?? null;
    previousSelectedNodeIdRef.current = null;
    selectionViewportRestoreRef.current = null;
  }, [activeView?.id]);

  const storedCustomItems = useMemo(
    () => (scopedProjectId ? customItemsByProject[scopedProjectId] ?? EMPTY_CUSTOM_ITEMS : EMPTY_CUSTOM_ITEMS),
    [customItemsByProject, scopedProjectId],
  );
  useWorkspaceRemoteSync({
    projectId: scopedProjectId,
    definition,
    customItems: storedCustomItems,
  });
  const assets = useMemo(
    () => (scopedProjectId ? assetsByProject[scopedProjectId] ?? EMPTY_ASSETS : EMPTY_ASSETS),
    [assetsByProject, scopedProjectId],
  );
  const items = data.items;
  const itemsById = useMemo(() => Object.fromEntries(items.map((item) => [item.id, item])), [items]);
  const assetsById = useMemo(
    () => Object.fromEntries(assets.map((asset) => [asset.id, asset])) as Record<string, WorkspaceFileAsset>,
    [assets],
  );

  const {
    handleStartProjectMetaEditing,
    handleCancelProjectMetaEditing,
    handleCommitProjectMeta,
    handleProjectMetaBlur,
    handleProjectMetaKeyDown,
  } = useWorkspaceProjectMeta({
    activeProject,
    projectDraftName,
    projectDraftDescription,
    isProjectMetaSaving,
    setProjectDraftName,
    setProjectDraftDescription,
    setIsProjectMetaEditing,
    setIsProjectMetaSaving,
    updateProject,
    toast,
  });

  useEffect(() => {
    if (!scopedProjectId || !definition) return;
    const nextPlugin = queryPlugin;
    const nextTab = queryTab;
    const nextLayer = queryLayer;

    if (isCanvasLayer(nextLayer) && definition.activeLayer !== nextLayer) {
      setActiveLayer(scopedProjectId, workspaceRoleId, nextLayer);
    } else if (!nextLayer && definition.activeLayer !== "map") {
      setActiveLayer(scopedProjectId, workspaceRoleId, "map");
    }

    if (isInspectorTab(nextTab) && nextTab !== definition.inspectorTab) {
      setInspectorTab(scopedProjectId, workspaceRoleId, nextTab);
    }

    if (isPluginId(nextPlugin)) {
      const ensured = ensureNode(scopedProjectId, workspaceRoleId, "map", {
        kind: "plugin",
        entityId: nextPlugin,
      });
      if (ensured) {
        selectNode(scopedProjectId, workspaceRoleId, "map", ensured.id);
        setNodeCollapsed(scopedProjectId, workspaceRoleId, "map", ensured.id, false);
      }
    }
  }, [
    workspaceRoleId,
    definition,
    ensureNode,
    queryLayer,
    queryPlugin,
    queryTab,
    scopedProjectId,
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

  const catalogItems = useMemo(
    () => buildWorkspaceCatalog({ items }),
    [items],
  );

  const catalogPresentationByBindingKey = useMemo(() => {
    const entries = catalogItems
      .filter((item) => item.binding)
      .map((item) => [
        getBindingKey(item.binding!),
        getWorkspaceNodePresentation(item.binding!, scopedProjectId, data),
      ]);

    return Object.fromEntries(entries) as Record<string, WorkspaceNodePresentation>;
  }, [catalogItems, data, scopedProjectId]);

  const presentationsByNodeId = useMemo(() => {
    const entries = (activeView?.nodes ?? []).map((node) => [
      node.id,
      getWorkspaceNodePresentation(node.binding, scopedProjectId, data),
    ]);

    return Object.fromEntries(entries) as Record<string, WorkspaceNodePresentation>;
  }, [activeView?.nodes, data, scopedProjectId]);

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
    if (!scopedProjectId) return;

    storedCustomItems.forEach((entry) => {
      if (entry.specialKind === "file-manager" && entry.fileManager) {
        const filteredAssetIds = entry.fileManager.assetIds.filter((assetId) => Boolean(assetsById[assetId]));
        const selectedAssetId = filteredAssetIds.includes(entry.fileManager.selectedAssetId ?? "")
          ? entry.fileManager.selectedAssetId ?? null
          : filteredAssetIds[0] ?? null;

        if (
          filteredAssetIds.length !== entry.fileManager.assetIds.length ||
          selectedAssetId !== (entry.fileManager.selectedAssetId ?? null)
        ) {
          updateCustomItem(scopedProjectId, entry.id, {
            fileManager: {
              ...entry.fileManager,
              assetIds: filteredAssetIds,
              selectedAssetId,
            },
          });
        }
      }

      if (entry.specialKind === "file-viewer" && entry.fileViewer?.assetId) {
        const exists = Boolean(assetsById[entry.fileViewer.assetId]);
        const nextState = exists ? "ready" : "missing";
        if (entry.fileViewer.previewState !== nextState) {
          updateCustomItem(scopedProjectId, entry.id, {
            fileViewer: {
              ...entry.fileViewer,
              previewState: nextState,
            },
          });
        }
      }
    });
  }, [assetsById, scopedProjectId, storedCustomItems, updateCustomItem]);

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
    if (!scopedProjectId) {
      return;
    }

    const animateViewportTo = (target: { x: number; y: number; zoom: number }) => {
      const tweenState = { ...viewportStateRef.current };

      viewportTweenRef.current?.kill();
      viewportTweenRef.current = gsap.to(tweenState, {
        x: target.x,
        y: target.y,
        zoom: target.zoom,
        duration: 0.62,
        ease: "power3.out",
        onUpdate: () => {
          viewportStateRef.current = { ...tweenState };
          setViewport(scopedProjectId, workspaceRoleId, activeLayer, {
            x: tweenState.x,
            y: tweenState.y,
            zoom: Number(tweenState.zoom.toFixed(2)),
          });
        },
      });
    };

    const previousSelectedNodeId = previousSelectedNodeIdRef.current;

    if (!selectedNode) {
      if (previousSelectedNodeId && selectionViewportRestoreRef.current) {
        animateViewportTo(selectionViewportRestoreRef.current);
      }
      previousSelectedNodeIdRef.current = null;
      selectionViewportRestoreRef.current = null;
      return () => {
        viewportTweenRef.current?.kill();
      };
    }

    if (!previousSelectedNodeId) {
      selectionViewportRestoreRef.current = { ...viewportStateRef.current };
    }

    const selectedNodeFrame = getWorkspaceRenderedNodeFrame(selectedNode, selectedPresentation);
    const availableWidth = Math.max(240, window.innerWidth - NODE_FOCUS_SIDE_MARGIN * 2);
    const availableHeight = Math.max(
      220,
      window.innerHeight - NODE_FOCUS_TOP_MARGIN - NODE_FOCUS_BOTTOM_MARGIN,
    );
    const targetZoom = clampCanvasZoom(
      Math.min(
        availableWidth / Math.max(selectedNodeFrame.w, 1),
        availableHeight / Math.max(selectedNodeFrame.h, 1),
      ),
    );
    const targetCenterX = NODE_FOCUS_SIDE_MARGIN + availableWidth * 0.5;
    const targetCenterY = NODE_FOCUS_TOP_MARGIN + availableHeight * 0.5;
    const targetX = targetCenterX - (selectedNodeFrame.x + selectedNodeFrame.w * 0.5) * targetZoom;
    const targetY = targetCenterY - (selectedNodeFrame.y + selectedNodeFrame.h * 0.5) * targetZoom;

    animateViewportTo({
      x: targetX,
      y: targetY,
      zoom: targetZoom,
    });
    previousSelectedNodeIdRef.current = selectedNode.id;

    return () => {
      viewportTweenRef.current?.kill();
    };
  }, [
    activeLayer,
    scopedProjectId,
    selectedNode?.h,
    selectedNode?.id,
    selectedNode?.w,
    selectedNode?.x,
    selectedNode?.y,
    setViewport,
    workspaceRoleId,
    viewportStateRef,
    viewportTweenRef,
  ]);
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

  const handleUploadFilesToNode = async (item: TelemetryItemDefinition, files: File[]) => {
    if (!scopedProjectId || !files.length) return;
    const editable = ensureEditableItem(item, { specialKind: "file-manager" });
    if (!editable) return;

    const uploaded = await addProjectFiles(scopedProjectId, files);
    const currentConfig = editable.fileManager ?? {
      assetIds: [],
      sortBy: "recent" as const,
      filter: "",
      selectedAssetId: null,
      viewMode: "list" as const,
    };
    const assetIds = Array.from(new Set([...currentConfig.assetIds, ...uploaded.map((asset) => asset.id)]));

    updateCustomItem(scopedProjectId, editable.id, {
      fileManager: {
        ...currentConfig,
        assetIds,
        selectedAssetId: currentConfig.selectedAssetId ?? uploaded[0]?.id ?? null,
      },
    });

    toast({
      title: "Arquivos enviados",
      description: `${uploaded.length} arquivo(s) adicionados ao File Manager.`,
    });
  };

  const handleSelectFileManagerAsset = (item: TelemetryItemDefinition, assetId: string) => {
    if (!scopedProjectId) return;
    const editable = ensureEditableItem(item, { specialKind: "file-manager" });
    if (!editable) return;
    updateCustomItem(scopedProjectId, editable.id, {
      fileManager: {
        ...(editable.fileManager ?? {
          assetIds: [],
          sortBy: "recent",
          filter: "",
          selectedAssetId: null,
          viewMode: "list",
        }),
        selectedAssetId: assetId,
      },
    });
  };

  const handleRenameFileAsset = async (assetId: string, name: string) => {
    if (!scopedProjectId || !name.trim()) return;
    await updateProjectAsset(scopedProjectId, assetId, { name: name.trim() });
  };

  const handleDeleteFileAsset = async (assetId: string) => {
    if (!scopedProjectId) return;
    await deleteProjectAsset(scopedProjectId, assetId);

    storedCustomItems.forEach((entry) => {
      if (entry.specialKind === "file-manager" && entry.fileManager?.assetIds.includes(assetId)) {
        const nextAssetIds = entry.fileManager.assetIds.filter((candidate) => candidate !== assetId);
        updateCustomItem(scopedProjectId, entry.id, {
          fileManager: {
            ...entry.fileManager,
            assetIds: nextAssetIds,
            selectedAssetId:
              entry.fileManager.selectedAssetId === assetId
                ? nextAssetIds[0] ?? null
                : entry.fileManager.selectedAssetId ?? null,
          },
        });
      }

      if (entry.specialKind === "file-viewer" && entry.fileViewer?.assetId === assetId) {
        updateCustomItem(scopedProjectId, entry.id, {
          fileViewer: {
            ...entry.fileViewer,
            previewState: "missing",
          },
        });
      }
    });
  };

  const handleOpenAssetAsNode = (sourceItem: TelemetryItemDefinition, assetId: string) => {
    if (!scopedProjectId) return;
    const asset = assetsById[assetId];
    if (!asset) return;

    const created = createCustomItem(scopedProjectId, createAssetNodeSeed(asset));
    const position = activeView ? getViewportAnchor(activeView.viewport) : undefined;
    const createdNode = ensureBindingOnCanvas(
      { kind: "item", entityId: created.id },
      true,
      position,
      created.specialKind ? SPECIAL_NODE_DIMENSIONS[created.specialKind] : null,
    );
    const sourceNode = activeView?.nodes.find((node) => node.binding.kind === "item" && node.binding.entityId === sourceItem.id) ?? null;

    if (createdNode && sourceNode && sourceNode.id !== createdNode.id) {
      connectNodes(scopedProjectId, workspaceRoleId, activeLayer, sourceNode.id, createdNode.id);
    }

    setFocusedItemSection(created.specialKind === "markdown" ? "program" : "receive");
  };

  const handleSelectFileViewerSheet = (item: TelemetryItemDefinition, sheetName: string) => {
    if (!scopedProjectId) return;
    const editable = ensureEditableItem(item, { specialKind: "file-viewer" });
    if (!editable) return;
    updateCustomItem(scopedProjectId, editable.id, {
      fileViewer: {
        ...(editable.fileViewer ?? {
          assetId: null,
          viewerType: "document",
          previewState: "ready",
          activeSheet: null,
          currentPage: 1,
        }),
        activeSheet: sheetName,
      },
    });
  };

  const handleBrowserNavigate = (
    item: TelemetryItemDefinition,
    nextUrl: string,
    mode: "push" | "replace" = "push",
  ) => {
    if (!scopedProjectId) return;
    const editable = ensureEditableItem(item, { specialKind: "browser" });
    if (!editable) return;

    const normalizedUrl = normalizeBrowserUrl(nextUrl);
    const currentBrowser = editable.browser ?? {
      url: normalizedUrl,
      history: [normalizedUrl],
      historyIndex: 0,
      title: editable.label,
      loading: false,
      lastHtmlText: "",
      lastError: null,
    };
    const historyBase = currentBrowser.history.slice(0, currentBrowser.historyIndex + 1);
    const nextHistory =
      mode === "replace"
        ? historyBase.length
          ? historyBase.map((entry, index) => (index === historyBase.length - 1 ? normalizedUrl : entry))
          : [normalizedUrl]
        : [...historyBase, normalizedUrl];
    const historyIndex =
      mode === "replace"
        ? Math.max(0, nextHistory.length - 1)
        : nextHistory.length - 1;

    updateCustomItem(scopedProjectId, editable.id, {
      browser: {
        ...currentBrowser,
        url: normalizedUrl,
        history: nextHistory,
        historyIndex,
        title: normalizedUrl,
        loading: true,
        lastError: null,
      },
    });
  };

  const handleBrowserBack = (item: TelemetryItemDefinition) => {
    if (!scopedProjectId) return;
    const editable = ensureEditableItem(item, { specialKind: "browser" });
    const currentBrowser = editable?.browser;
    if (!editable || !currentBrowser || currentBrowser.historyIndex <= 0) return;
    const nextIndex = currentBrowser.historyIndex - 1;
    updateCustomItem(scopedProjectId, editable.id, {
      browser: {
        ...currentBrowser,
        historyIndex: nextIndex,
        url: currentBrowser.history[nextIndex] ?? currentBrowser.url,
        loading: true,
        lastError: null,
      },
    });
  };

  const handleBrowserForward = (item: TelemetryItemDefinition) => {
    if (!scopedProjectId) return;
    const editable = ensureEditableItem(item, { specialKind: "browser" });
    const currentBrowser = editable?.browser;
    if (!editable || !currentBrowser || currentBrowser.historyIndex >= currentBrowser.history.length - 1) return;
    const nextIndex = currentBrowser.historyIndex + 1;
    updateCustomItem(scopedProjectId, editable.id, {
      browser: {
        ...currentBrowser,
        historyIndex: nextIndex,
        url: currentBrowser.history[nextIndex] ?? currentBrowser.url,
        loading: true,
        lastError: null,
      },
    });
  };

  const handleBrowserRefresh = (item: TelemetryItemDefinition) => {
    if (!scopedProjectId) return;
    const editable = ensureEditableItem(item, { specialKind: "browser" });
    if (!editable?.browser) return;
    updateCustomItem(scopedProjectId, editable.id, {
      browser: {
        ...editable.browser,
        loading: true,
        lastError: null,
      },
    });
  };

  const handleBrowserSnapshot = (
    item: TelemetryItemDefinition,
    patch: { title?: string; lastHtmlText?: string; lastError?: string | null; loading?: boolean },
  ) => {
    if (!scopedProjectId) return;
    const editable = ensureEditableItem(item, { specialKind: "browser" });
    if (!editable?.browser) return;
    updateCustomItem(scopedProjectId, editable.id, {
      browser: {
        ...editable.browser,
        ...patch,
      },
    });
  };

  const ensureBindingOnCanvas = (
    binding: WorkspaceNodeBinding,
    _openInspector = true,
    position?: { x: number; y: number } | null,
    size?: { w: number; h: number } | null,
  ) => {
    if (!scopedProjectId) return null;
    const node = ensureNode(scopedProjectId, workspaceRoleId, activeLayer, binding);
    if (!node) return null;
    if (position) {
      moveNode(scopedProjectId, workspaceRoleId, activeLayer, node.id, position.x, position.y);
    }
    if (size) {
      resizeNode(scopedProjectId, workspaceRoleId, activeLayer, node.id, size.w, size.h);
    }
    selectNode(scopedProjectId, workspaceRoleId, activeLayer, node.id);
    setNodeCollapsed(scopedProjectId, workspaceRoleId, activeLayer, node.id, false);
    setFocusedItemSection(null);
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

    selectNode(scopedProjectId, workspaceRoleId, activeLayer, nodeId);
    setNodeCollapsed(scopedProjectId, workspaceRoleId, activeLayer, nodeId, false);
    setInspectorTab(scopedProjectId, workspaceRoleId, "config");
    setFocusedItemSection(section);
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
      connectNodes(scopedProjectId, workspaceRoleId, activeLayer, sourceNode.id, createdNode.id);
    }

    setInspectorTab(scopedProjectId, workspaceRoleId, "config");
    setFocusedItemSection(created.specialKind ? "program" : sourceItem ? "program" : "receive");
  };

  const {
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
  } = useWorkspaceScreenNavigation({
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
    projectsLength: projects.length,
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
  });

  const {
    createViewportAnchoredNode,
    handleCreateNodeFromPrompt,
    handleCanvasComposerKeyDown,
    handleQuickCreateNode,
    handleOpenProgramming,
    handleShareWorkspace,
    handleExportWorkspace,
    handleRunCanvas,
  } = useWorkspaceCanvasOperations({
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
    specialNodeDimensions: SPECIAL_NODE_DIMENSIONS,
    toast,
  });

  const handleRunTerminalCommand = async (item: TelemetryItemDefinition, command: string) => {
    if (!scopedProjectId) return;

    const editable = ensureEditableItem(item);
    if (!editable) return;

    const currentTerminal = editable.terminal ?? item.terminal;
    if (!currentTerminal) return;

    const normalizedCommand = command.trim();
    if (!normalizedCommand) return;
    const previousLiveOutput = currentTerminal.liveOutput ?? "";

    try {
      let terminalSession:
        | {
            id: string;
            shell: NonNullable<typeof currentTerminal.shell>;
            workingDirectory: string;
            status: NonNullable<typeof currentTerminal.sessionStatus>;
            output: string;
            exitCode: number | null;
            cols: number;
            rows: number;
          }
        | null = null;

      if (currentTerminal.sessionId) {
        try {
          terminalSession = await apiClient
            .get<{
              id: string;
              shell: NonNullable<typeof currentTerminal.shell>;
              workingDirectory: string;
              status: NonNullable<typeof currentTerminal.sessionStatus>;
              output: string;
              exitCode: number | null;
              cols: number;
              rows: number;
            }>(`/projects/${scopedProjectId}/terminal/sessions/${currentTerminal.sessionId}`)
            .then((response) => response.data);
        } catch {
          terminalSession = null;
        }
      }

      if (!terminalSession) {
        terminalSession = await apiClient
          .post<{
            id: string;
            shell: NonNullable<typeof currentTerminal.shell>;
            workingDirectory: string;
            status: NonNullable<typeof currentTerminal.sessionStatus>;
            output: string;
            exitCode: number | null;
            cols: number;
            rows: number;
          }>(`/projects/${scopedProjectId}/terminal/sessions`, {
            shell: currentTerminal.shell,
            workingDirectory: currentTerminal.workingDirectory,
            cols: currentTerminal.cols ?? 120,
            rows: currentTerminal.rows ?? 30,
            initialOutput: previousLiveOutput,
          })
          .then((response) => response.data);
      }

      if (!terminalSession) {
        throw new Error("Nao foi possivel abrir uma sessao local de terminal.");
      }

      updateCustomItem(scopedProjectId, editable.id, {
          terminal: {
            ...currentTerminal,
            command: normalizedCommand,
            sessionId: terminalSession.id,
            sessionStatus: "running",
            liveOutput: terminalSession.output || previousLiveOutput,
            workingDirectory: terminalSession.workingDirectory,
            cols: terminalSession.cols ?? currentTerminal.cols ?? 120,
            rows: terminalSession.rows ?? currentTerminal.rows ?? 30,
          },
        });

      const { data } = await apiClient.post<{
        session: {
          id: string;
          shell: NonNullable<typeof currentTerminal.shell>;
          workingDirectory: string;
          status: NonNullable<typeof currentTerminal.sessionStatus>;
          output: string;
          exitCode: number | null;
          cols: number;
          rows: number;
        };
        output: string;
        exitCode: number | null;
        workingDirectory: string;
      }>(`/projects/${scopedProjectId}/terminal/sessions/${terminalSession.id}/commands`, {
        command: normalizedCommand,
      });

        updateCustomItem(scopedProjectId, editable.id, {
          terminal: {
            ...currentTerminal,
            shell: data.session.shell,
            command: normalizedCommand,
            workingDirectory: data.workingDirectory,
            liveOutput: data.session.output || previousLiveOutput,
            sessionId: data.session.id,
            sessionStatus: data.session.status,
            lastExitCode: data.exitCode,
          lastRunAt: new Date().toISOString(),
          cols: data.session.cols ?? currentTerminal.cols ?? 120,
          rows: data.session.rows ?? currentTerminal.rows ?? 30,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao executar comando.";
        updateCustomItem(scopedProjectId, editable.id, {
          terminal: {
            ...currentTerminal,
            command: normalizedCommand,
            sessionStatus: "error",
            lastRunAt: new Date().toISOString(),
            liveOutput: [currentTerminal.liveOutput, `$ ${normalizedCommand}`, message]
              .filter((value) => Boolean(value && value.length))
              .join("\n"),
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

    if (item.id === "builder_file_manager") {
      createViewportAnchoredNode(createSpecialNodeSeed("file-manager"));
      setFocusedItemSection("receive");
      setIsCatalogOpen(false);
      return;
    }

    if (item.id === "builder_browser") {
      createViewportAnchoredNode(createSpecialNodeSeed("browser"));
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
      removeNode(scopedProjectId, workspaceRoleId, activeLayer, nodeId);
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

  const handleSyncTerminalState = (
    item: TelemetryItemDefinition,
    patch: Partial<NonNullable<TelemetryItemDefinition["terminal"]>>,
  ) => {
    if (!scopedProjectId) return;

    const editable = ensureEditableItem(item);
    if (!editable) return;

    const currentTerminal = editable.terminal ?? item.terminal;
    if (!currentTerminal) return;

    const nextTerminal = {
      ...currentTerminal,
      ...patch,
    };

    if (
      nextTerminal.shell === currentTerminal.shell &&
      nextTerminal.command === currentTerminal.command &&
      nextTerminal.workingDirectory === currentTerminal.workingDirectory &&
      nextTerminal.cols === currentTerminal.cols &&
      nextTerminal.rows === currentTerminal.rows &&
      nextTerminal.streamOutput === currentTerminal.streamOutput &&
      nextTerminal.stdinExpression === currentTerminal.stdinExpression &&
      nextTerminal.liveOutput === currentTerminal.liveOutput &&
      nextTerminal.sessionId === currentTerminal.sessionId &&
      nextTerminal.sessionStatus === currentTerminal.sessionStatus &&
      nextTerminal.lastExitCode === currentTerminal.lastExitCode &&
      nextTerminal.lastRunAt === currentTerminal.lastRunAt
    ) {
      return;
    }

    updateCustomItem(scopedProjectId, editable.id, {
      terminal: nextTerminal,
    });
  };

  const handleEditSelectedNode = () => {
    if (!selectedNode) return;

    if (selectedNode.binding.kind === "item") {
      focusItemSection(selectedNode.id, "program");
      return;
    }

    if (!scopedProjectId) return;
    setInspectorTab(scopedProjectId, workspaceRoleId, "config");
  };

  const handleOpenSelectedNodeData = () => {
    if (!selectedNode || !scopedProjectId) return;
    setInspectorTab(scopedProjectId, workspaceRoleId, "data");

    if (selectedNode.binding.kind === "item") {
      focusItemSection(selectedNode.id, "receive", { inputEnabled: true });
    }
  };

  const handleOpenSelectedNodeActions = () => {
    if (!selectedNode || !scopedProjectId) return;
    setInspectorTab(scopedProjectId, workspaceRoleId, "actions");

    if (selectedNode.binding.kind === "item") {
      focusItemSection(selectedNode.id, "send", { actionEnabled: true });
    }
  };

  const handleRemoveSelectedNode = () => {
    if (!selectedNode || !scopedProjectId) return;
    removeNode(scopedProjectId, workspaceRoleId, activeLayer, selectedNode.id);
  };

  const sceneView = useMemo<WorkspaceView>(
    () =>
      activeView ?? {
        id: "workspace_loading_view",
        name: "Workspace",
        roleId: workspaceRoleId,
        source: "preset",
        template: "workspace",
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        createdAt: "",
        updatedAt: "",
      },
    [activeView, workspaceRoleId],
  );
  const canvasLoading =
    (data.projectsQuery.isLoading || !definition || !activeView || data.isBootstrapping) &&
    sceneView.nodes.length === 0;

  const workspaceChrome = (
    <WorkspaceCanvasChrome
      hasProjectAlternatives={hasProjectAlternatives}
      hasWorkspaceAlternatives={hasWorkspaceAlternatives}
      isProjectSwitcherOpen={isProjectSwitcherOpen}
      isWorkspaceSwitcherOpen={isWorkspaceSwitcherOpen}
      isProjectMetaEditing={isProjectMetaEditing}
      isProjectCreating={isProjectCreating}
      selectedNode={selectedNode}
      selectedPresentation={selectedPresentation}
      canvasInteractionMode={canvasInteractionMode}
      projectDraftName={projectDraftName}
      projectDraftDescription={projectDraftDescription}
      activeProjectName={activeProject?.name ?? "Projeto no canvas"}
      projectSubtitle={projectSubtitle}
      activeViewName={activeView?.name ?? "Workspace"}
      activeViewsCount={activeViews.length}
      activeViewNodesCount={activeView?.nodes.length ?? 0}
      projectItems={projects
        .filter((project) => project.id !== scopedProjectId)
        .map((project) => ({
          id: project.id,
          label: project.name,
          description: project.slug,
        }))}
      workspaceItems={activeViews
        .filter((view) => view.id !== activeViewId)
        .map((view) => ({
          id: view.id,
          label: view.name,
          description: `${view.nodes.length} nodes`,
        }))}
      criticalAlerts={criticalAlerts}
      zoomPercent={Math.round((activeView?.viewport.zoom ?? 1) * 100)}
      projectNameInputRef={projectNameInputRef}
      onProjectMetaBlur={handleProjectMetaBlur}
      onProjectNameChange={setProjectDraftName}
      onProjectDescriptionChange={setProjectDraftDescription}
      onProjectMetaKeyDown={handleProjectMetaKeyDown}
      onStartProjectMetaEditing={handleStartProjectMetaEditing}
      onToggleProjectSwitcher={handleToggleProjectSwitcher}
      onSelectProject={handleSelectProject}
      onCloseProjectSwitcher={() => setIsProjectSwitcherOpen(false)}
      onCreateProject={() => {
        void handleCreateProject();
      }}
      onRunCanvas={handleRunCanvas}
      onExportWorkspace={handleExportWorkspace}
      onShareWorkspace={handleShareWorkspace}
      onEditSelectedNode={handleEditSelectedNode}
      onOpenSelectedNodeData={handleOpenSelectedNodeData}
      onOpenSelectedNodeActions={handleOpenSelectedNodeActions}
      onRemoveSelectedNode={handleRemoveSelectedNode}
      onClearSelectedNodeFocus={handleClearSelection}
      onToggleWorkspaceSwitcher={handleToggleWorkspaceSwitcher}
      onSelectWorkspaceView={handleSelectWorkspaceView}
      onCloseWorkspaceSwitcher={() => setIsWorkspaceSwitcherOpen(false)}
      onCreateWorkspaceTab={handleCreateWorkspaceTab}
      onSetSelectMode={() => setCanvasInteractionMode("select")}
      onOpenCommand={() => setIsCommandOpen(true)}
      onOpenProgramming={handleOpenProgramming}
      onSetPanMode={() => setCanvasInteractionMode("pan")}
      onOpenCatalog={() => setIsCatalogOpen(true)}
      onRestorePreset={handleRestorePreset}
      assistantPrompt={assistantPrompt}
      onAssistantPromptChange={setAssistantPrompt}
      onAssistantPromptKeyDown={handleCanvasComposerKeyDown}
      onSubmitPrompt={handleCreateNodeFromPrompt}
      onQuickCreateNode={handleQuickCreateNode}
    />
  );

  return (
    <>
      <WorkspaceCanvasScene
          view={sceneView}
          edges={activeView ? canvasEdges : []}
          selectedNodeId={activeView ? selectedNodeId : null}
          presentationsByNodeId={activeView ? presentationsByNodeId : {}}
          itemsById={itemsById}
          fileAssetsById={assetsById}
          projectAssets={assets}
          interactionMode={canvasInteractionMode}
          onSelectNode={handleSelectNode}
          onMoveNode={(nodeId, x, y) => moveNode(scopedProjectId, workspaceRoleId, activeLayer, nodeId, x, y)}
          onResizeNode={(nodeId, w, h) => resizeNode(scopedProjectId, workspaceRoleId, activeLayer, nodeId, w, h)}
          onSetViewport={(viewport) => setViewport(scopedProjectId, workspaceRoleId, activeLayer, viewport)}
          onClearSelection={handleClearSelection}
          onConnectNodes={(sourceNodeId, targetNodeId) => {
            connectNodes(scopedProjectId, workspaceRoleId, activeLayer, sourceNodeId, targetNodeId);
          }}
          onCreateItem={createCanvasItem}
          onSyncTerminalState={handleSyncTerminalState}
          onUploadFilesToItem={handleUploadFilesToNode}
          onSelectFileManagerAsset={handleSelectFileManagerAsset}
          onRenameFileAsset={handleRenameFileAsset}
          onDeleteFileAsset={handleDeleteFileAsset}
          onOpenAssetAsNode={handleOpenAssetAsNode}
          onSelectFileViewerSheet={handleSelectFileViewerSheet}
          onBrowserNavigate={handleBrowserNavigate}
          onBrowserBack={handleBrowserBack}
          onBrowserForward={handleBrowserForward}
          onBrowserRefresh={handleBrowserRefresh}
          onBrowserSnapshot={handleBrowserSnapshot}
          onConfigureItem={focusItemSection}
          onRemoveNode={(nodeId) => removeNode(scopedProjectId, workspaceRoleId, activeLayer, nodeId)}
          onDisconnectEdge={(edgeId) => disconnectEdge(scopedProjectId, workspaceRoleId, activeLayer, edgeId)}
          loading={canvasLoading}
          chrome={workspaceChrome}
        />

      <PluginCatalogDialog
        open={isCatalogOpen}
        onOpenChange={setIsCatalogOpen}
        items={catalogItems}
        installedBindings={installedBindings}
        presentationByBindingKey={catalogPresentationByBindingKey}
        onSelectItem={handleSelectCatalogItem}
      />

      <WorkspaceCommandMenu
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        installedNodes={installedNodesForCommand}
        catalogItems={catalogItems}
        currentLayer={activeLayer}
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

    </>
  );
}













