import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CanvasChromeButton({
  icon,
  label,
  className,
  iconClassName,
  labelClassName,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "canvas-chrome-button inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-[#15181c]/88 px-4 text-sm font-semibold text-slate-100 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-[#1a1f24]",
        className,
      )}
    >
      <span className={cn("canvas-chrome-button__icon text-white/80", iconClassName)}>
        {icon}
      </span>
      <span className={cn("canvas-chrome-button__label", labelClassName)}>
        {label}
      </span>
    </button>
  );
}

export function CanvasIconButton({
  icon,
  label,
  className,
  iconClassName,
  labelClassName,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "canvas-icon-button inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/8",
        className,
      )}
    >
      <span className={cn("canvas-icon-button__icon text-white/70", iconClassName)}>
        {icon}
      </span>
      <span className={cn("canvas-icon-button__label", labelClassName)}>
        {label}
      </span>
    </button>
  );
}

export function CanvasToolButton({
  icon,
  label,
  active = false,
  className,
  onClick,
}: {
  icon: ReactNode;
  label?: string;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "canvas-tool-button inline-flex h-[42px] w-[42px] items-center justify-center rounded-full border text-slate-200 transition",
        active
          ? "border-white/20 bg-white text-slate-950 shadow-[0_10px_26px_rgba(255,255,255,0.18)]"
          : "border-transparent bg-transparent hover:border-white/8 hover:bg-white/6",
        className,
      )}
    >
      {icon}
    </button>
  );
}

export function CanvasDockSurface({
  children,
  orientation = "horizontal",
  className,
}: {
  children: ReactNode;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[26px] border border-white/10 bg-[#16181d]/94 backdrop-blur-2xl",
        orientation === "vertical"
          ? "flex flex-col items-center gap-2 px-2 py-3"
          : "flex w-fit max-w-full items-center gap-2 overflow-hidden px-2 py-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CanvasStatusPill({
  icon,
  label,
  className,
  iconClassName,
  labelClassName,
}: {
  icon?: ReactNode;
  label?: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}) {
  return (
    <div
      className={cn(
        "canvas-status-pill inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#16181d]/92 px-4 text-sm font-medium text-slate-200 shadow-[0_16px_36px_rgba(0,0,0,0.26)] backdrop-blur-xl",
        className,
      )}
    >
      {icon ? (
        <span className={cn("canvas-status-pill__icon text-white/70", iconClassName)}>
          {icon}
        </span>
      ) : null}
      {label ? (
        <span className={cn("canvas-status-pill__label", labelClassName)}>{label}</span>
      ) : null}
    </div>
  );
}
