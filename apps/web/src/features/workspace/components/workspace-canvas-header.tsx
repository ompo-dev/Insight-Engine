import type { FocusEventHandler, KeyboardEventHandler, ReactNode, RefObject } from "react";
import { Download, Menu, Plus, Share2 } from "lucide-react";
import { WorkspaceInlineSwitcher } from "@/components/workspace/WorkspaceInlineSwitcher";
import { CanvasChromeButton } from "@/features/workspace/components/canvas-chrome-controls";
import { WorkspaceCanvasGlassPanel } from "@/features/workspace/components/workspace-canvas-shell.primitives";
import type { WorkspaceCanvasChromeItem } from "@/features/workspace/components/workspace-canvas-shell.types";

export function WorkspaceCanvasHeader({
  hasProjectAlternatives,
  isProjectSwitcherOpen,
  isProjectMetaEditing,
  isProjectCreating,
  projectDraftName,
  projectDraftDescription,
  activeProjectName,
  projectSubtitle,
  projectItems,
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
  nodeActionDock,
}: {
  hasProjectAlternatives: boolean;
  isProjectSwitcherOpen: boolean;
  isProjectMetaEditing: boolean;
  isProjectCreating: boolean;
  projectDraftName: string;
  projectDraftDescription: string;
  activeProjectName: string;
  projectSubtitle: string;
  projectItems: WorkspaceCanvasChromeItem[];
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
  nodeActionDock?: ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-20">
      <div
        data-workspace-header-shell="true"
        className="workspace-canvas-header-shell cq-shell relative flex flex-wrap items-start justify-between gap-3"
      >
        <div className="workspace-canvas-header-leading pointer-events-auto order-1 flex min-w-0 flex-1 items-start gap-3">
          {hasProjectAlternatives ? (
            <WorkspaceInlineSwitcher
              open={isProjectSwitcherOpen}
              placement="below"
              widthClassName="w-[min(360px,calc(100vw-2rem))]"
              shellClassName="max-w-[calc(100vw-2rem)] rounded-full border border-white/10 bg-[#15181c]/88 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl"
              headerClassName="h-12 w-12 items-center justify-center p-0 transition-colors hover:bg-[#1a1f24]/60"
              bodyInnerClassName="px-3 pb-3"
              collapseTriggerWhenOpen
              collapsedWidth={48}
              collapsedHeight={48}
              collapsedRadius={999}
              expandedRadius={26}
              items={projectItems}
              onToggle={onToggleProjectSwitcher}
              onSelect={onSelectProject}
              onClose={onCloseProjectSwitcher}
              trigger={<Menu className="h-5 w-5 text-slate-200" />}
            />
          ) : (
            <button
              type="button"
              onClick={onCreateProject}
              disabled={isProjectCreating}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#15181c]/88 text-slate-200 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-[#1a1f24]/60 disabled:cursor-wait disabled:opacity-70"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}

          <div
            className="workspace-canvas-header-meta min-w-0 flex-1"
            onBlur={onProjectMetaBlur}
          >
            {isProjectMetaEditing ? (
              <WorkspaceCanvasGlassPanel className="workspace-canvas-header-meta-card flex min-w-[260px] max-w-[420px] flex-col gap-1 rounded-[20px] bg-[#15181c]/76 px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.28)]">
                <input
                  ref={projectNameInputRef}
                  value={projectDraftName}
                  onChange={(event) => onProjectNameChange(event.target.value)}
                  onKeyDown={onProjectMetaKeyDown}
                  className="h-7 bg-transparent text-[15px] font-semibold tracking-tight text-white outline-none placeholder:text-white/30"
                  placeholder="Nome do projeto"
                />
                <input
                  value={projectDraftDescription}
                  onChange={(event) =>
                    onProjectDescriptionChange(event.target.value)
                  }
                  onKeyDown={onProjectMetaKeyDown}
                  className="h-6 bg-transparent text-xs text-white/55 outline-none placeholder:text-white/28"
                  placeholder="Subtitulo do projeto"
                />
              </WorkspaceCanvasGlassPanel>
            ) : (
              <button
                type="button"
                onClick={onStartProjectMetaEditing}
                className="workspace-canvas-header-meta-card block min-w-[220px] max-w-[420px] rounded-[20px] px-3 py-2 text-left transition hover:bg-white/[0.04]"
              >
                <p className="truncate text-[15px] font-semibold tracking-tight text-white">
                  {activeProjectName}
                </p>
                <p className="workspace-canvas-header-title-subtitle truncate text-xs text-white/50">
                  {projectSubtitle}
                </p>
              </button>
            )}
          </div>
        </div>

        {nodeActionDock ? (
          <div className="workspace-canvas-header-node-dock pointer-events-auto order-3 flex basis-full justify-center md:absolute md:left-1/2 md:top-0 md:z-10 md:w-max md:max-w-[calc(100%-28rem)] md:-translate-x-1/2 md:basis-auto">
            {nodeActionDock}
          </div>
        ) : null}

        <div className="workspace-canvas-header-actions pointer-events-auto order-2 ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <CanvasChromeButton
            className="workspace-canvas-header-action"
            icon={<Download className="h-4 w-4" />}
            label="Exportar"
            onClick={onExportWorkspace}
          />
          <CanvasChromeButton
            className="workspace-canvas-header-action"
            icon={<Share2 className="h-4 w-4" />}
            label="Compartilhar"
            onClick={onShareWorkspace}
          />
        </div>
      </div>
    </div>
  );
}
