import type { SpecialTelemetryNodeKind } from "@/lib/telemetry/items";
import type {
  CanvasLayer,
  PluginId,
  WorkspaceInspectorTab,
} from "@/lib/workspace/types";

export const INSPECTOR_TABS: WorkspaceInspectorTab[] = ["overview", "data", "actions", "config"];

export const SPECIAL_NODE_DIMENSIONS: Record<SpecialTelemetryNodeKind, { w: number; h: number }> = {
  terminal: { w: 1040, h: 720 },
  markdown: { w: 520, h: 344 },
  ai: { w: 420, h: 272 },
  "file-manager": { w: 560, h: 380 },
  "file-viewer": { w: 760, h: 520 },
  browser: { w: 760, h: 520 },
};

export function isCanvasLayer(value: string | null): value is CanvasLayer {
  return value === "map" || value === "flows";
}

export function isPluginId(value: string | null): value is PluginId {
  return (
    value === "analytics" ||
    value === "funnels" ||
    value === "experiments" ||
    value === "feature-flags" ||
    value === "revenue" ||
    value === "engineering" ||
    value === "observability" ||
    value === "insights"
  );
}

export function isInspectorTab(value: string | null): value is WorkspaceInspectorTab {
  return value !== null && INSPECTOR_TABS.includes(value as WorkspaceInspectorTab);
}
