import type { CanvasLayer, PluginId, WorkspaceInspectorTab } from "@/lib/workspace/types";

export interface WorkspaceNavigationTarget {
  plugin?: PluginId;
  layer?: CanvasLayer;
  tab?: WorkspaceInspectorTab;
}

export function buildWorkspaceHref(
  projectId: string,
  target: WorkspaceNavigationTarget = {},
) {
  const searchParams = new URLSearchParams();

  if (target.plugin) {
    searchParams.set("plugin", target.plugin);
  }

  if (target.layer) {
    searchParams.set("layer", target.layer);
  }

  if (target.tab) {
    searchParams.set("tab", target.tab);
  }

  const query = searchParams.toString();
  return `/projects/${projectId}${query ? `?${query}` : ""}`;
}
