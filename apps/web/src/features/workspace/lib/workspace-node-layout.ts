import type { CanvasNode, WorkspaceNodeBinding, WorkspaceNodePresentation } from "@/lib/workspace/types";

const TERMINAL_NODE_SIZE = { w: 1040, h: 720 } as const;

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

export function getWorkspaceRenderedNodeFrame(
  node: CanvasNode,
  presentation?: WorkspaceNodePresentation | null,
) {
  const expanded = isDisplayOnlyNodePresentation(presentation, node.binding.kind);

  if (expanded) {
    const expandedSize = getExpandedNodeSize(node, presentation ?? undefined);
    return {
      x: node.x,
      y: node.y,
      w: normalizeDisplayNodeSize(node.w, expandedSize.w, "w"),
      h: normalizeDisplayNodeSize(node.h, expandedSize.h, "h"),
    };
  }

  const collapsedSize = getCollapsedNodeSize(node, presentation ?? undefined);
  return {
    x: node.x,
    y: node.y,
    w: collapsedSize.w,
    h: collapsedSize.h,
  };
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
  presentation: WorkspaceNodePresentation | undefined | null,
  kind: WorkspaceNodeBinding["kind"],
) {
  if (!presentation || kind !== "item") return false;
  if (presentation.displaySurfaceOnly) return true;
  return presentation.displayVariant === "chart" || presentation.displayVariant === "table";
}
