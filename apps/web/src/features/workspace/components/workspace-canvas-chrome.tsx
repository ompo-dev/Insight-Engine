import type {
  ComponentProps,
  FocusEventHandler,
  KeyboardEventHandler,
  RefObject,
} from "react";
import { WorkspaceNodeDock } from "@/components/workspace/WorkspaceNodeDock";
import { WorkspaceCanvasActionDock } from "@/features/workspace/components/workspace-canvas-action-dock";
import { WorkspaceCanvasFooter } from "@/features/workspace/components/workspace-canvas-footer";
import { WorkspaceCanvasHeader } from "@/features/workspace/components/workspace-canvas-header";
import { WorkspaceCanvasNodeActionDock } from "@/features/workspace/components/workspace-canvas-node-action-dock";
import type { WorkspaceCanvasChromeItem } from "@/features/workspace/components/workspace-canvas-shell.types";
import type { CanvasNode, WorkspaceNodePresentation } from "@/lib/workspace/types";

export function WorkspaceCanvasChrome({
  hasProjectAlternatives,
  hasWorkspaceAlternatives,
  isProjectSwitcherOpen,
  isWorkspaceSwitcherOpen,
  isProjectMetaEditing,
  isProjectCreating,
  selectedNode,
  selectedPresentation,
  canvasInteractionMode,
  projectDraftName,
  projectDraftDescription,
  activeProjectName,
  projectSubtitle,
  activeViewName,
  activeViewsCount,
  activeViewNodesCount: _activeViewNodesCount,
  projectItems,
  workspaceItems,
  criticalAlerts,
  zoomPercent,
  projectNameInputRef,
  onProjectMetaBlur,
  onProjectNameChange,
  onProjectDescriptionChange,
  onProjectMetaKeyDown,
  onStartProjectMetaEditing,
  onToggleProjectSwitcher,
  onSelectProject,
  onCloseProjectSwitcher,
  onCreateProject,
  onRunCanvas,
  onExportWorkspace,
  onShareWorkspace,
  onEditSelectedNode,
  onOpenSelectedNodeData,
  onOpenSelectedNodeActions,
  onRemoveSelectedNode,
  onClearSelectedNodeFocus,
  onToggleWorkspaceSwitcher,
  onSelectWorkspaceView,
  onCloseWorkspaceSwitcher,
  onCreateWorkspaceTab,
  onSetSelectMode,
  onOpenCommand,
  onOpenProgramming,
  onSetPanMode,
  onOpenCatalog,
  onRestorePreset,
  assistantPrompt,
  onAssistantPromptChange,
  onAssistantPromptKeyDown,
  onSubmitPrompt,
  onQuickCreateNode,
}: {
  hasProjectAlternatives: boolean;
  hasWorkspaceAlternatives: boolean;
  isProjectSwitcherOpen: boolean;
  isWorkspaceSwitcherOpen: boolean;
  isProjectMetaEditing: boolean;
  isProjectCreating: boolean;
  selectedNode: CanvasNode | null;
  selectedPresentation: WorkspaceNodePresentation | null;
  canvasInteractionMode: "select" | "pan";
  projectDraftName: string;
  projectDraftDescription: string;
  activeProjectName: string;
  projectSubtitle: string;
  activeViewName: string;
  activeViewsCount: number;
  activeViewNodesCount: number;
  projectItems: WorkspaceCanvasChromeItem[];
  workspaceItems: WorkspaceCanvasChromeItem[];
  criticalAlerts: number;
  zoomPercent: number;
  projectNameInputRef: RefObject<HTMLInputElement | null>;
  onProjectMetaBlur: FocusEventHandler<HTMLDivElement>;
  onProjectNameChange: (value: string) => void;
  onProjectDescriptionChange: (value: string) => void;
  onProjectMetaKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onStartProjectMetaEditing: () => void;
  onToggleProjectSwitcher: () => void;
  onSelectProject: (projectId: string) => void;
  onCloseProjectSwitcher: () => void;
  onCreateProject: () => void;
  onRunCanvas: () => void;
  onExportWorkspace: () => void;
  onShareWorkspace: () => void;
  onEditSelectedNode: () => void;
  onOpenSelectedNodeData: () => void;
  onOpenSelectedNodeActions: () => void;
  onRemoveSelectedNode: () => void;
  onClearSelectedNodeFocus: () => void;
  onToggleWorkspaceSwitcher: () => void;
  onSelectWorkspaceView: (viewId: string) => void;
  onCloseWorkspaceSwitcher: () => void;
  onCreateWorkspaceTab: () => void;
  onSetSelectMode: () => void;
  onOpenCommand: () => void;
  onOpenProgramming: () => void;
  onSetPanMode: () => void;
  onOpenCatalog: () => void;
  onRestorePreset: () => void;
  assistantPrompt: string;
  onAssistantPromptChange: (value: string) => void;
  onAssistantPromptKeyDown: ComponentProps<typeof WorkspaceNodeDock>["onPromptKeyDown"];
  onSubmitPrompt: () => void;
  onQuickCreateNode: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.22)_42%,rgba(0,0,0,0)_100%)]" />

      <WorkspaceCanvasHeader
        hasProjectAlternatives={hasProjectAlternatives}
        isProjectSwitcherOpen={isProjectSwitcherOpen}
        isProjectMetaEditing={isProjectMetaEditing}
        isProjectCreating={isProjectCreating}
        projectDraftName={projectDraftName}
        projectDraftDescription={projectDraftDescription}
        activeProjectName={activeProjectName}
        projectSubtitle={projectSubtitle}
        projectItems={projectItems}
        projectNameInputRef={projectNameInputRef}
        onProjectMetaBlur={onProjectMetaBlur}
        onProjectNameChange={onProjectNameChange}
        onProjectDescriptionChange={onProjectDescriptionChange}
        onProjectMetaKeyDown={onProjectMetaKeyDown}
        onStartProjectMetaEditing={onStartProjectMetaEditing}
        onToggleProjectSwitcher={onToggleProjectSwitcher}
        onSelectProject={onSelectProject}
        onCloseProjectSwitcher={onCloseProjectSwitcher}
        onCreateProject={onCreateProject}
        onRunCanvas={onRunCanvas}
        onExportWorkspace={onExportWorkspace}
        onShareWorkspace={onShareWorkspace}
        nodeActionDock={
          selectedNode && selectedPresentation ? (
            <WorkspaceCanvasNodeActionDock
              key={selectedNode.id}
              presentation={selectedPresentation}
              onEdit={onEditSelectedNode}
              onOpenData={onOpenSelectedNodeData}
              onOpenActions={onOpenSelectedNodeActions}
              onRemove={onRemoveSelectedNode}
              onClearFocus={onClearSelectedNodeFocus}
            />
          ) : null
        }
      />

      <WorkspaceCanvasActionDock
        canvasInteractionMode={canvasInteractionMode}
        onSetSelectMode={onSetSelectMode}
        onOpenCommand={onOpenCommand}
        onOpenProgramming={onOpenProgramming}
        onSetPanMode={onSetPanMode}
        onOpenCatalog={onOpenCatalog}
        onRestorePreset={onRestorePreset}
      />

      <WorkspaceCanvasFooter
        hasWorkspaceAlternatives={hasWorkspaceAlternatives}
        isWorkspaceSwitcherOpen={isWorkspaceSwitcherOpen}
        activeProjectName={activeProjectName}
        activeViewName={activeViewName}
        activeViewsCount={activeViewsCount}
        workspaceItems={workspaceItems}
        criticalAlerts={criticalAlerts}
        zoomPercent={zoomPercent}
        assistantPrompt={assistantPrompt}
        onToggleWorkspaceSwitcher={onToggleWorkspaceSwitcher}
        onSelectWorkspaceView={onSelectWorkspaceView}
        onCloseWorkspaceSwitcher={onCloseWorkspaceSwitcher}
        onCreateWorkspaceTab={onCreateWorkspaceTab}
        onAssistantPromptChange={onAssistantPromptChange}
        onAssistantPromptKeyDown={onAssistantPromptKeyDown}
        onSubmitPrompt={onSubmitPrompt}
        onQuickCreateNode={onQuickCreateNode}
        onOpenCatalog={onOpenCatalog}
        onOpenProgramming={onOpenProgramming}
      />
    </div>
  );
}
