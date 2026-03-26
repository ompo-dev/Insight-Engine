import { useLayoutEffect, useRef } from "react";
import { Bot, FolderKanban, Layers3, Plus, Sparkles, X } from "lucide-react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

interface WorkspaceCanvasDrawerProps {
  open: boolean;
  projectName: string;
  projects: Array<{ id: string; name: string; slug: string }>;
  activeProjectId: string;
  views: Array<{ id: string; name: string; nodeCount: number; updatedAt: string }>;
  activeViewId: string;
  activePersonaLabel: string;
  criticalAlerts: number;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectView: (viewId: string) => void;
  onCreateView: () => void;
  onCyclePersona: () => void;
  onRestorePreset: () => void;
}

export function WorkspaceCanvasDrawer({
  open,
  projectName,
  projects,
  activeProjectId,
  views,
  activeViewId,
  activePersonaLabel,
  criticalAlerts,
  onClose,
  onSelectProject,
  onSelectView,
  onCreateView,
  onCyclePersona,
  onRestorePreset,
}: WorkspaceCanvasDrawerProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) return;
    const staggerItems = panel.querySelectorAll("[data-canvas-drawer-stagger]");

    gsap.killTweensOf([backdrop, panel, ...staggerItems]);

    if (open) {
      gsap.set(backdrop, { pointerEvents: "auto" });
      gsap.fromTo(
        backdrop,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.22, ease: "power2.out" },
      );
      gsap.fromTo(
        panel,
        { autoAlpha: 0, x: -26, y: -18, scale: 0.96 },
        { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.34, ease: "power3.out" },
      );
      gsap.fromTo(
        staggerItems,
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.28,
          ease: "power2.out",
          stagger: 0.04,
          delay: 0.08,
        },
      );
      return;
    }

    gsap.to(panel, {
      autoAlpha: 0,
      x: -18,
      y: -10,
      scale: 0.98,
      duration: 0.2,
      ease: "power2.inOut",
    });
    gsap.to(backdrop, {
      autoAlpha: 0,
      duration: 0.18,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.set(backdrop, { pointerEvents: "none" });
      },
    });
  }, [open]);

  return (
    <div
      ref={backdropRef}
      className="pointer-events-none absolute inset-0 z-40 opacity-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.08),transparent_32%),rgba(0,0,0,0.26)]"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="absolute left-4 top-4 flex h-[min(720px,calc(100vh-2rem))] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#15191f]/96 text-white opacity-0 shadow-[0_36px_90px_rgba(0,0,0,0.52)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Canvas Control</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{projectName}</h2>
              <p className="mt-1 text-sm text-white/45">
                {views.length} workspaces ativos | {activePersonaLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-5">
            <section data-canvas-drawer-stagger className="rounded-[28px] border border-white/8 bg-[#10141a]/82 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Projetos</p>
                  <p className="mt-1 text-sm text-white/55">Troca de projeto sem sair do canvas.</p>
                </div>
                <span className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70">
                  {projects.length}
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                {projects.map((project) => (
                  <button
                    data-canvas-drawer-stagger
                    key={project.id}
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                    className={cn(
                      "flex items-center justify-between rounded-[20px] border px-4 py-3 text-left transition",
                      project.id === activeProjectId
                        ? "border-sky-300/24 bg-sky-400/10 text-white"
                        : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      <p className="truncate text-[11px] text-white/45">{project.slug}</p>
                    </div>
                    <FolderKanban className="h-4 w-4 shrink-0 text-white/45" />
                  </button>
                ))}
              </div>
            </section>

            <section data-canvas-drawer-stagger className="rounded-[28px] border border-white/8 bg-[#10141a]/82 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Workspaces</p>
                  <p className="mt-1 text-sm text-white/55">Tabs do canvas ativas no projeto atual.</p>
                </div>
                <button
                  type="button"
                  onClick={onCreateView}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  Novo
                </button>
              </div>
              <div className="mt-4 grid gap-2">
                {views.map((view) => (
                  <button
                    data-canvas-drawer-stagger
                    key={view.id}
                    type="button"
                    onClick={() => onSelectView(view.id)}
                    className={cn(
                      "flex items-center justify-between rounded-[20px] border px-4 py-3 text-left transition",
                      view.id === activeViewId
                        ? "border-white/14 bg-white/10 text-white"
                        : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{view.name}</p>
                      <p className="truncate text-[11px] text-white/45">
                        {view.nodeCount} nodes | atualizado {formatCompactTime(view.updatedAt)}
                      </p>
                    </div>
                    <Layers3 className="h-4 w-4 shrink-0 text-white/45" />
                  </button>
                ))}
              </div>
            </section>

            <section data-canvas-drawer-stagger className="rounded-[28px] border border-white/8 bg-[#10141a]/82 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Operacao</p>
              <div className="mt-4 grid gap-2">
                <button
                  data-canvas-drawer-stagger
                  type="button"
                  onClick={onCyclePersona}
                  className="flex items-center justify-between rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-left text-white/80 transition hover:bg-white/[0.06]"
                >
                  <div>
                    <p className="text-sm font-medium text-white">Registro do agente</p>
                    <p className="mt-1 text-[11px] text-white/45">{activePersonaLabel}</p>
                  </div>
                  <Bot className="h-4 w-4 text-white/55" />
                </button>

                <button
                  data-canvas-drawer-stagger
                  type="button"
                  onClick={onRestorePreset}
                  className="flex items-center justify-between rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-left text-white/80 transition hover:bg-white/[0.06]"
                >
                  <div>
                    <p className="text-sm font-medium text-white">Restaurar preset</p>
                    <p className="mt-1 text-[11px] text-white/45">Voltar o canvas para a composicao base da persona.</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-white/55" />
                </button>
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-white/8 px-5 py-4">
          <div className="flex items-center justify-between gap-3 text-sm text-white/60">
            <span>{criticalAlerts > 0 ? `${criticalAlerts} alertas criticos` : "Canvas sincronizado"}</span>
            <span>Core Menu</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCompactTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
