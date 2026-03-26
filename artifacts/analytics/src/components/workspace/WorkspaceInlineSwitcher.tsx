import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

interface WorkspaceInlineSwitcherItem {
  id: string;
  label: string;
  description?: string;
  active?: boolean;
}

interface WorkspaceInlineSwitcherProps {
  open: boolean;
  placement?: "above" | "below";
  widthClassName?: string;
  shellClassName?: string;
  headerClassName?: string;
  bodyInnerClassName?: string;
  collapseTriggerWhenOpen?: boolean;
  collapsedWidth?: number;
  collapsedHeight?: number;
  collapsedRadius?: number;
  expandedRadius?: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  trigger: ReactNode;
  items: WorkspaceInlineSwitcherItem[];
  actionLabel?: string;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onAction?: () => void;
  onClose: () => void;
}

export function WorkspaceInlineSwitcher({
  open,
  placement = "below",
  widthClassName = "w-[min(360px,calc(100vw-1.5rem))]",
  shellClassName,
  headerClassName,
  bodyInnerClassName,
  collapseTriggerWhenOpen = false,
  collapsedWidth = 80,
  collapsedHeight = 80,
  collapsedRadius = 28,
  expandedRadius = 34,
  title,
  subtitle,
  badge,
  trigger,
  items,
  actionLabel,
  onToggle,
  onSelect,
  onAction,
  onClose,
}: WorkspaceInlineSwitcherProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLButtonElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const bodyInnerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const measure = measureRef.current;
    const header = headerRef.current;
    const body = bodyRef.current;
    const bodyInner = bodyInnerRef.current;
    if (!shell || !measure || !header || !body || !bodyInner) return;

    const itemNodes = Array.from(bodyInner.querySelectorAll("[data-switcher-item]"));
    const closedHeight = Math.max(collapsedHeight, header.offsetHeight);
    const targetHeaderHeight = open && collapseTriggerWhenOpen ? 0 : closedHeight;
    const expandedWidth = Math.max(collapsedWidth, measure.offsetWidth);
    const contentHeight = bodyInner.scrollHeight;
    const expandedHeight = targetHeaderHeight + contentHeight;
    const directionY = placement === "below" ? 14 : -14;

    gsap.killTweensOf([shell, header, body, ...itemNodes]);

    if (open) {
      gsap.set(body, { pointerEvents: "auto" });
      gsap.to(header, {
        height: targetHeaderHeight,
        autoAlpha: collapseTriggerWhenOpen ? 0 : 1,
        duration: 0.16,
        ease: "power3.out",
      });
      gsap.to(shell, {
        width: expandedWidth,
        height: expandedHeight,
        borderRadius: expandedRadius,
        duration: 0.24,
        ease: "power4.out",
      });
      gsap.fromTo(
        body,
        { height: 0, autoAlpha: 0 },
        {
          height: contentHeight,
          autoAlpha: 1,
          duration: 0.18,
          delay: 0.02,
          ease: "power3.out",
        },
      );
      gsap.fromTo(
        itemNodes,
        { autoAlpha: 0, y: directionY, filter: "blur(10px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.14,
          ease: "power3.out",
          stagger: 0.018,
          delay: 0.05,
        },
      );
      return;
    }

    gsap.to(header, {
      height: closedHeight,
      autoAlpha: 1,
      duration: 0.14,
      ease: "power2.out",
    });
    gsap.to(itemNodes, {
      autoAlpha: 0,
      y: directionY * 0.7,
      filter: "blur(8px)",
      duration: 0.16,
      ease: "power2.inOut",
      stagger: 0.012,
    });
    gsap.to(body, {
      height: 0,
      autoAlpha: 0,
      pointerEvents: "none",
      duration: 0.14,
      ease: "power2.in",
    });
    gsap.to(shell, {
      width: collapsedWidth,
      height: closedHeight,
      borderRadius: collapsedRadius,
      duration: 0.18,
      ease: "power3.out",
    });
  }, [collapsedHeight, collapsedRadius, collapsedWidth, expandedRadius, open, placement, items.length]);

  const hasMeta = Boolean(title || subtitle || badge || (actionLabel && onAction));

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <div ref={measureRef} className={cn("pointer-events-none invisible absolute left-0 top-0 -z-10", widthClassName)} />
      <div
        ref={shellRef}
        className={cn(
          "relative z-40 flex overflow-hidden text-white",
          placement === "below" ? "flex-col" : "flex-col-reverse",
          shellClassName,
        )}
        style={{ width: collapsedWidth, height: collapsedHeight, borderRadius: collapsedRadius }}
      >
        <button
          ref={headerRef}
          type="button"
          onClick={onToggle}
          className={cn("relative z-10 flex w-full shrink-0 overflow-hidden items-center text-left", headerClassName)}
        >
          {trigger}
        </button>

        <div
          ref={bodyRef}
          className="relative z-10 h-0 overflow-hidden opacity-0"
          style={{ pointerEvents: "none" }}
        >
          <div
            ref={bodyInnerRef}
            className={cn(
              hasMeta
                ? placement === "below"
                  ? "border-t border-white/10 px-4 pb-4 pt-4"
                  : "border-b border-white/10 px-4 pb-4 pt-3"
                : "p-2.5",
              bodyInnerClassName,
            )}
          >
            {hasMeta ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {title ? <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">{title}</p> : null}
                  {subtitle ? <p className="mt-2 text-sm leading-6 text-white/58">{subtitle}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {badge ? (
                    <span className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-medium text-white/72">
                      {badge}
                    </span>
                  ) : null}
                  {actionLabel && onAction ? (
                    <button
                      type="button"
                      onClick={onAction}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-medium text-white transition hover:bg-white/[0.1]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {actionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className={cn("max-h-[320px] overflow-y-auto", hasMeta && "mt-4")}>
              {items.map((item) => (
                <button
                  key={item.id}
                  data-switcher-item
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "mb-2 flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition last:mb-0",
                    item.active
                      ? "border-sky-300/26 bg-sky-400/10 text-white"
                      : "border-white/8 bg-white/[0.035] text-white/72 hover:bg-white/[0.065]",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    {item.description ? <p className="truncate text-[11px] text-white/42">{item.description}</p> : null}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 rotate-[-90deg] text-white/35", item.active && "text-white/68")} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
