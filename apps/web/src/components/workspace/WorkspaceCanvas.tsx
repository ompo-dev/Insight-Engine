import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Activity, Blocks, BrainCircuit, FileText, FolderOpen, Globe, Minus, Plus, ScanSearch, TableProperties, Terminal, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { WorkspacePluginCard } from "@/components/workspace/WorkspacePluginCard";
import type { CreateCustomTelemetryItemInput, TelemetryItemDefinition } from "@/lib/telemetry/items";
import type { WorkspaceFileAsset } from "@/lib/workspace/file-assets";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasViewport,
  WorkspaceItemEditorSection,
  WorkspaceNodeBinding,
  WorkspaceNodePresentation,
  WorkspaceView,
} from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

const SCENE_SIZE = 12000;
const GRID_SIZE = 24;
const CLICK_SLOP = 2;
const DRAG_THRESHOLD = 3;
const SNAP_THRESHOLD = 18;
const MINIMAP_WIDTH = 210;
const MINIMAP_HEIGHT = 112;
const MIN_NODE_WIDTH = 260;
const MIN_NODE_HEIGHT = 148;
const TERMINAL_NODE_SIZE = { w: 1040, h: 720 } as const;
const MIN_CANVAS_ZOOM = 0.1;
const MAX_CANVAS_ZOOM = 9.99;
const ZOOM_FACTOR = 1.12;
const MESH_GLYPH = ".";
const MESH_BASE_FONT_SIZE = 11;
const MESH_HOVER_RADIUS = 104;
const MESH_CLICK_DURATION = 560;
const MESH_LOADING_CYCLE_MS = 4800;
const COLLAPSED_SIZE_BY_VARIANT = {
  card: { w: 252, h: 104 },
  chart: { w: 560, h: 332 },
  table: { w: 1180, h: 720 },
  comparison: { w: 252, h: 104 },
  text: { w: 252, h: 104 },
  terminal: TERMINAL_NODE_SIZE,
  markdown: { w: 520, h: 344 },
  ai: { w: 420, h: 272 },
  "file-manager": { w: 560, h: 380 },
  "file-viewer": { w: 760, h: 520 },
  browser: { w: 760, h: 520 },
} as const;

const EXPANDED_ITEM_SIZE_BY_VARIANT = {
  card: { w: 360, h: 216 },
  chart: { w: 584, h: 348 },
  table: { w: 1240, h: 760 },
  comparison: { w: 380, h: 232 },
  text: { w: 380, h: 224 },
  terminal: TERMINAL_NODE_SIZE,
  markdown: { w: 520, h: 344 },
  ai: { w: 420, h: 272 },
  "file-manager": { w: 560, h: 380 },
  "file-viewer": { w: 760, h: 520 },
  browser: { w: 760, h: 520 },
} as const;

const EXPANDED_SIZE_BY_KIND: Record<CanvasNode["binding"]["kind"], { w: number; h: number }> = {
  plugin: { w: 404, h: 264 },
  item: { w: 436, h: 284 },
  agent: { w: 384, h: 252 },
};
const CANVAS_CREATE_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  icon: typeof Blocks;
  seed?: CreateCustomTelemetryItemInput;
}> = [
  {
    id: "default",
    label: "Node",
    description: "Node programavel para receive, program e send.",
    icon: Blocks,
    seed: {
      label: "Node",
      description: "Node programavel para compor entradas, logica e envios.",
      tags: ["node", "logic"],
      expression: "result = null",
    },
  },
  {
    id: "table",
    label: "Tabela",
    description: "Node visual para dataset e operacao em grade.",
    icon: TableProperties,
    seed: {
      label: "Tabela",
      description: "Node visual de tabela no canvas.",
      tags: ["table", "dataset"],
      displayEnabled: true,
      presentation: "table",
      resultType: "dataset",
      expression: "result = []",
    },
  },
  {
    id: "chart",
    label: "Grafico",
    description: "Node visual para serie e tendencia.",
    icon: Activity,
    seed: {
      label: "Grafico",
      description: "Node visual de grafico no canvas.",
      tags: ["chart", "series"],
      displayEnabled: true,
      presentation: "line",
      resultType: "dataset",
      expression: "result = []",
    },
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Sessao shell com relay de stdout e stdin.",
    icon: Terminal,
    seed: {
      label: "Terminal Node",
      description: "Sessao shell conectada ao canvas para receber contexto e retransmitir output.",
      tags: ["terminal", "shell", "runtime"],
      specialKind: "terminal",
    },
  },
  {
    id: "markdown",
    label: "Markdown",
    description: "Documento com preview e entrega para o fluxo.",
    icon: FileText,
    seed: {
      label: "Markdown Report",
      description: "Documento markdown com preview integrado no canvas.",
      tags: ["markdown", "report", "document"],
      specialKind: "markdown",
    },
  },
  {
    id: "ai",
    label: "IA",
    description: "Provider, modelo e resposta autonoma no fluxo.",
    icon: BrainCircuit,
    seed: {
      label: "Assistente IA",
      description: "Node de IA conectado ao fluxo para leitura, analise e automacao.",
      tags: ["ai", "llm", "automation"],
      specialKind: "ai",
      actionEnabled: true,
      actionType: "ai-trigger",
    },
  },
  {
    id: "file-manager",
    label: "File Manager",
    description: "Upload local, preview interno e abertura de arquivos como nodes.",
    icon: FolderOpen,
    seed: {
      label: "File Manager",
      description: "Inventario local de arquivos do projeto no canvas.",
      tags: ["files", "upload", "preview"],
      specialKind: "file-manager",
    },
  },
  {
    id: "browser",
    label: "Browser",
    description: "URL, historico e leitura web basica no proprio canvas.",
    icon: Globe,
    seed: {
      label: "Browser Node",
      description: "Browser simples embutido para navegar e repassar contexto.",
      tags: ["browser", "web", "navigation"],
      specialKind: "browser",
    },
  },
] as const;

type ScenePoint = { x: number; y: number };
type PortSide = "left" | "right";

type InteractionState =
  | {
      type: "move";
      nodeId: string;
      startClientX: number;
      startClientY: number;
      armedAt: number;
      originX: number;
      originY: number;
      previewX: number;
      previewY: number;
      activated: boolean;
      travelDistance: number;
    }
  | {
      type: "resize";
      nodeId: string;
      startClientX: number;
      startClientY: number;
      originW: number;
      originH: number;
      previewW: number;
      previewH: number;
    }
  | {
      type: "pan";
      startClientX: number;
      startClientY: number;
      originX: number;
      originY: number;
      previewX: number;
      previewY: number;
      activated: boolean;
    }
  | {
      type: "select";
      startClientX: number;
      startClientY: number;
      currentClientX: number;
      currentClientY: number;
      startOffsetX: number;
      startOffsetY: number;
      currentOffsetX: number;
      currentOffsetY: number;
      startSceneX: number;
      startSceneY: number;
      currentSceneX: number;
      currentSceneY: number;
      activated: boolean;
    };

type PortConnectionState = {
  sourceNodeId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  hoveredTargetId: string | null;
};

type MeshPointerState = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  intensity: number;
  initialized: boolean;
  inside: boolean;
};

type MeshRipple = {
  x: number;
  y: number;
  startedAt: number;
  duration: number;
  strength: number;
};

type MeshNodeInfluence = {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  weight: number;
};

interface WorkspaceCanvasProps {
  view: WorkspaceView;
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  presentationsByNodeId: Record<string, WorkspaceNodePresentation>;
  itemsById: Record<string, TelemetryItemDefinition>;
  fileAssetsById: Record<string, WorkspaceFileAsset>;
  projectAssets: WorkspaceFileAsset[];
  chrome?: "classic" | "immersive";
  loading?: boolean;
  interactionMode?: "select" | "pan";
  onSelectNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onResizeNode: (nodeId: string, w: number, h: number) => void;
  onSetViewport: (viewport: Partial<CanvasViewport>) => void;
  onClearSelection: () => void;
  onConnectNodes: (sourceNodeId: string, targetNodeId: string) => void;
  onCreateItem: (position?: ScenePoint, sourceBinding?: WorkspaceNodeBinding | null, seed?: CreateCustomTelemetryItemInput) => void;
  onSyncTerminalState?: (
    item: TelemetryItemDefinition,
    patch: Partial<NonNullable<TelemetryItemDefinition["terminal"]>>,
  ) => void;
  onUploadFilesToItem?: (item: TelemetryItemDefinition, files: File[]) => Promise<void> | void;
  onSelectFileManagerAsset?: (item: TelemetryItemDefinition, assetId: string) => void;
  onRenameFileAsset?: (assetId: string, name: string) => Promise<void> | void;
  onDeleteFileAsset?: (assetId: string) => Promise<void> | void;
  onOpenAssetAsNode?: (item: TelemetryItemDefinition, assetId: string) => void;
  onSelectFileViewerSheet?: (item: TelemetryItemDefinition, sheetName: string) => void;
  onBrowserNavigate?: (item: TelemetryItemDefinition, url: string, mode?: "push" | "replace") => void;
  onBrowserBack?: (item: TelemetryItemDefinition) => void;
  onBrowserForward?: (item: TelemetryItemDefinition) => void;
  onBrowserRefresh?: (item: TelemetryItemDefinition) => void;
  onBrowserSnapshot?: (
    item: TelemetryItemDefinition,
    patch: { title?: string; lastHtmlText?: string; lastError?: string | null; loading?: boolean },
  ) => void;
  onConfigureItem: (nodeId: string, section: WorkspaceItemEditorSection, patch?: { inputEnabled?: boolean; actionEnabled?: boolean }) => void;
  onRemoveNode: (nodeId: string) => void;
  onDisconnectEdge: (edgeId: string) => void;
}

export function WorkspaceCanvas({
  view,
  edges,
  selectedNodeId,
  presentationsByNodeId,
  itemsById,
  fileAssetsById,
  projectAssets,
  chrome = "classic",
  loading = false,
  interactionMode = "select",
  onSelectNode,
  onMoveNode,
  onResizeNode,
  onSetViewport,
  onClearSelection,
  onConnectNodes,
  onCreateItem,
  onSyncTerminalState,
  onUploadFilesToItem,
  onSelectFileManagerAsset,
  onRenameFileAsset,
  onDeleteFileAsset,
  onOpenAssetAsNode,
  onSelectFileViewerSheet,
  onBrowserNavigate,
  onBrowserBack,
  onBrowserForward,
  onBrowserRefresh,
  onBrowserSnapshot,
  onConfigureItem,
  onRemoveNode,
  onDisconnectEdge,
}: WorkspaceCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [canvasContextPosition, setCanvasContextPosition] = useState<ScenePoint>({ x: 120, y: 80 });
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [canvasMenuState, setCanvasMenuState] = useState<{ left: number; top: number; clientX: number; clientY: number } | null>(null);
  const [canvasSubmenu, setCanvasSubmenu] = useState<"create" | null>(null);
  const [edgeMenuState, setEdgeMenuState] = useState<{ edgeId: string; left: number; top: number } | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [portConnection, setPortConnection] = useState<PortConnectionState | null>(null);
  const suppressContextMenuRef = useRef(false);
  const meshCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const meshPointerRef = useRef<MeshPointerState>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    intensity: 0,
    initialized: false,
    inside: false,
  });
  const meshRipplesRef = useRef<MeshRipple[]>([]);
  const canvasMenuRef = useRef<HTMLDivElement | null>(null);
  const edgeMenuRef = useRef<HTMLDivElement | null>(null);
  const portConnectionRef = useRef<PortConnectionState | null>(null);
  const immersive = chrome === "immersive";
  const selectSingleNodeId = useCallback((nodeId: string) => {
    setSelectedNodeIds((current) =>
      current.length === 1 && current[0] === nodeId ? current : [nodeId],
    );
  }, []);
  const clearSelectedNodeIds = useCallback(() => {
    setSelectedNodeIds((current) => (current.length ? [] : current));
  }, []);
  const updateMeshPointerFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!immersive) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const nextX = clientX - rect.left;
      const nextY = clientY - rect.top;
      const clampedX = clampNumber(nextX, 0, rect.width);
      const clampedY = clampNumber(nextY, 0, rect.height);
      const inside = nextX >= 0 && nextX <= rect.width && nextY >= 0 && nextY <= rect.height;
      const pointer = meshPointerRef.current;
      if (!pointer.initialized) {
        pointer.x = clampedX;
        pointer.y = clampedY;
        pointer.initialized = true;
      }

      pointer.targetX = clampedX;
      pointer.targetY = clampedY;
      pointer.inside = inside;
    },
    [immersive],
  );

  const releaseMeshPointer = useCallback(() => {
    meshPointerRef.current.inside = false;
  }, []);

  const spawnMeshRipple = useCallback(
    (clientX: number, clientY: number, strength = 1) => {
      if (!immersive) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const nextRipple = {
        x: clientX - rect.left,
        y: clientY - rect.top,
        startedAt: performance.now(),
        duration: MESH_CLICK_DURATION,
        strength,
      } satisfies MeshRipple;

      meshRipplesRef.current = [...meshRipplesRef.current.slice(-5), nextRipple];
    },
    [immersive],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (!edgeMenuState) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && edgeMenuRef.current?.contains(target)) return;
      setEdgeMenuState(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEdgeMenuState(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [edgeMenuState]);

  const renderedNodes = useMemo(() => {
    return view.nodes.map((node) => {
      const presentation = presentationsByNodeId[node.id];
      const displayOnly = isDisplayOnlyNodePresentation(presentation, node.binding.kind);
      const expanded = displayOnly;
      const expandedSize = getExpandedNodeSize(node, presentation);
      const collapsedSize = getCollapsedNodeSize(node, presentation);
      const baseNode = expanded
        ? {
            ...node,
            w: normalizeDisplayNodeSize(node.w, expandedSize.w, "w"),
            h: normalizeDisplayNodeSize(node.h, expandedSize.h, "h"),
          }
        : {
            ...node,
            w: collapsedSize.w,
            h: collapsedSize.h,
          };

      if (interaction?.type === "move" && interaction.nodeId === node.id) {
        return { ...baseNode, x: interaction.previewX, y: interaction.previewY };
      }

      if (interaction?.type === "resize" && interaction.nodeId === node.id) {
        return { ...baseNode, w: interaction.previewW, h: interaction.previewH };
      }

      return baseNode;
    });
  }, [interaction, presentationsByNodeId, view.nodes]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-workspace-surface='true']") && !event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const rect = element.getBoundingClientRect();
      const viewport = view.viewport;

      if (event.ctrlKey || event.metaKey) {
        const nextZoom = clampZoom(viewport.zoom * Math.exp(-event.deltaY * 0.0015));
        const originX = (event.clientX - rect.left - viewport.x) / viewport.zoom;
        const originY = (event.clientY - rect.top - viewport.y) / viewport.zoom;
        const nextX = event.clientX - rect.left - originX * nextZoom;
        const nextY = event.clientY - rect.top - originY * nextZoom;
        onSetViewport({ x: nextX, y: nextY, zoom: nextZoom });
        return;
      }

      onSetViewport({
        x: viewport.x - event.deltaX,
        y: viewport.y - event.deltaY,
      });
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [onSetViewport, view.viewport]);

  useEffect(() => {
    if (!interaction) return;

    const handlePointerMove = (event: PointerEvent) => {
      updateMeshPointerFromClient(event.clientX, event.clientY);

      if (interaction.type === "resize") {
        const deltaX = (event.clientX - interaction.startClientX) / view.viewport.zoom;
        const deltaY = (event.clientY - interaction.startClientY) / view.viewport.zoom;
        setInteraction({
          ...interaction,
          previewW: clampNodeSize(interaction.originW + deltaX, "w"),
          previewH: clampNodeSize(interaction.originH + deltaY, "h"),
        });
        return;
      }

      if (interaction.type === "select") {
        const nextScenePoint = scenePointFromClient(event.clientX, event.clientY);
        const distance = Math.hypot(event.clientX - interaction.startClientX, event.clientY - interaction.startClientY);
        setInteraction({
          ...interaction,
          activated: interaction.activated || distance >= DRAG_THRESHOLD,
          currentClientX: event.clientX,
          currentClientY: event.clientY,
          currentOffsetX: event.clientX - (containerRef.current?.getBoundingClientRect().left ?? 0),
          currentOffsetY: event.clientY - (containerRef.current?.getBoundingClientRect().top ?? 0),
          currentSceneX: nextScenePoint.x,
          currentSceneY: nextScenePoint.y,
        });
        return;
      }

      const deltaClientX = event.clientX - interaction.startClientX;
      const deltaClientY = event.clientY - interaction.startClientY;
      const distance = Math.hypot(deltaClientX, deltaClientY);
      const activated = interaction.activated || distance >= DRAG_THRESHOLD;

      if (interaction.type === "move") {
        const moveActivated = interaction.activated || distance >= DRAG_THRESHOLD;
        const deltaX = moveActivated ? deltaClientX / view.viewport.zoom : 0;
        const deltaY = moveActivated ? deltaClientY / view.viewport.zoom : 0;
        setInteraction({
          ...interaction,
          activated: moveActivated,
          travelDistance: Math.max(interaction.travelDistance, distance),
          previewX: interaction.originX + deltaX,
          previewY: interaction.originY + deltaY,
        });
        return;
      }

      setInteraction({
        ...interaction,
        activated,
        previewX: interaction.originX + (activated ? deltaClientX : 0),
        previewY: interaction.originY + (activated ? deltaClientY : 0),
      });
    };

    const handlePointerUp = () => {
      if (interaction.type === "move") {
        const treatedAsDrag = interaction.activated || interaction.travelDistance >= DRAG_THRESHOLD;
        const treatedAsClick = !treatedAsDrag && interaction.travelDistance <= CLICK_SLOP;

        if (treatedAsDrag) {
          const snappedPosition = getSmartSnappedPosition(
            interaction.nodeId,
            interaction.previewX,
            interaction.previewY,
            renderedNodes,
          );
          onMoveNode(interaction.nodeId, snappedPosition.x, snappedPosition.y);
          selectSingleNodeId(interaction.nodeId);
          if (selectedNodeId && selectedNodeId !== interaction.nodeId) {
            onClearSelection();
          }
        } else if (treatedAsClick) {
          onSelectNode(interaction.nodeId);
          selectSingleNodeId(interaction.nodeId);
        }
      }

      if (interaction.type === "resize") {
        onResizeNode(interaction.nodeId, snapToGrid(interaction.previewW), snapToGrid(interaction.previewH));
      }

      if (interaction.type === "pan" && interaction.activated) {
        onSetViewport({ x: interaction.previewX, y: interaction.previewY });
      }

      if (interaction.type === "select") {
        if (interaction.activated) {
          const ids = getNodesInSceneRectangle(renderedNodes, {
            x1: interaction.startSceneX,
            y1: interaction.startSceneY,
            x2: interaction.currentSceneX,
            y2: interaction.currentSceneY,
          });
          setSelectedNodeIds((current) => {
            if (
              current.length === ids.length &&
              current.every((value, index) => value === ids[index])
            ) {
              return current;
            }

            return ids;
          });
          if (ids.length) {
            onSelectNode(ids[0]);
          } else {
            onClearSelection();
          }
          suppressContextMenuRef.current = true;
        }
      }

      setInteraction(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [interaction, onClearSelection, onMoveNode, onResizeNode, onSelectNode, onSetViewport, renderedNodes, selectSingleNodeId, selectedNodeId, updateMeshPointerFromClient, view.viewport.zoom]);

  const viewport =
    interaction?.type === "pan"
      ? { ...view.viewport, x: interaction.previewX, y: interaction.previewY }
      : view.viewport;
  const meshViewportRef = useRef(viewport);
  const meshNodesRef = useRef(renderedNodes);
  const meshContainerSizeRef = useRef(containerSize);
  const meshLoadingRef = useRef(loading);

  useEffect(() => {
    meshViewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    meshNodesRef.current = renderedNodes;
  }, [renderedNodes]);

  useEffect(() => {
    meshContainerSizeRef.current = containerSize;
  }, [containerSize]);

  useEffect(() => {
    meshLoadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || target.closest('[role="textbox"]'))) {
        return;
      }

      const ids = selectedNodeIds.length ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
      if (!ids.length) return;

      event.preventDefault();
      ids.forEach((nodeId) => onRemoveNode(nodeId));
      clearSelectedNodeIds();
      onClearSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearSelectedNodeIds, onClearSelection, onRemoveNode, selectedNodeId, selectedNodeIds]);

  const selectionSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  const nodeMap = useMemo(
    () => Object.fromEntries(renderedNodes.map((node) => [node.id, node])) as Record<string, CanvasNode>,
    [renderedNodes],
  );


  const selectedNode = renderedNodes.find((node) => node.id === selectedNodeId) ?? null;
  const nodeBounds = useMemo(() => getNodeBounds(renderedNodes), [renderedNodes]);
  const minimapBounds = useMemo(() => expandBounds(nodeBounds, 220), [nodeBounds]);
  const visibleViewport = getVisibleViewport(containerSize.width, containerSize.height, viewport);
  const minimapScale = Math.min(
    (MINIMAP_WIDTH - 8) / Math.max(minimapBounds.width, 1),
    (MINIMAP_HEIGHT - 8) / Math.max(minimapBounds.height, 1),
  );
  const minimapContentWidth = minimapBounds.width * minimapScale;
  const minimapContentHeight = minimapBounds.height * minimapScale;
  const minimapOffsetX = (MINIMAP_WIDTH - minimapContentWidth) / 2;
  const minimapOffsetY = (MINIMAP_HEIGHT - minimapContentHeight) / 2;
  const minimapViewport = getMinimapViewportFrame(
    visibleViewport,
    minimapBounds,
    minimapScale,
    minimapOffsetX,
    minimapOffsetY,
    minimapContentWidth,
    minimapContentHeight,
  );

  const scenePointFromClient = (clientX: number, clientY: number): ScenePoint => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 120, y: 80 };

    return {
      x: snapToGrid((clientX - rect.left - viewport.x) / viewport.zoom),
      y: snapToGrid((clientY - rect.top - viewport.y) / viewport.zoom),
    };
  };

  const getPortScenePoint = (node: CanvasNode, side: PortSide): ScenePoint => ({
    x: side === "left" ? node.x : node.x + node.w,
    y: node.y + node.h / 2,
  });

  const findConnectionTargetNodeId = (sceneX: number, sceneY: number, sourceNodeId: string) => {
    let bestTargetId: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    renderedNodes.forEach((node) => {
      if (node.id === sourceNodeId) return;
      const paddedBounds = {
        left: node.x - 20,
        right: node.x + node.w + 20,
        top: node.y - 16,
        bottom: node.y + node.h + 16,
      };
      const insideTarget =
        sceneX >= paddedBounds.left &&
        sceneX <= paddedBounds.right &&
        sceneY >= paddedBounds.top &&
        sceneY <= paddedBounds.bottom;

      if (!insideTarget) return;

      const centerX = node.x + node.w / 2;
      const centerY = node.y + node.h / 2;
      const distance = Math.hypot(sceneX - centerX, sceneY - centerY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestTargetId = node.id;
      }
    });

    return bestTargetId;
  };

  const beginPortConnection = (
    event: ReactPointerEvent<HTMLButtonElement>,
    nodeId: string,
  ) => {
    const node = renderedNodes.find((entry) => entry.id === nodeId);
    if (!node) return;
    const start = getPortScenePoint(node, "right");
    const pointer = scenePointFromClient(event.clientX, event.clientY);
    const nextState = {
      sourceNodeId: nodeId,
      startX: start.x,
      startY: start.y,
      currentX: pointer.x,
      currentY: pointer.y,
      hoveredTargetId: null,
    } satisfies PortConnectionState;
    portConnectionRef.current = nextState;
    setPortConnection(nextState);
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    updateMeshPointerFromClient(event.clientX, event.clientY);
    if (event.button === 0) {
      spawnMeshRipple(event.clientX, event.clientY);
    }

    const target = event.target as HTMLElement;
    const nodeElement = target.closest("[data-workspace-node-id]") as HTMLElement | null;
    const edgeElement = target.closest("[data-workspace-edge-hit='true']") as HTMLElement | null;
    const clickedControl = isInteractiveCanvasControl(target);

    if (edgeElement) {
      return;
    }

    if (clickedControl && nodeElement?.dataset.workspaceNodeId && event.button === 0) {
      return;
    }

    if (clickedControl) {
      return;
    }

    if (event.button === 0 && portConnectionRef.current?.sourceNodeId) {
      event.preventDefault();
      const activeConnection = portConnectionRef.current;
      const targetNodeId = nodeElement?.dataset.workspaceNodeId ?? null;

      if (targetNodeId && targetNodeId !== activeConnection.sourceNodeId) {
        onConnectNodes(activeConnection.sourceNodeId, targetNodeId);
      }

      portConnectionRef.current = null;
      setPortConnection(null);
      return;
    }

    if (event.button === 1) {
      event.preventDefault();
      setInteraction({
        type: "pan",
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: viewport.x,
        originY: viewport.y,
        previewX: viewport.x,
        previewY: viewport.y,
        activated: false,
      });
      return;
    }

    if (event.button === 2 && !nodeElement) {
      const rect = containerRef.current?.getBoundingClientRect();
      const startScenePoint = scenePointFromClient(event.clientX, event.clientY);
      const offsetX = event.clientX - (rect?.left ?? 0);
      const offsetY = event.clientY - (rect?.top ?? 0);
      setInteraction({
        type: "select",
        startClientX: event.clientX,
        startClientY: event.clientY,
        currentClientX: event.clientX,
        currentClientY: event.clientY,
        startOffsetX: offsetX,
        startOffsetY: offsetY,
        currentOffsetX: offsetX,
        currentOffsetY: offsetY,
        startSceneX: startScenePoint.x,
        startSceneY: startScenePoint.y,
        currentSceneX: startScenePoint.x,
        currentSceneY: startScenePoint.y,
        activated: false,
      });
      return;
    }

    if (event.button !== 0) return;

    if (interactionMode === "pan") {
      event.preventDefault();
      setInteraction({
        type: "pan",
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: viewport.x,
        originY: viewport.y,
        previewX: viewport.x,
        previewY: viewport.y,
        activated: false,
      });
      return;
    }

    if (nodeElement?.dataset.workspaceNodeId) {
      const node = view.nodes.find((item) => item.id === nodeElement.dataset.workspaceNodeId);
      if (!node) return;
      event.preventDefault();

      setInteraction({
        type: "move",
        nodeId: node.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        armedAt: performance.now(),
        originX: node.x,
        originY: node.y,
        previewX: node.x,
        previewY: node.y,
        activated: false,
        travelDistance: 0,
      });
      return;
    }

    clearSelectedNodeIds();
    onClearSelection();
    portConnectionRef.current = null;
    setPortConnection(null);
  };

  useEffect(() => {
    if (!portConnection?.sourceNodeId) return;

    const handlePointerMove = (event: PointerEvent) => {
      const scenePoint = scenePointFromClient(event.clientX, event.clientY);
      const current = portConnectionRef.current;
      if (!current) return;
      const nextState = {
        ...current,
        currentX: scenePoint.x,
        currentY: scenePoint.y,
        hoveredTargetId: findConnectionTargetNodeId(scenePoint.x, scenePoint.y, current.sourceNodeId),
      } satisfies PortConnectionState;
      portConnectionRef.current = nextState;
      setPortConnection(nextState);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        portConnectionRef.current = null;
        setPortConnection(null);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [portConnection?.sourceNodeId, renderedNodes]);

  const handleCanvasContextMenuCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressContextMenuRef.current) {
      event.preventDefault();
      suppressContextMenuRef.current = false;
      return;
    }

    const target = event.target as HTMLElement;
    if (edgeMenuRef.current?.contains(target)) {
      return;
    }
    if (target.closest("[data-workspace-edge-hit='true']")) return;
    if (target.closest("[data-workspace-node-id]")) return;

    const scenePoint = scenePointFromClient(event.clientX, event.clientY);
    setEdgeMenuState(null);
    setCanvasContextPosition(scenePoint);
  };


  const handleZoom = (direction: "out" | "in") => {
    const factor = direction === "in" ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    onSetViewport({ zoom: clampZoom(viewport.zoom * factor) });
  };

  const handleFitView = () => {
    if (!containerSize.width || !containerSize.height || !renderedNodes.length) return;
    const bounds = expandBounds(nodeBounds, 96);
    const nextZoom = clampZoom(
      Math.min(
        (containerSize.width - 48) / Math.max(bounds.width, 1),
        (containerSize.height - 48) / Math.max(bounds.height, 1),
        1.1,
      ),
    );

    onSetViewport({
      zoom: nextZoom,
      x: (containerSize.width - bounds.width * nextZoom) / 2 - bounds.minX * nextZoom,
      y: (containerSize.height - bounds.height * nextZoom) / 2 - bounds.minY * nextZoom,
    });
  };

  const handleResetView = () => {
    onSetViewport({ x: 0, y: 0, zoom: 1 });
  };

  const handleCanvasCreate = (seed?: CreateCustomTelemetryItemInput) => {
    onCreateItem(canvasContextPosition, null, seed);
  };

  const getSuggestedPlacement = (node: CanvasNode): ScenePoint => ({
    x: snapToGrid(node.x + Math.max(node.w, 320) + 48),
    y: snapToGrid(node.y),
  });

  useEffect(() => {
    if (!immersive) return;

    let frameId = 0;
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const drawMesh = (timestamp: number) => {
      const canvas = meshCanvasRef.current;
      const { width, height } = meshContainerSizeRef.current;
      if (!canvas || width <= 0 || height <= 0) {
        frameId = window.requestAnimationFrame(drawMesh);
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        frameId = window.requestAnimationFrame(drawMesh);
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      const scaledWidth = Math.max(1, Math.round(width * devicePixelRatio));
      const scaledHeight = Math.max(1, Math.round(height * devicePixelRatio));
      if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.textAlign = "center";
      context.textBaseline = "middle";

      const reducedMotion = reducedMotionQuery.matches;
      const pointer = meshPointerRef.current;
      pointer.intensity += ((pointer.inside ? 1 : 0) - pointer.intensity) * (reducedMotion ? 0.28 : 0.16);
      if (pointer.initialized) {
        const smoothing = reducedMotion ? 0.38 : 0.18;
        pointer.x += (pointer.targetX - pointer.x) * smoothing;
        pointer.y += (pointer.targetY - pointer.y) * smoothing;
      }

      meshRipplesRef.current = meshRipplesRef.current.filter(
        (ripple) => timestamp - ripple.startedAt < ripple.duration,
      );

      const activeRipples = meshRipplesRef.current;
      const activeViewport = meshViewportRef.current;
      const visibleNodes = getVisibleMeshNodeInfluences(
        meshNodesRef.current,
        activeViewport,
        width,
        height,
      );
      const loadingGlowEnabled = meshLoadingRef.current;
      const gridStartX = positiveModulo(activeViewport.x, GRID_SIZE) - GRID_SIZE;
      const gridStartY = positiveModulo(activeViewport.y, GRID_SIZE) - GRID_SIZE;

      let currentFont = "";

      for (let pointY = gridStartY; pointY <= height + GRID_SIZE; pointY += GRID_SIZE) {
        for (let pointX = gridStartX; pointX <= width + GRID_SIZE; pointX += GRID_SIZE) {
          const hoverGlow = getMeshHoverGlow(pointX, pointY, pointer, reducedMotion);
          const clickSink = getMeshClickSink(pointX, pointY, activeRipples, timestamp, reducedMotion);
          const nodeSink = getMeshNodeSink(pointX, pointY, visibleNodes);
          const loadingGlow = loadingGlowEnabled
            ? getMeshLoadingGlow(pointX, pointY, width, height, timestamp, reducedMotion)
            : 0;

          const sink = clampNumber(clickSink + nodeSink, 0, 1.1);
          const glow = clampNumber(hoverGlow + loadingGlow, 0, 1);
          const fontSize = clampNumber(
            MESH_BASE_FONT_SIZE + glow * 2.1 - sink * 1.8,
            9,
            14,
          );
          const fontBucket = Math.round(fontSize * 2) / 2;
          const font = `500 ${fontBucket}px "IBM Plex Mono", monospace`;
          if (font !== currentFont) {
            context.font = font;
            currentFont = font;
          }

          const alpha = clampNumber(0.11 + glow * 0.17 - sink * 0.06, 0.035, 0.34);
          const hue = 212 + glow * 6 - sink * 9;
          const saturation = clampNumber(18 + glow * 28 - sink * 8, 10, 52);
          const lightness = clampNumber(68 + glow * 18 - sink * 20, 38, 94);
          const offsetY = sink * 1.6 - glow * 0.5 - fontBucket * 0.18;

          context.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
          context.fillText(MESH_GLYPH, pointX, pointY + offsetY);
        }
      }

      frameId = window.requestAnimationFrame(drawMesh);
    };

    frameId = window.requestAnimationFrame(drawMesh);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [immersive]);

  const canvasCursor = interaction?.type === "pan"
    ? interaction.activated
      ? "cursor-grabbing"
      : "cursor-grab"
    : interaction?.type === "select"
      ? "cursor-crosshair"
      : interactionMode === "pan"
        ? "cursor-grab"
        : "cursor-default";
  const canvasGridBackground = immersive
    ? {
        backgroundColor: "#17191e",
        backgroundImage:
          "linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.18) 10%, rgba(0,0,0,0) 22%)",
        backgroundSize: "100% 100%",
        backgroundPosition: "0 0",
      }
    : {
        backgroundColor: "hsl(var(--card))",
        backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.12) 1px, transparent 0)",
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      };

  return (
    <div
      className={cn(
        "flex h-full min-h-[520px] flex-col overflow-hidden",
        immersive
          ? "relative rounded-none border-0 bg-transparent shadow-none"
          : "rounded-[28px] border border-border/70 bg-card shadow-card",
      )}
    >
      {!immersive ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/55 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/70 bg-background/45 text-muted-foreground">
              {view.nodes.length} itens
            </Badge>
            {portConnection ? (
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                conectando portas
              </Badge>
            ) : selectedNode ? (
              <Badge variant="outline" className="border-border/70 bg-background/45 text-muted-foreground">
                {presentationsByNodeId[selectedNode.id]?.title ?? "item"}
              </Badge>
            ) : (
              <span className="text-[11px] text-muted-foreground">clique seleciona, arraste move, botao direito cria</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleZoom("out")}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="min-w-16 text-center font-mono text-[11px]">{Math.round(viewport.zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleZoom("in")}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={handleFitView}>
              <ScanSearch className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={handleResetView}>
              <Undo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={containerRef}
            className={cn("relative min-h-0 flex-1 overflow-hidden overscroll-none touch-none", canvasCursor)}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={(event) => updateMeshPointerFromClient(event.clientX, event.clientY)}
            onPointerLeave={releaseMeshPointer}
            onContextMenuCapture={handleCanvasContextMenuCapture}
          >
        <div className="absolute inset-0 z-0">
          <div
            className="pointer-events-none absolute inset-0"
            style={canvasGridBackground}
          />
          {immersive ? (
            <canvas
              ref={meshCanvasRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            />
          ) : null}
        </div>

        {canvasMenuState ? (
          <div
            ref={canvasMenuRef}
            className={cn(
              "absolute z-[80] w-[236px] rounded-[24px] p-1.5 shadow-floating",
              immersive
                ? "border border-white/10 bg-[#17191e] text-white"
                : "border border-border/70 bg-card text-card-foreground",
            )}
            style={{ left: canvasMenuState.left, top: canvasMenuState.top }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="relative px-1 py-1">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-[18px] px-3 py-2 text-left text-sm",
                  immersive ? "hover:bg-white/8 hover:text-white" : "hover:bg-accent hover:text-accent-foreground",
                )}
                onMouseEnter={() => setCanvasSubmenu("create")}
                onFocus={() => setCanvasSubmenu("create")}
                onClick={() => setCanvasSubmenu((current) => (current === "create" ? null : "create"))}
              >
                <span>Adicionar Node</span>
                <span className={cn("text-xs", immersive ? "text-white/42" : "text-muted-foreground")}>›</span>
              </button>

              {canvasSubmenu === "create" ? (
                <div
                  className={cn(
                    "absolute left-full top-0 ml-2 w-[284px] rounded-[24px] p-1.5 shadow-floating",
                    immersive
                      ? "border border-white/10 bg-[#17191e] text-white"
                      : "border border-border/70 bg-card text-card-foreground",
                  )}
                >
                  <div className="px-2.5 py-2">
                    <p className={cn("text-sm font-semibold", immersive ? "text-white" : "text-foreground")}>
                      Tipos de Node
                    </p>
                    <p className={cn("mt-1 text-xs", immersive ? "text-white/48" : "text-muted-foreground")}>
                      Crie o node e comece no ponto clicado do canvas.
                    </p>
                  </div>
                  <div className="space-y-1 px-1">
                    {CANVAS_CREATE_PRESETS.map((preset) => (
                      <button
                        key={`canvas-create-${preset.id}`}
                        type="button"
                        className={cn(
                          "flex w-full flex-col rounded-[18px] px-3 py-2.5 text-left transition",
                          immersive ? "hover:bg-white/8 hover:text-white" : "hover:bg-accent hover:text-accent-foreground",
                        )}
                        onClick={() => {
                          handleCanvasCreate(preset.seed);
                          setCanvasMenuState(null);
                          setCanvasSubmenu(null);
                        }}
                      >
                        <span className="text-sm font-medium">{preset.label}</span>
                        <span
                          className={cn(
                            "mt-1 text-xs leading-5",
                            immersive ? "text-white/46" : "text-muted-foreground",
                          )}
                        >
                          {preset.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="-mx-1.5 my-2 h-px bg-border" onMouseEnter={() => setCanvasSubmenu(null)} />
            {portConnection ? (
              <button
                type="button"
                className={cn(
                  "flex w-full rounded-[18px] px-3 py-2 text-left text-sm",
                  immersive ? "hover:bg-white/8 hover:text-white" : "hover:bg-accent hover:text-accent-foreground",
                )}
                onMouseEnter={() => setCanvasSubmenu(null)}
                onClick={() => {
                  portConnectionRef.current = null;
                  setPortConnection(null);
                  setCanvasMenuState(null);
                  setCanvasSubmenu(null);
                }}
              >
                Cancelar conexao
              </button>
            ) : null}
            <button
              type="button"
              className={cn(
                "flex w-full rounded-[18px] px-3 py-2 text-left text-sm",
                immersive ? "hover:bg-white/8 hover:text-white" : "hover:bg-accent hover:text-accent-foreground",
              )}
              onMouseEnter={() => setCanvasSubmenu(null)}
              onClick={() => {
                handleFitView();
                setCanvasMenuState(null);
                setCanvasSubmenu(null);
              }}
            >
              Enquadrar canvas
            </button>
            <button
              type="button"
              className={cn(
                "flex w-full rounded-[18px] px-3 py-2 text-left text-sm",
                immersive ? "hover:bg-white/8 hover:text-white" : "hover:bg-accent hover:text-accent-foreground",
              )}
              onMouseEnter={() => setCanvasSubmenu(null)}
              onClick={() => {
                handleResetView();
                setCanvasMenuState(null);
                setCanvasSubmenu(null);
              }}
            >
              Resetar viewport
            </button>
            {selectedNodeId || selectedNodeIds.length ? (
              <button
                type="button"
                  className={cn(
                    "flex w-full rounded-[18px] px-3 py-2 text-left text-sm",
                    immersive ? "hover:bg-white/8 hover:text-white" : "hover:bg-accent hover:text-accent-foreground",
                  )}
                  onMouseEnter={() => setCanvasSubmenu(null)}
                  onClick={() => {
                    clearSelectedNodeIds();
                    onClearSelection();
                    setCanvasMenuState(null);
                    setCanvasSubmenu(null);
                  }}
                >
                  Limpar selecao
              </button>
            ) : null}
          </div>
        ) : null}

        {edgeMenuState ? (
          <div
            ref={edgeMenuRef}
            className={cn(
              "absolute z-[82] w-[196px] rounded-[20px] p-1.5 shadow-floating",
              immersive
                ? "border border-white/10 bg-[#17191e] text-white"
                : "border border-border/70 bg-card text-card-foreground",
            )}
            style={{ left: edgeMenuState.left, top: edgeMenuState.top }}
          >
            <button
              type="button"
              className={cn(
                "flex w-full rounded-[16px] px-3 py-2 text-left text-sm",
                immersive ? "hover:bg-white/8 hover:text-white" : "hover:bg-accent hover:text-accent-foreground",
              )}
              onClick={() => {
                onDisconnectEdge(edgeMenuState.edgeId);
                setEdgeMenuState(null);
                setHoveredEdgeId(null);
              }}
            >
              Remover ligacao
            </button>
          </div>
        ) : null}

        <div
          className="absolute left-0 top-0 z-10 origin-top-left"
          style={{
            width: SCENE_SIZE,
            height: SCENE_SIZE,
            overflow: "visible",
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            willChange: interaction ? "transform" : undefined,
          }}
        >
          <svg className="absolute inset-0 h-full w-full overflow-visible">
            {edges.map((edge) => {
              const source = nodeMap[edge.source];
              const target = nodeMap[edge.target];
              if (!source || !target) return null;

              const isFocused = Boolean(
                selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id),
              );
              const isHovered = hoveredEdgeId === edge.id;
              const geometry = getEdgeGeometry(source, target);
              const visual = getCanvasEdgeVisual(edge, isFocused || isHovered);
              const labelWidth = Math.max(58, visual.label.length * 6.4 + 18);
              const labelHeight = 20;
              const dashArray = visual.dash ?? (edge.dashed ? "8 8" : undefined);
              const flowSegment = Math.min(visual.segment, Math.max(geometry.length * 0.18, 18));
              const flowGap = Math.max(geometry.length - flowSegment, 1);

              return (
                <g key={edge.id} opacity={selectedNode && !isFocused && !isHovered ? 0.22 : 1}>
                  <path
                    data-workspace-edge-hit="true"
                    d={geometry.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18}
                    strokeLinecap="round"
                    pointerEvents="stroke"
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId((current) => (current === edge.id ? null : current))}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setEdgeMenuState({
                        edgeId: edge.id,
                        left: Math.max(12, Math.min(event.clientX - rect.left, rect.width - 196)),
                        top: Math.max(12, Math.min(event.clientY - rect.top, rect.height - 80)),
                      });
                    }}
                  />
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke={visual.glow}
                    strokeWidth={visual.width + 7}
                    strokeLinecap="round"
                    pointerEvents="none"
                  />
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke={visual.stroke}
                    strokeWidth={visual.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={dashArray}
                    pointerEvents="none"
                  />
                  {edge.animated !== false ? (
                    <path
                      d={geometry.path}
                      fill="none"
                      stroke={visual.flow}
                      strokeWidth={visual.width + 0.8}
                      strokeLinecap="round"
                      strokeDasharray={`${flowSegment} ${flowGap}`}
                      pointerEvents="none"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to={`${-geometry.length}`}
                        dur={visual.duration}
                        repeatCount="indefinite"
                      />
                    </path>
                  ) : null}
                  <circle cx={geometry.start.x} cy={geometry.start.y} r={3.2} fill={visual.stroke} opacity={0.92} pointerEvents="none" />
                  <circle
                    cx={geometry.end.x}
                    cy={geometry.end.y}
                    r={4.4}
                    fill="hsl(var(--background))"
                    stroke={visual.stroke}
                    strokeWidth={1.7}
                    pointerEvents="none"
                  />
                  <g transform={`translate(${geometry.label.x - labelWidth / 2}, ${geometry.label.y - labelHeight / 2})`} pointerEvents="none">
                    <rect
                      width={labelWidth}
                      height={labelHeight}
                      rx={10}
                      fill={visual.badgeFill}
                      stroke={visual.badgeStroke}
                      strokeWidth={1}
                    />
                    <text
                      x={labelWidth / 2}
                      y={13}
                      textAnchor="middle"
                      className="fill-current text-[10px] font-medium uppercase tracking-[0.14em]"
                      style={{ color: visual.badgeText }}
                    >
                      {visual.label}
                    </text>
                  </g>
                </g>
              );
            })}
            {portConnection ? (
              <>
                <path
                  d={getLooseEdgePath(
                    { x: portConnection.startX, y: portConnection.startY },
                    { x: portConnection.currentX, y: portConnection.currentY },
                  )}
                  fill="none"
                  stroke="hsla(191, 96%, 88%, 0.94)"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeDasharray="10 8"
                  pointerEvents="none"
                />
                <circle
                  cx={portConnection.currentX}
                  cy={portConnection.currentY}
                  r={4.5}
                  fill={portConnection.hoveredTargetId ? "hsla(191, 96%, 88%, 0.96)" : "hsla(191, 90%, 62%, 0.7)"}
                  pointerEvents="none"
                />
              </>
            ) : null}
          </svg>

          {renderedNodes.map((node) => {
            const presentation = presentationsByNodeId[node.id];
            const item = node.binding.kind === "item" ? itemsById[node.binding.entityId] : undefined;
            const displayOnly = isDisplayOnlyNodePresentation(presentation, node.binding.kind);
            const expanded = displayOnly;
            const isSelected = selectedNodeId === node.id || selectionSet.has(node.id);
            const isMoving = interaction?.type === "move" && interaction.nodeId === node.id && interaction.activated;
            const isConnectingSource = portConnection?.sourceNodeId === node.id;
            const isPortTarget = portConnection?.hoveredTargetId === node.id;
            const fileManagerAssets = item?.specialKind === "file-manager"
              ? projectAssets.filter((asset) => item.fileManager?.assetIds.includes(asset.id))
              : [];
            const fileViewerAsset = item?.specialKind === "file-viewer" && item.fileViewer?.assetId
              ? fileAssetsById[item.fileViewer.assetId] ?? null
              : null;

            if (!presentation) return null;

            return (
              <ContextMenu key={node.id}>
                <ContextMenuTrigger asChild>
                  <div
                    data-workspace-node-id={node.id}
                    className={cn(
                      "pointer-events-auto absolute select-none transition-[width,height,box-shadow] duration-200 ease-out",
                      interaction?.type === "move" && interaction.nodeId === node.id
                        ? interaction.activated
                          ? "cursor-grabbing"
                          : "cursor-grab"
                        : "cursor-grab",
                      (isMoving || isConnectingSource) && "z-30",
                    )}
                    style={{
                      left: node.x,
                      top: node.y,
                      width: node.w,
                      height: node.h,
                      willChange: isMoving ? "transform" : undefined,
                    }}
                    onContextMenu={() => {
                      onSelectNode(node.id);
                      selectSingleNodeId(node.id);
                    }}
                  >
                    <div
                      data-workspace-node-shell="true"
                      tabIndex={0}
                      className="relative h-full w-full focus-visible:outline-none"
                      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                        const target = event.target as HTMLElement | null;
                        if (target && isInteractiveCanvasControl(target)) {
                          return;
                        }

                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectNode(node.id);
                          selectSingleNodeId(node.id);
                        }
                      }}
                      aria-label={`Selecionar bloco ${presentation.title}`}
                    >
                      <NodePortHandle side="left" active={isSelected || isConnectingSource || isPortTarget} />
                      <NodePortHandle
                        side="right"
                        active={isSelected || isConnectingSource || portConnection?.sourceNodeId === node.id}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          beginPortConnection(event, node.id);
                        }}
                      />
                      <WorkspacePluginCard
                        presentation={presentation}
                        item={item}
                        selected={isSelected || isConnectingSource}
                        expanded={expanded}
                        coreOnly
                        canvasMinimal
                        terminalRuntime={
                          presentation.displayVariant === "terminal" &&
                          item?.specialKind === "terminal" &&
                          item.terminal
                            ? {
                                projectId: item.projectId,
                                terminal: item.terminal,
                                onSync: (patch) => onSyncTerminalState?.(item, patch),
                                onActivate: () => {
                                  onSelectNode(node.id);
                                  selectSingleNodeId(node.id);
                                },
                              }
                            : undefined
                        }
                        fileManagerRuntime={
                          item?.specialKind === "file-manager"
                            ? {
                                assets: fileManagerAssets,
                                selectedAssetId: item.fileManager?.selectedAssetId ?? fileManagerAssets[0]?.id ?? null,
                                onSelectAsset: (assetId) => onSelectFileManagerAsset?.(item, assetId),
                                onRenameAsset: (assetId, name) => void onRenameFileAsset?.(assetId, name),
                                onDeleteAsset: (assetId) => void onDeleteFileAsset?.(assetId),
                                onOpenAssetAsNode: (assetId) => onOpenAssetAsNode?.(item, assetId),
                                onUploadFiles: (files) => void onUploadFilesToItem?.(item, files),
                              }
                            : undefined
                        }
                        fileViewerRuntime={
                          item?.specialKind === "file-viewer"
                            ? {
                                asset: fileViewerAsset,
                                activeSheet: item.fileViewer?.activeSheet ?? null,
                                onSelectSheet: (sheetName) => onSelectFileViewerSheet?.(item, sheetName),
                              }
                            : undefined
                        }
                        browserRuntime={
                          item?.specialKind === "browser"
                            ? {
                                url: item.browser?.url ?? "https://example.com",
                                title: item.browser?.title ?? item.label,
                                loading: item.browser?.loading ?? false,
                                history: item.browser?.history ?? [item.browser?.url ?? "https://example.com"],
                                historyIndex: item.browser?.historyIndex ?? 0,
                                lastError: item.browser?.lastError ?? null,
                                onNavigate: (url, mode) => onBrowserNavigate?.(item, url, mode),
                                onBack: () => onBrowserBack?.(item),
                                onForward: () => onBrowserForward?.(item),
                                onRefresh: () => onBrowserRefresh?.(item),
                                onSnapshot: (patch) => onBrowserSnapshot?.(item, patch),
                              }
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className={cn(
                  "w-64 rounded-2xl",
                  immersive
                    ? "border-white/10 bg-[#17191e] text-white"
                    : "border-border/70 bg-card text-card-foreground",
                )}>
                  <ContextMenuLabel>{presentation.title}</ContextMenuLabel>
                  <ContextMenuItem onSelect={() => onSelectNode(node.id)}>
                    Selecionar node
                  </ContextMenuItem>
                  {node.binding.kind === "item" ? (
                    <>
                      <ContextMenuItem onSelect={() => onConfigureItem(node.id, "receive", { inputEnabled: true })}>
                        Abrir recebimento
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => onConfigureItem(node.id, "program")}>
                        Abrir programacao
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => onConfigureItem(node.id, "send", { actionEnabled: true })}>
                        Abrir envio
                      </ContextMenuItem>
                    </>
                  ) : null}
                  {node.binding.kind === "item" ? (
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>Criar node conectado</ContextMenuSubTrigger>
                      <ContextMenuSubContent
                        className={cn(
                          "w-72 rounded-2xl",
                          immersive
                            ? "border-white/10 bg-[#17191e] text-white"
                            : "border-border/70 bg-card text-card-foreground",
                        )}
                      >
                        <ContextMenuLabel>Novo node</ContextMenuLabel>
                        {CANVAS_CREATE_PRESETS.map((preset) => {
                          return (
                            <ContextMenuItem
                              key={`${node.id}:${preset.id}`}
                              className="py-2"
                              onSelect={() => onCreateItem(getSuggestedPlacement(node), node.binding, preset.seed)}
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-medium">{preset.label}</span>
                                <span
                                  className={cn(
                                    "block text-xs leading-5",
                                    immersive ? "text-white/46" : "text-muted-foreground",
                                  )}
                                >
                                  {preset.description}
                                </span>
                              </span>
                            </ContextMenuItem>
                          );
                        })}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  ) : null}

                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => onRemoveNode(node.id)}
                  >
                    Remover do canvas
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>

        {interaction?.type === "select" && interaction.activated ? (
          <div
            className={cn(
              "pointer-events-none absolute z-40 rounded-2xl",
              immersive
                ? "border border-sky-300/50 bg-sky-300/10 shadow-[0_0_0_1px_rgba(125,211,252,0.18)]"
                : "border border-primary/70 bg-primary/10",
            )}
            style={{
              left: Math.min(interaction.startOffsetX, interaction.currentOffsetX),
              top: Math.min(interaction.startOffsetY, interaction.currentOffsetY),
              width: Math.abs(interaction.currentOffsetX - interaction.startOffsetX),
              height: Math.abs(interaction.currentOffsetY - interaction.startOffsetY),
            }}
          />
        ) : null}

        {!immersive ? (
          <div className="pointer-events-none absolute bottom-4 right-4 z-[60] hidden w-[210px] rounded-[22px] border border-border/70 bg-background/92 p-3 shadow-floating md:block">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Mini map</span>
              <span>workspace</span>
            </div>
            <div className="relative h-[112px] overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.08) 1px, transparent 0)",
                  backgroundSize: "16px 16px",
                }}
              />
              {renderedNodes.map((node) => (
                <div
                  key={`mini_${node.id}`}
                  className={cn(
                    "absolute rounded-md border border-border/70 bg-foreground/10",
                    selectedNodeId === node.id && "border-primary/70 bg-primary/20",
                    portConnection?.sourceNodeId === node.id && "border-primary bg-primary/25",
                  )}
                  style={{
                    left: minimapOffsetX + (node.x - minimapBounds.minX) * minimapScale,
                    top: minimapOffsetY + (node.y - minimapBounds.minY) * minimapScale,
                    width: Math.max(node.w * minimapScale, 14),
                    height: Math.max(node.h * minimapScale, 10),
                  }}
                />
              ))}
              <div
                className="absolute rounded-lg border border-primary/70 bg-primary/10"
                style={{
                  left: minimapViewport.left,
                  top: minimapViewport.top,
                  width: minimapViewport.width,
                  height: minimapViewport.height,
                }}
              />
            </div>
          </div>
        ) : null}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          className={cn(
            "z-[90] w-[236px] rounded-[24px] p-1.5 shadow-floating",
            immersive
              ? "border-white/10 bg-[#17191e] text-white"
              : "border-border/70 bg-card text-card-foreground",
          )}
        >
          <ContextMenuGroup>
            <ContextMenuSub>
              <ContextMenuSubTrigger
                className={cn(
                  "rounded-[18px] px-3 py-2 text-sm",
                  immersive ? "focus:bg-white/8 focus:text-white data-[state=open]:bg-white/8" : "",
                )}
              >
                Adicionar Node
              </ContextMenuSubTrigger>
              <ContextMenuSubContent
                className={cn(
                  "w-[284px] rounded-[24px] p-1.5 shadow-floating",
                  immersive
                    ? "border-white/10 bg-[#17191e] text-white"
                    : "border-border/70 bg-card text-card-foreground",
                )}
              >
                <ContextMenuLabel
                  className={cn(
                    "px-2.5 py-2 text-sm",
                    immersive ? "text-white" : "text-foreground",
                  )}
                >
                  Tipos de Node
                </ContextMenuLabel>
                {CANVAS_CREATE_PRESETS.map((preset) => (
                  <ContextMenuItem
                    key={`canvas-create-${preset.id}`}
                    className={cn(
                      "flex flex-col items-start rounded-[18px] px-3 py-2.5",
                      immersive ? "focus:bg-white/8 focus:text-white" : "",
                    )}
                    onSelect={() => handleCanvasCreate(preset.seed)}
                  >
                    <span className="text-sm font-medium">{preset.label}</span>
                    <span
                      className={cn(
                        "mt-1 text-xs leading-5",
                        immersive ? "text-white/46" : "text-muted-foreground",
                      )}
                    >
                      {preset.description}
                    </span>
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          {portConnection ? (
            <ContextMenuItem
              className={cn("rounded-[18px] px-3 py-2 text-sm", immersive ? "focus:bg-white/8 focus:text-white" : "")}
              onSelect={() => {
                portConnectionRef.current = null;
                setPortConnection(null);
              }}
            >
              Cancelar conexao
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem
            className={cn("rounded-[18px] px-3 py-2 text-sm", immersive ? "focus:bg-white/8 focus:text-white" : "")}
            onSelect={handleFitView}
          >
            Enquadrar canvas
          </ContextMenuItem>
          <ContextMenuItem
            className={cn("rounded-[18px] px-3 py-2 text-sm", immersive ? "focus:bg-white/8 focus:text-white" : "")}
            onSelect={handleResetView}
          >
            Resetar viewport
          </ContextMenuItem>
          {selectedNodeId || selectedNodeIds.length ? (
            <ContextMenuItem
              className={cn("rounded-[18px] px-3 py-2 text-sm", immersive ? "focus:bg-white/8 focus:text-white" : "")}
              onSelect={() => {
                clearSelectedNodeIds();
                onClearSelection();
              }}
            >
              Limpar selecao
            </ContextMenuItem>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

function NodePortHandle({
  side,
  active,
  onPointerDown,
}: {
  side: "left" | "right";
  active: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      data-workspace-control="true"
      onPointerDown={onPointerDown}
      className={cn(
        "absolute top-1/2 z-20 h-[18px] w-[18px] -translate-y-1/2 rounded-full border shadow-[0_0_0_4px_rgba(11,14,18,0.9)] transition-transform duration-150 hover:scale-[1.45]",
        side === "left" ? "-left-[9px]" : "-right-[9px]",
        active
          ? "border-sky-300/70 bg-sky-300/90"
          : "border-white/16 bg-[#0f1216]",
      )}
    />
  );
}

type EdgePoint = { x: number; y: number };
type EdgeGeometry = {
  start: EdgePoint;
  end: EdgePoint;
  control1: EdgePoint;
  control2: EdgePoint;
  label: EdgePoint;
  path: string;
  length: number;
};

type CanvasEdgeVisual = {
  label: string;
  stroke: string;
  glow: string;
  flow: string;
  badgeFill: string;
  badgeStroke: string;
  badgeText: string;
  width: number;
  dash?: string;
  duration: string;
  segment: number;
};

const EDGE_KIND_STYLES: Record<NonNullable<CanvasEdge["kind"]>, Omit<CanvasEdgeVisual, "label">> = {
  visual: {
    stroke: "hsla(271, 82%, 70%, 0.82)",
    glow: "hsla(271, 82%, 70%, 0.18)",
    flow: "hsla(274, 100%, 91%, 0.98)",
    badgeFill: "hsla(271, 82%, 70%, 0.12)",
    badgeStroke: "hsla(271, 82%, 70%, 0.34)",
    badgeText: "hsla(274, 100%, 91%, 0.94)",
    width: 2.45,
    duration: "3.7s",
    segment: 34,
  },
  data: {
    stroke: "hsla(191, 90%, 62%, 0.78)",
    glow: "hsla(191, 90%, 62%, 0.16)",
    flow: "hsla(191, 96%, 88%, 0.98)",
    badgeFill: "hsla(191, 90%, 62%, 0.12)",
    badgeStroke: "hsla(191, 90%, 62%, 0.34)",
    badgeText: "hsla(191, 96%, 88%, 0.94)",
    width: 2.2,
    duration: "4.8s",
    segment: 28,
  },
  transform: {
    stroke: "hsla(216, 88%, 68%, 0.8)",
    glow: "hsla(216, 88%, 68%, 0.18)",
    flow: "hsla(213, 100%, 90%, 0.98)",
    badgeFill: "hsla(216, 88%, 68%, 0.12)",
    badgeStroke: "hsla(216, 88%, 68%, 0.34)",
    badgeText: "hsla(213, 100%, 90%, 0.94)",
    width: 2.35,
    duration: "4.1s",
    segment: 30,
  },
  display: {
    stroke: "hsla(271, 82%, 70%, 0.82)",
    glow: "hsla(271, 82%, 70%, 0.18)",
    flow: "hsla(274, 100%, 91%, 0.98)",
    badgeFill: "hsla(271, 82%, 70%, 0.12)",
    badgeStroke: "hsla(271, 82%, 70%, 0.34)",
    badgeText: "hsla(274, 100%, 91%, 0.94)",
    width: 2.45,
    duration: "3.7s",
    segment: 34,
  },
  action: {
    stroke: "hsla(38, 96%, 62%, 0.84)",
    glow: "hsla(38, 96%, 62%, 0.2)",
    flow: "hsla(44, 100%, 91%, 0.98)",
    badgeFill: "hsla(38, 96%, 62%, 0.14)",
    badgeStroke: "hsla(38, 96%, 62%, 0.38)",
    badgeText: "hsla(44, 100%, 91%, 0.94)",
    width: 2.5,
    dash: "10 8",
    duration: "3.2s",
    segment: 32,
  },
  context: {
    stroke: "hsla(218, 16%, 70%, 0.5)",
    glow: "hsla(218, 16%, 70%, 0.12)",
    flow: "hsla(220, 24%, 88%, 0.82)",
    badgeFill: "hsla(218, 16%, 70%, 0.1)",
    badgeStroke: "hsla(218, 16%, 70%, 0.22)",
    badgeText: "hsla(220, 24%, 88%, 0.8)",
    width: 1.95,
    duration: "6.2s",
    segment: 24,
  },
  automation: {
    stroke: "hsla(318, 84%, 68%, 0.84)",
    glow: "hsla(318, 84%, 68%, 0.2)",
    flow: "hsla(318, 100%, 92%, 0.98)",
    badgeFill: "hsla(318, 84%, 68%, 0.14)",
    badgeStroke: "hsla(318, 84%, 68%, 0.38)",
    badgeText: "hsla(318, 100%, 92%, 0.94)",
    width: 2.55,
    dash: "12 8",
    duration: "3.1s",
    segment: 34,
  },
  trigger: {
    stroke: "hsla(318, 84%, 68%, 0.84)",
    glow: "hsla(318, 84%, 68%, 0.2)",
    flow: "hsla(318, 100%, 92%, 0.98)",
    badgeFill: "hsla(318, 84%, 68%, 0.14)",
    badgeStroke: "hsla(318, 84%, 68%, 0.38)",
    badgeText: "hsla(318, 100%, 92%, 0.94)",
    width: 2.55,
    dash: "12 8",
    duration: "3.1s",
    segment: 34,
  },
  control: {
    stroke: "hsla(38, 96%, 62%, 0.84)",
    glow: "hsla(38, 96%, 62%, 0.2)",
    flow: "hsla(44, 100%, 91%, 0.98)",
    badgeFill: "hsla(38, 96%, 62%, 0.14)",
    badgeStroke: "hsla(38, 96%, 62%, 0.38)",
    badgeText: "hsla(44, 100%, 91%, 0.94)",
    width: 2.5,
    dash: "10 8",
    duration: "3.2s",
    segment: 32,
  },
  dependency: {
    stroke: "hsla(218, 16%, 70%, 0.5)",
    glow: "hsla(218, 16%, 70%, 0.12)",
    flow: "hsla(220, 24%, 88%, 0.82)",
    badgeFill: "hsla(218, 16%, 70%, 0.1)",
    badgeStroke: "hsla(218, 16%, 70%, 0.22)",
    badgeText: "hsla(220, 24%, 88%, 0.8)",
    width: 1.95,
    duration: "6.2s",
    segment: 24,
  },
};

const EDGE_KIND_LABELS: Record<NonNullable<CanvasEdge["kind"]>, string> = {
  visual: "visual",
  data: "dados",
  transform: "logica",
  display: "visual",
  action: "acao",
  context: "contexto",
  automation: "automacao",
  trigger: "gatilho",
  control: "controle",
  dependency: "dependencia",
};

function getCanvasEdgeKind(edge: CanvasEdge): NonNullable<CanvasEdge["kind"]> {
  if (edge.kind) return edge.kind;
  if (edge.dashed) return "automation";
  if (edge.tone === "warning") return "action";
  if (edge.tone === "positive") return "display";
  if (edge.tone === "info") return "data";
  return edge.custom ? "transform" : "context";
}

function getCanvasEdgeVisual(edge: CanvasEdge, focused: boolean): CanvasEdgeVisual {
  const kind = getCanvasEdgeKind(edge);
  const style = EDGE_KIND_STYLES[kind];

  return {
    ...style,
    label: edge.label?.trim() || EDGE_KIND_LABELS[kind],
    stroke: focused ? style.flow : style.stroke,
    glow: focused ? style.badgeStroke : style.glow,
    width: style.width + (focused || edge.custom ? 0.35 : 0),
  };
}

function getEdgeGeometry(source: CanvasNode, target: CanvasNode): EdgeGeometry {
  const sourceCenter = { x: source.x + source.w / 2, y: source.y + source.h / 2 };
  const targetCenter = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);

  let start: EdgePoint;
  let end: EdgePoint;
  let control1: EdgePoint;
  let control2: EdgePoint;

  if (horizontal) {
    const direction = dx >= 0 ? 1 : -1;
    const offset = clampConnectionOffset(Math.abs(dx) * 0.42, 72, 240);
    start = { x: direction > 0 ? source.x + source.w : source.x, y: sourceCenter.y };
    end = { x: direction > 0 ? target.x : target.x + target.w, y: targetCenter.y };
    control1 = { x: start.x + offset * direction, y: start.y };
    control2 = { x: end.x - offset * direction, y: end.y };
  } else {
    const direction = dy >= 0 ? 1 : -1;
    const offset = clampConnectionOffset(Math.abs(dy) * 0.45, 64, 220);
    start = { x: sourceCenter.x, y: direction > 0 ? source.y + source.h : source.y };
    end = { x: targetCenter.x, y: direction > 0 ? target.y : target.y + target.h };
    control1 = { x: start.x, y: start.y + offset * direction };
    control2 = { x: end.x, y: end.y - offset * direction };
  }

  const path = `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`;
  const label = getBezierPoint(start, control1, control2, end, 0.5);
  const length = approximateBezierLength(start, control1, control2, end);

  return { start, end, control1, control2, label, path, length };
}

function getLooseEdgePath(start: EdgePoint, end: EdgePoint) {
  const dx = end.x - start.x;
  const offset = clampConnectionOffset(Math.abs(dx) * 0.42, 64, 220);
  const direction = dx >= 0 ? 1 : -1;
  const control1 = { x: start.x + offset * direction, y: start.y };
  const control2 = { x: end.x - offset * direction, y: end.y };
  return `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`;
}

function getBezierPoint(start: EdgePoint, control1: EdgePoint, control2: EdgePoint, end: EdgePoint, t: number): EdgePoint {
  const mt = 1 - t;
  return {
    x:
      mt * mt * mt * start.x +
      3 * mt * mt * t * control1.x +
      3 * mt * t * t * control2.x +
      t * t * t * end.x,
    y:
      mt * mt * mt * start.y +
      3 * mt * mt * t * control1.y +
      3 * mt * t * t * control2.y +
      t * t * t * end.y,
  };
}

function approximateBezierLength(start: EdgePoint, control1: EdgePoint, control2: EdgePoint, end: EdgePoint) {
  let length = 0;
  let previous = start;

  for (let step = 1; step <= 18; step += 1) {
    const point = getBezierPoint(start, control1, control2, end, step / 18);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }

  return Math.max(length, 1);
}

function clampConnectionOffset(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampZoom(zoom: number) {
  return Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, Number(zoom.toFixed(2))));
}

function clampNodeSize(value: number, axis: "w" | "h") {
  return axis === "w" ? Math.max(MIN_NODE_WIDTH, value) : Math.max(MIN_NODE_HEIGHT, value);
}

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getExpandedNodeSize(node: CanvasNode, presentation?: WorkspaceNodePresentation) {
  if (node.binding.kind === "item" && presentation?.displayVariant === "markdown") {
    return getMarkdownCanvasSize(presentation);
  }

  if (node.binding.kind === "item" && presentation?.displayVariant) {
    return EXPANDED_ITEM_SIZE_BY_VARIANT[presentation.displayVariant] ?? EXPANDED_SIZE_BY_KIND.item;
  }

  return EXPANDED_SIZE_BY_KIND[node.binding.kind] ?? { w: 360, h: 220 };
}

function getCollapsedNodeSize(node: CanvasNode, presentation?: WorkspaceNodePresentation) {
  if (node.binding.kind === "item" && presentation?.displayVariant === "markdown") {
    return getMarkdownCanvasSize(presentation);
  }

  const variant = presentation?.displayVariant ?? "card";
  const size = COLLAPSED_SIZE_BY_VARIANT[variant];

  if (node.binding.kind === "plugin") {
    return { w: Math.max(size.w, 252), h: Math.max(size.h, 104) };
  }

  return size;
}

function normalizeDisplayNodeSize(value: number, ideal: number, axis: "w" | "h") {
  const maxRatio = axis === "w" ? 1.35 : 1.45;
  return Math.max(ideal, Math.min(value || ideal, Math.round(ideal * maxRatio)));
}

function getMarkdownCanvasSize(presentation: WorkspaceNodePresentation) {
  const body = presentation.markdownPreview?.body ?? "";
  const lines = body.split(/\r?\n/);
  const contentUnits = lines.reduce((total, line) => total + (line.trim().length ? 1 : 0.45), 0);
  const maxLineLength = lines.reduce((longest, line) => Math.max(longest, line.length), 0);

  return {
    w: Math.max(520, Math.min(920, 520 + Math.max(0, maxLineLength - 48) * 2)),
    h: Math.max(344, Math.round(180 + contentUnits * 24)),
  };
}

function isDisplayOnlyNodePresentation(
  presentation: WorkspaceNodePresentation | undefined,
  kind: WorkspaceNodeBinding["kind"],
) {
  if (!presentation || kind !== "item") return false;
  if (presentation.displaySurfaceOnly) return true;
  return presentation.displayVariant === "chart" || presentation.displayVariant === "table";
}

function getNodeBounds(nodes: CanvasNode[]) {
  if (!nodes.length) {
    return {
      minX: 0,
      minY: 0,
      width: 1200,
      height: 800,
    };
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.w));
  const maxY = Math.max(...nodes.map((node) => node.y + node.h));

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function expandBounds(
  bounds: { minX: number; minY: number; width: number; height: number },
  padding: number,
) {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function getVisibleViewport(width: number, height: number, viewport: CanvasViewport) {
  return {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: width / viewport.zoom,
    height: height / viewport.zoom,
  };
}

function getMinimapViewportFrame(
  visibleViewport: { x: number; y: number; width: number; height: number },
  bounds: { minX: number; minY: number; width: number; height: number },
  scale: number,
  offsetX: number,
  offsetY: number,
  contentWidth: number,
  contentHeight: number,
) {
  const rawLeft = offsetX + (visibleViewport.x - bounds.minX) * scale;
  const rawTop = offsetY + (visibleViewport.y - bounds.minY) * scale;
  const rawWidth = visibleViewport.width * scale;
  const rawHeight = visibleViewport.height * scale;

  return {
    left: rawWidth >= contentWidth ? offsetX : Math.max(offsetX, Math.min(rawLeft, offsetX + contentWidth - rawWidth)),
    top: rawHeight >= contentHeight ? offsetY : Math.max(offsetY, Math.min(rawTop, offsetY + contentHeight - rawHeight)),
    width: Math.min(rawWidth, contentWidth),
    height: Math.min(rawHeight, contentHeight),
  };
}

function getSmartSnappedPosition(nodeId: string, x: number, y: number, nodes: CanvasNode[]) {
  const sourceNode = nodes.find((node) => node.id === nodeId);
  if (!sourceNode) {
    return { x: snapToGrid(x), y: snapToGrid(y) };
  }

  let nextX = snapToGrid(x);
  let nextY = snapToGrid(y);
  let bestXDistance = Math.abs(x - nextX);
  let bestYDistance = Math.abs(y - nextY);

  for (const node of nodes) {
    if (node.id === nodeId) continue;

    const xCandidates = [node.x, node.x + node.w / 2 - sourceNode.w / 2, node.x + node.w - sourceNode.w];
    const yCandidates = [node.y, node.y + node.h / 2 - sourceNode.h / 2, node.y + node.h - sourceNode.h];

    for (const candidate of xCandidates) {
      const distance = Math.abs(x - candidate);
      if (distance <= SNAP_THRESHOLD && distance < bestXDistance) {
        bestXDistance = distance;
        nextX = Math.round(candidate);
      }
    }

    for (const candidate of yCandidates) {
      const distance = Math.abs(y - candidate);
      if (distance <= SNAP_THRESHOLD && distance < bestYDistance) {
        bestYDistance = distance;
        nextY = Math.round(candidate);
      }
    }
  }

  return { x: nextX, y: nextY };
}

function getNodesInSceneRectangle(
  nodes: CanvasNode[],
  rectangle: { x1: number; y1: number; x2: number; y2: number },
) {
  const minX = Math.min(rectangle.x1, rectangle.x2);
  const maxX = Math.max(rectangle.x1, rectangle.x2);
  const minY = Math.min(rectangle.y1, rectangle.y2);
  const maxY = Math.max(rectangle.y1, rectangle.y2);

  return nodes
    .filter((node) => {
      const centerX = node.x + node.w / 2;
      const centerY = node.y + node.h / 2;
      return centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY;
    })
    .map((node) => node.id);
}

function isInteractiveCanvasControl(target: HTMLElement) {
  return Boolean(
    target.closest(
      [
        "[data-workspace-control='true']",
        "button",
        "input",
        "textarea",
        "select",
        "a[href]",
        "[role='checkbox']",
        "[role='menuitem']",
        "[role='option']",
        "[role='dialog']",
        "[data-workspace-terminal='true']",
        "iframe",
      ].join(","),
    ),
  );
}

function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerpNumber(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function getVisibleMeshNodeInfluences(
  nodes: CanvasNode[],
  viewport: CanvasViewport,
  width: number,
  height: number,
) {
  return nodes.reduce<MeshNodeInfluence[]>((result, node) => {
    const screenX = viewport.x + node.x * viewport.zoom;
    const screenY = viewport.y + node.y * viewport.zoom;
    const screenWidth = node.w * viewport.zoom;
    const screenHeight = node.h * viewport.zoom;

    if (
      screenX > width + 180 ||
      screenY > height + 180 ||
      screenX + screenWidth < -180 ||
      screenY + screenHeight < -180
    ) {
      return result;
    }

    const sizeFactor = clampNumber(Math.sqrt((screenWidth * screenHeight) / (420 * 260)), 0.85, 1.75);
    result.push({
      centerX: screenX + screenWidth / 2,
      centerY: screenY + screenHeight / 2,
      radiusX: Math.max(84, screenWidth * 0.62),
      radiusY: Math.max(68, screenHeight * 0.58),
      weight: 0.18 * sizeFactor,
    });
    return result;
  }, []);
}

function getMeshHoverGlow(
  pointX: number,
  pointY: number,
  pointer: MeshPointerState,
  reducedMotion: boolean,
) {
  if (!pointer.initialized || pointer.intensity <= 0.001) {
    return 0;
  }

  const radius = reducedMotion ? 72 : MESH_HOVER_RADIUS;
  const distanceSquared = (pointX - pointer.x) ** 2 + (pointY - pointer.y) ** 2;
  return pointer.intensity * 0.56 * Math.exp(-distanceSquared / (2 * radius * radius));
}

function getMeshClickSink(
  pointX: number,
  pointY: number,
  ripples: MeshRipple[],
  now: number,
  reducedMotion: boolean,
) {
  let sink = 0;

  for (const ripple of ripples) {
    const progress = clampNumber((now - ripple.startedAt) / ripple.duration, 0, 1);
    if (progress >= 1) continue;

    const easedProgress = easeOutCubic(progress);
    const radius = lerpNumber(18, reducedMotion ? 78 : 138, easedProgress);
    const distanceSquared = (pointX - ripple.x) ** 2 + (pointY - ripple.y) ** 2;
    sink += ripple.strength * Math.exp(-distanceSquared / (2 * radius * radius)) * (1 - progress) * 0.42;
  }

  return Math.min(sink, 0.9);
}

function getMeshNodeSink(pointX: number, pointY: number, nodes: MeshNodeInfluence[]) {
  let sink = 0;

  for (const node of nodes) {
    const normalizedX = (pointX - node.centerX) / node.radiusX;
    const normalizedY = (pointY - node.centerY) / node.radiusY;
    const distanceSquared = normalizedX ** 2 + normalizedY ** 2;
    if (distanceSquared > 1.9) continue;
    sink += node.weight * Math.exp(-distanceSquared * 1.65);
  }

  return Math.min(sink, 0.72);
}

function getMeshLoadingGlow(
  pointX: number,
  pointY: number,
  width: number,
  height: number,
  now: number,
  reducedMotion: boolean,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const distance = Math.hypot(pointX - centerX, pointY - centerY);
  const maxRadius = Math.hypot(width, height) * 0.54;
  const waveBand = reducedMotion ? 34 : 42;
  let glow = 0;

  for (const offset of [0, 0.5]) {
    const cycle = ((now / MESH_LOADING_CYCLE_MS) + offset) % 1;
    const radius = easeOutCubic(cycle) * maxRadius;
    const fadeIn = clampNumber(cycle / 0.16, 0, 1);
    const fadeOut = clampNumber((1 - cycle) / 0.22, 0, 1);
    const wave = Math.exp(-((distance - radius) ** 2) / (2 * waveBand * waveBand));
    glow += wave * fadeIn * fadeOut * 0.38;
  }

  const pulse = Math.exp(-(distance ** 2) / (2 * 138 * 138)) * (0.08 + 0.04 * (0.5 + 0.5 * Math.sin(now / 520)));
  return Math.min(glow + pulse, 0.66);
}


















