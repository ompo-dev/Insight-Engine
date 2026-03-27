import type { ComponentProps, ReactNode } from "react";
import { WorkspaceCanvas } from "@/components/workspace/WorkspaceCanvas";

type WorkspaceCanvasProps = ComponentProps<typeof WorkspaceCanvas>;

type WorkspaceCanvasSceneProps = Pick<
  WorkspaceCanvasProps,
  | "view"
  | "edges"
  | "selectedNodeId"
  | "presentationsByNodeId"
  | "itemsById"
  | "fileAssetsById"
  | "projectAssets"
  | "interactionMode"
  | "onSelectNode"
  | "onMoveNode"
  | "onResizeNode"
  | "onSetViewport"
  | "onClearSelection"
  | "onConnectNodes"
  | "onCreateItem"
  | "onSyncTerminalState"
  | "onUploadFilesToItem"
  | "onSelectFileManagerAsset"
  | "onRenameFileAsset"
  | "onDeleteFileAsset"
  | "onOpenAssetAsNode"
  | "onSelectFileViewerSheet"
  | "onBrowserNavigate"
  | "onBrowserBack"
  | "onBrowserForward"
  | "onBrowserRefresh"
  | "onBrowserSnapshot"
  | "onConfigureItem"
  | "onRemoveNode"
  | "onDisconnectEdge"
> & {
  chrome: ReactNode;
  loading?: boolean;
};

export function WorkspaceCanvasScene({
  view,
  edges,
  selectedNodeId,
  presentationsByNodeId,
  itemsById,
  fileAssetsById,
  projectAssets,
  interactionMode,
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
  chrome,
  loading = false,
}: WorkspaceCanvasSceneProps) {
  return (
    <div
      className="relative h-[100dvh] overflow-hidden bg-[#17191e] text-white"
      onWheelCapture={(event) => {
        if (!event.ctrlKey && !event.metaKey) return;

        const target = event.target as HTMLElement | null;
        if (!target?.closest("[data-workspace-chrome='true']")) return;

        event.preventDefault();
      }}
      >
      <WorkspaceCanvas
        view={view}
        edges={edges}
        selectedNodeId={selectedNodeId}
        presentationsByNodeId={presentationsByNodeId}
        itemsById={itemsById}
        fileAssetsById={fileAssetsById}
        projectAssets={projectAssets}
        chrome="immersive"
        interactionMode={interactionMode}
        onSelectNode={onSelectNode}
        onMoveNode={onMoveNode}
        onResizeNode={onResizeNode}
        onSetViewport={onSetViewport}
        onClearSelection={onClearSelection}
        onConnectNodes={onConnectNodes}
        onCreateItem={onCreateItem}
        onSyncTerminalState={onSyncTerminalState}
        onUploadFilesToItem={onUploadFilesToItem}
        onSelectFileManagerAsset={onSelectFileManagerAsset}
        onRenameFileAsset={onRenameFileAsset}
        onDeleteFileAsset={onDeleteFileAsset}
        onOpenAssetAsNode={onOpenAssetAsNode}
        onSelectFileViewerSheet={onSelectFileViewerSheet}
        onBrowserNavigate={onBrowserNavigate}
        onBrowserBack={onBrowserBack}
        onBrowserForward={onBrowserForward}
        onBrowserRefresh={onBrowserRefresh}
        onBrowserSnapshot={onBrowserSnapshot}
        onConfigureItem={onConfigureItem}
        onRemoveNode={onRemoveNode}
        onDisconnectEdge={onDisconnectEdge}
        loading={loading}
      />

      <div data-workspace-chrome="true">{chrome}</div>
    </div>
  );
}
