import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ellipsis,
  Hand,
  Image,
  MousePointer2,
  Pencil,
  Sparkles,
  Star,
} from "lucide-react";
import { CanvasToolButton } from "@/features/workspace/components/canvas-chrome-controls";
import {
  WorkspaceCanvasDock,
  type WorkspaceCanvasDockAction,
} from "@/features/workspace/components/workspace-canvas-dock";
import { cn } from "@/lib/utils";

type WorkspaceActionDockActionId =
  | "select"
  | "command"
  | "program"
  | "pan"
  | "catalog"
  | "preset";

export function WorkspaceCanvasActionDock({
  canvasInteractionMode,
  onSetSelectMode,
  onOpenCommand,
  onOpenProgramming,
  onSetPanMode,
  onOpenCatalog,
  onRestorePreset,
}: {
  canvasInteractionMode: "select" | "pan";
  onSetSelectMode: () => void;
  onOpenCommand: () => void;
  onOpenProgramming: () => void;
  onSetPanMode: () => void;
  onOpenCatalog: () => void;
  onRestorePreset: () => void;
}) {
  const persistentActionId: WorkspaceActionDockActionId =
    canvasInteractionMode === "pan" ? "pan" : "select";
  const [mobileActionId, setMobileActionId] =
    useState<WorkspaceActionDockActionId>(persistentActionId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileRootRef = useRef<HTMLDivElement | null>(null);

  const actions = useMemo<WorkspaceCanvasDockAction[]>(
    () => [
      {
        id: "select",
        label: "Selecionar",
        icon: <MousePointer2 className="h-4 w-4" />,
        active: canvasInteractionMode === "select",
        onClick: onSetSelectMode,
      },
      {
        id: "command",
        label: "Comando",
        icon: <Sparkles className="h-4 w-4" />,
        onClick: onOpenCommand,
      },
      {
        id: "program",
        label: "Programar",
        icon: <Pencil className="h-4 w-4" />,
        onClick: onOpenProgramming,
      },
      {
        id: "pan",
        label: "Mover",
        icon: <Hand className="h-4 w-4" />,
        active: canvasInteractionMode === "pan",
        onClick: onSetPanMode,
      },
      {
        id: "catalog",
        label: "Catalogo",
        icon: <Image className="h-4 w-4" />,
        onClick: onOpenCatalog,
      },
      {
        id: "preset",
        label: "Preset",
        icon: <Star className="h-4 w-4" />,
        onClick: onRestorePreset,
      },
    ],
    [
      canvasInteractionMode,
      onOpenCatalog,
      onOpenCommand,
      onOpenProgramming,
      onRestorePreset,
      onSetPanMode,
      onSetSelectMode,
    ],
  );

  useEffect(() => {
    setMobileActionId((current) => {
      if (current === "select" || current === "pan") {
        return persistentActionId;
      }
      return current;
    });
  }, [persistentActionId]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && mobileRootRef.current?.contains(target)) return;
      setMobileMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  const activeMobileAction =
    actions.find((action) => action.id === mobileActionId) ??
    actions.find((action) => action.id === persistentActionId) ??
    actions[0];
  const mobileActions = actions.filter((action) => action.id !== activeMobileAction.id);

  const handleSelectMobileAction = (action: WorkspaceCanvasDockAction) => {
    action.onClick();
    setMobileActionId(action.id as WorkspaceActionDockActionId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-x-4 top-[116px] z-20 flex justify-end lg:hidden">
        <div
          ref={mobileRootRef}
          data-workspace-action-dock-shell="mobile"
          className="workspace-canvas-action-dock-mobile-shell cq-panel pointer-events-auto relative w-full max-w-[340px]"
        >
          <div
            className={cn(
              "workspace-canvas-action-dock-mobile flex max-w-full rounded-[26px] border border-white/10 bg-[#16181d]/94 px-2 py-2 shadow-[0_24px_56px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition-all duration-200",
              mobileMenuOpen
                ? "w-full flex-wrap items-start gap-2"
                : "ml-auto w-fit items-center gap-2 overflow-hidden",
            )}
          >
            <CanvasToolButton
              className="shrink-0"
              icon={activeMobileAction.icon}
              label={activeMobileAction.label}
              active
              onClick={activeMobileAction.onClick}
            />
            <CanvasToolButton
              icon={<Ellipsis className="h-4 w-4" />}
              label="Mais acoes"
              active={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
            />
            {mobileMenuOpen ? (
              <>
                <div className="basis-full h-px bg-white/8" />
                <div className="flex w-full flex-wrap gap-2">
                  {mobileActions.map((action) => (
                    <CanvasToolButton
                      key={action.id}
                      icon={action.icon}
                      label={action.label}
                      active={Boolean(action.active)}
                      onClick={() => handleSelectMobileAction(action)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 lg:flex">
        <div
          data-workspace-action-dock-shell="desktop"
          className="workspace-canvas-action-dock-desktop-shell pointer-events-auto"
        >
          <WorkspaceCanvasDock
            actions={actions}
            className="workspace-canvas-action-dock-desktop-surface max-h-[calc(100dvh-140px)] w-[60px] overflow-y-auto shadow-[0_24px_56px_rgba(0,0,0,0.34)]"
            splitAfter={5}
          />
        </div>
      </div>
    </>
  );
}
