import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Surface({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-[#0f1520]/88 shadow-[0_24px_72px_rgba(0,0,0,0.28)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}

export function SectionEyebrow({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.24em] text-white/38",
        className
      )}
      {...props}
    />
  );
}
