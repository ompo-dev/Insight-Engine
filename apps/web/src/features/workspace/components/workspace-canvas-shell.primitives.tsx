import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WorkspaceCanvasGlassPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-white/10 bg-[#16181d]/92 shadow-[0_20px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceCanvasCounterBadge({
  value,
  className,
}: {
  value: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-200",
        className,
      )}
    >
      {value}
    </span>
  );
}

export function WorkspaceCanvasMetaCopy({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn("truncate text-sm font-medium text-white", titleClassName)}>
        {title}
      </p>
      {subtitle ? (
        <p className={cn("truncate text-[11px] text-white/45", subtitleClassName)}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
