"use client";

import { type ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TauriWindowShortcuts } from "@/components/providers/tauri-window-shortcuts";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

export function WebProviders({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <TooltipProvider>
        <TauriWindowShortcuts />
        {children}
        <Toaster />
      </TooltipProvider>
    </NuqsAdapter>
  );
}
