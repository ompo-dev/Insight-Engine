import {
  useLayoutEffect,
  useRef,
  type KeyboardEventHandler,
  type ReactNode,
} from "react";
import { Bot, Plus, Sparkles, Pencil, X } from "lucide-react";
import { gsap } from "gsap";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CanvasNode,
  WorkspaceNodePresentation,
} from "@/lib/workspace/types";

interface WorkspaceNodeDockProps {
  expanded: boolean;
  node: CanvasNode | null;
  presentation: WorkspaceNodePresentation | null;
  assistantPrompt: string;
  activePersonaLabel: string;
  onPromptChange: (value: string) => void;
  onPromptKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onSubmit: () => void;
  onQuickCreate: () => void;
  onOpenCatalog: () => void;
  onOpenProgramming: () => void;
  onCyclePersona: () => void;
  onCloseNode: () => void;
  inspectorContent: ReactNode;
}

export function WorkspaceNodeDock({
  expanded,
  node,
  presentation,
  assistantPrompt,
  activePersonaLabel,
  onPromptChange,
  onPromptKeyDown,
  onSubmit,
  onQuickCreate,
  onOpenCatalog,
  onOpenProgramming,
  onCyclePersona,
  onCloseNode,
  inspectorContent,
}: WorkspaceNodeDockProps) {
  const FocusIcon = presentation?.icon;
  const shellRef = useRef<HTMLFormElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const inspectorRef = useRef<HTMLDivElement | null>(null);
  const intakeGhostRef = useRef<HTMLElement | null>(null);
  const intakeTweenRef = useRef<gsap.core.Tween | null>(null);
  const previousExpandedRef = useRef(false);
  const previousNodeIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const composer = composerRef.current;
    const content = contentRef.current;
    const preview = previewRef.current;
    const inspector = inspectorRef.current;
    if (!shell || !composer || !content) return;

    const collapsedHeight = Math.ceil(
      composer.getBoundingClientRect().height + 32,
    );
    const expandedHeight = Math.min(window.innerHeight - 32, 748);
    const previousExpanded = previousExpandedRef.current;
    const previousNodeId = previousNodeIdRef.current;
    const nextNodeId = node?.id ?? null;
    const shouldAnimateOpen =
      Boolean(expanded && node && presentation && preview && inspector) &&
      (!previousExpanded || previousNodeId !== nextNodeId);

    gsap.killTweensOf([shell, content, preview, inspector].filter(Boolean));
    intakeTweenRef.current?.kill();
    intakeGhostRef.current?.remove();
    intakeGhostRef.current = null;

    if (expanded && node && presentation && preview && inspector) {
      if (!shouldAnimateOpen) {
        gsap.set(shell, { height: expandedHeight });
        gsap.set(content, { autoAlpha: 1, y: 0 });
        gsap.set(preview, { autoAlpha: 1, y: 0, scale: 1 });
        gsap.set(inspector, { autoAlpha: 1, y: 0 });
        previousExpandedRef.current = true;
        previousNodeIdRef.current = nextNodeId;
        return;
      }

      gsap.set(content, { autoAlpha: 0, y: 18 });
      gsap.set(preview, { autoAlpha: 0, y: 18, scale: 0.97 });
      gsap.set(inspector, { autoAlpha: 0, y: 28 });

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .to(shell, {
          height: expandedHeight,
          duration: 0.42,
        })
        .to(
          content,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.24,
          },
          0.08,
        )
        .to(
          preview,
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.28,
          },
          0.12,
        )
        .to(
          inspector,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.28,
          },
          0.2,
        );

      const source = document.querySelector(
        `[data-workspace-node-id="${node.id}"]`,
      ) as HTMLElement | null;
      if (source) {
        const sourceRect = source.getBoundingClientRect();
        const targetRect = preview.getBoundingClientRect();
        const ghost = source.cloneNode(true) as HTMLElement;

        ghost.style.position = "fixed";
        ghost.style.left = `${sourceRect.left}px`;
        ghost.style.top = `${sourceRect.top}px`;
        ghost.style.width = `${sourceRect.width}px`;
        ghost.style.height = `${sourceRect.height}px`;
        ghost.style.margin = "0";
        ghost.style.pointerEvents = "none";
        ghost.style.zIndex = "80";
        ghost.style.overflow = "hidden";
        ghost.style.borderRadius = "28px";
        ghost.style.filter = "drop-shadow(0 28px 58px rgba(0,0,0,0.34))";
        ghost.classList.add("workspace-node-intake-ghost");
        document.body.appendChild(ghost);

        intakeGhostRef.current = ghost;
        intakeTweenRef.current = gsap.to(ghost, {
          left: targetRect.left,
          top: targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: 32,
          opacity: 0.14,
          filter: "blur(10px)",
          duration: 0.44,
          ease: "power3.out",
          onComplete: () => {
            ghost.remove();
            if (intakeGhostRef.current === ghost) {
              intakeGhostRef.current = null;
            }
          },
        });
      }

      return () => {
        timeline.kill();
        intakeTweenRef.current?.kill();
        intakeGhostRef.current?.remove();
        intakeGhostRef.current = null;
      };
    }

    if (inspector) {
      gsap.to(inspector, {
        autoAlpha: 0,
        y: 18,
        duration: 0.18,
        ease: "power2.inOut",
      });
    }
    if (preview) {
      gsap.to(preview, {
        autoAlpha: 0,
        y: 18,
        duration: 0.18,
        ease: "power2.inOut",
      });
    }
    gsap.to(content, {
      autoAlpha: 0,
      y: 12,
      duration: 0.18,
      ease: "power2.inOut",
    });
    gsap.to(shell, {
      height: collapsedHeight,
      duration: 0.3,
      ease: "power3.out",
    });
    return () => {
      intakeTweenRef.current?.kill();
      intakeGhostRef.current?.remove();
      intakeGhostRef.current = null;
    };
  }, [expanded, node?.id]);

  useLayoutEffect(() => {
    previousExpandedRef.current = expanded;
    previousNodeIdRef.current = node?.id ?? null;
  }, [expanded, node?.id]);

  return (
    <form
      ref={shellRef}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="pointer-events-auto absolute bottom-6 left-1/2 z-30 flex h-fit w-[min(820px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#16181d]/95 p-4 text-white shadow-[0_34px_82px_rgba(0,0,0,0.46)] backdrop-blur-2xl"
    >
      <div
        ref={composerRef}
        className={cn(expanded ? "mb-6" : "mb-0 border-b-0 pb-0")}
      >
        <textarea
          value={assistantPrompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={onPromptKeyDown}
          placeholder="O que voce quer mudar ou criar?"
          className="max-h-fit w-full resize-none border-0 bg-transparent px-2 text-[15px] text-slate-100 outline-none placeholder:text-slate-500"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DockChip
              icon={<Plus className="h-4 w-4" />}
              label="Novo node"
              onClick={onQuickCreate}
            />
            <DockChip
              icon={<Pencil className="h-4 w-4" />}
              label="Programar"
              onClick={onOpenProgramming}
            />
          </div>
          <div className="flex items-center gap-2">
            <DockChip
              icon={<Bot className="h-4 w-4" />}
              label={activePersonaLabel}
              onClick={onCyclePersona}
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/12 px-4 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/18"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>

      <div
        ref={contentRef}
        className="min-h-0 flex-1 overflow-hidden opacity-0"
      >
        {node && presentation ? (
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div ref={previewRef} className="opacity-0">
              <div className="flex items-start justify-between gap-4 rounded-[28px] border border-white/8 bg-[#10141a]/82 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Node Focus
                  </p>
                  <div className="mt-2 flex min-w-0 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-white/8 bg-[#0f141b]">
                      {FocusIcon ? (
                        <FocusIcon
                          className={cn(
                            "h-5 w-5",
                            presentation.accentClassName,
                          )}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold tracking-tight text-white">
                        {presentation.title}
                      </h3>
                      <p className="truncate text-sm text-white/46">
                        {presentation.subtitle || presentation.kindLabel}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusChipClass(presentation.status)}>
                    {presentation.badgeLabel ?? presentation.status}
                  </Badge>
                  <button
                    type="button"
                    onClick={onCloseNode}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={inspectorRef}
              className="min-h-0 flex-1 overflow-hidden opacity-0"
            >
              {inspectorContent}
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function DockChip({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/8"
    >
      <span className="text-white/70">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function statusChipClass(status: WorkspaceNodePresentation["status"]) {
  if (status === "healthy")
    return "border border-emerald-300/18 bg-emerald-400/[0.1] text-emerald-100";
  if (status === "attention")
    return "border border-amber-300/18 bg-amber-400/[0.1] text-amber-100";
  if (status === "draft")
    return "border border-violet-300/18 bg-violet-400/[0.1] text-violet-100";
  return "border border-white/8 bg-white/[0.04] text-white/62";
}
