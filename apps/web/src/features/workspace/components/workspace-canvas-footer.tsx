import type { ComponentProps } from "react";
import { ChevronDown, CircleHelp, Cloud, Monitor, Plus } from "lucide-react";
import { WorkspaceInlineSwitcher } from "@/components/workspace/WorkspaceInlineSwitcher";
import { WorkspaceNodeDock } from "@/components/workspace/WorkspaceNodeDock";
import {
  CanvasStatusPill,
} from "@/features/workspace/components/canvas-chrome-controls";
import {
  WorkspaceCanvasCounterBadge,
  WorkspaceCanvasGlassPanel,
  WorkspaceCanvasMetaCopy,
} from "@/features/workspace/components/workspace-canvas-shell.primitives";
import type { WorkspaceCanvasChromeItem } from "@/features/workspace/components/workspace-canvas-shell.types";
import { cn } from "@/lib/utils";

export function WorkspaceCanvasFooter({
  hasWorkspaceAlternatives,
  isWorkspaceSwitcherOpen,
  activeProjectName,
  activeViewName,
  activeViewsCount,
  workspaceItems,
  criticalAlerts,
  zoomPercent,
  assistantPrompt,
  onToggleWorkspaceSwitcher,
  onSelectWorkspaceView,
  onCloseWorkspaceSwitcher,
  onCreateWorkspaceTab,
  onAssistantPromptChange,
  onAssistantPromptKeyDown,
  onSubmitPrompt,
  onQuickCreateNode,
  onOpenCatalog,
  onOpenProgramming,
}: {
  hasWorkspaceAlternatives: boolean;
  isWorkspaceSwitcherOpen: boolean;
  activeProjectName: string;
  activeViewName: string;
  activeViewsCount: number;
  workspaceItems: WorkspaceCanvasChromeItem[];
  criticalAlerts: number;
  zoomPercent: number;
  assistantPrompt: string;
  onToggleWorkspaceSwitcher: () => void;
  onSelectWorkspaceView: (viewId: string) => void;
  onCloseWorkspaceSwitcher: () => void;
  onCreateWorkspaceTab: () => void;
  onAssistantPromptChange: (value: string) => void;
  onAssistantPromptKeyDown: ComponentProps<typeof WorkspaceNodeDock>["onPromptKeyDown"];
  onSubmitPrompt: () => void;
  onQuickCreateNode: () => void;
  onOpenCatalog: () => void;
  onOpenProgramming: () => void;
}) {
  const dockActive = false;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20">
        <div
          data-workspace-footer-shell="true"
          data-dock-active={dockActive ? "true" : "false"}
          className="workspace-canvas-footer-shell cq-shell"
        >
          <div className="workspace-canvas-footer-track flex items-end justify-between gap-3">
            <div
              data-workspace-footer-left="true"
              className={cn(
                "workspace-canvas-footer-left pointer-events-auto flex max-w-full flex-col transition-all duration-300",
                dockActive
                  ? "w-[min(304px,calc(100vw-2rem))] gap-2"
                  : "w-[min(384px,calc(100vw-2rem))] gap-3",
              )}
            >
              <div className="workspace-canvas-footer-switcher-row flex w-full items-end gap-2">
                <div className="workspace-canvas-footer-switcher min-w-0">
                  {hasWorkspaceAlternatives ? (
                    <WorkspaceInlineSwitcher
                      open={isWorkspaceSwitcherOpen}
                      placement="above"
                      widthClassName={dockActive ? "w-[236px]" : "w-[320px]"}
                      shellClassName="max-w-[calc(100vw-2rem)] rounded-[24px] border border-white/10 bg-[#16181d]/92 shadow-[0_20px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl"
                      headerClassName={cn(
                        "gap-3 px-4 transition-colors hover:bg-[#1b1f24]/60",
                        dockActive ? "min-h-[50px] py-2.5" : "min-h-[56px] py-3",
                      )}
                      bodyInnerClassName="px-4 pb-4"
                      collapsedWidth={dockActive ? 236 : 320}
                      collapsedHeight={dockActive ? 50 : 56}
                      collapsedRadius={dockActive ? 22 : 24}
                      expandedRadius={28}
                      items={workspaceItems}
                      onToggle={onToggleWorkspaceSwitcher}
                      onSelect={onSelectWorkspaceView}
                      onClose={onCloseWorkspaceSwitcher}
                      trigger={
                        <>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <WorkspaceCanvasCounterBadge value={activeViewsCount} />
                            <WorkspaceCanvasMetaCopy
                              title={activeViewName}
                              subtitle={!dockActive ? activeProjectName : undefined}
                              subtitleClassName="workspace-canvas-footer-project-subtitle"
                            />
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-white/50 transition duration-300",
                              isWorkspaceSwitcherOpen && "rotate-180 text-white/74",
                            )}
                          />
                        </>
                      }
                    />
                  ) : (
                    <WorkspaceCanvasGlassPanel
                      className={cn(
                        "workspace-canvas-footer-workspace-card inline-flex items-center gap-3 px-4 text-left transition-all duration-300",
                        dockActive ? "h-[50px] w-[236px] py-2.5" : "h-14 w-[320px] py-3",
                      )}
                    >
                      <WorkspaceCanvasCounterBadge value={activeViewsCount} />
                      <WorkspaceCanvasMetaCopy
                        title={activeViewName}
                        subtitle={!dockActive ? activeProjectName : undefined}
                        subtitleClassName="workspace-canvas-footer-project-subtitle"
                      />
                    </WorkspaceCanvasGlassPanel>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onCreateWorkspaceTab}
                  className={cn(
                    "workspace-canvas-footer-add-button inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#16181d]/92 text-slate-100 shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-[#1b1f24]",
                    dockActive ? "h-[50px] w-[50px]" : "h-14 w-14",
                  )}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

            </div>

            <div
              data-workspace-footer-right="true"
              className={cn(
                "workspace-canvas-footer-right pointer-events-auto flex items-center transition-all duration-300",
                dockActive ? "gap-1.5" : "gap-2",
              )}
            >
              <CanvasStatusPill
                className="workspace-canvas-footer-status"
                icon={<Cloud className="h-3.5 w-3.5" />}
                label={dockActive ? undefined : criticalAlerts > 0 ? `${criticalAlerts} alertas` : "sync"}
              />
              <CanvasStatusPill
                className="workspace-canvas-footer-status"
                label={`${zoomPercent}%`}
                labelClassName="canvas-status-pill__label--always"
              />
              <CanvasStatusPill
                className="workspace-canvas-footer-status"
                icon={<Monitor className="h-3.5 w-3.5" />}
              />
              <CanvasStatusPill
                className="workspace-canvas-footer-status"
                icon={<CircleHelp className="h-3.5 w-3.5" />}
              />
            </div>
          </div>
        </div>
      </div>

      <WorkspaceNodeDock
        expanded={false}
        node={null}
        presentation={null}
        assistantPrompt={assistantPrompt}
        onPromptChange={onAssistantPromptChange}
        onPromptKeyDown={onAssistantPromptKeyDown}
        onSubmit={onSubmitPrompt}
        onQuickCreate={onQuickCreateNode}
        onOpenCatalog={onOpenCatalog}
        onOpenProgramming={onOpenProgramming}
        onCloseNode={() => {}}
        inspectorContent={null}
      />
    </>
  );
}
