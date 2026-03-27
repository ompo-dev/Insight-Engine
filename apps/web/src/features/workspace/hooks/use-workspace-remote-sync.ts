"use client";

import { useEffect, useMemo, useRef } from "react";
import { apiClient } from "@/lib/http/axios";
import type { CustomTelemetryItemDefinition } from "@/lib/telemetry/items";
import type { WorkspaceRemoteStateSnapshot } from "@/lib/workspace/remote-state";
import type { WorkspaceDefinition } from "@/lib/workspace/types";
import { useCustomItemStore } from "@/store/use-custom-item-store";
import { useWorkspaceStore } from "@/store/use-workspace-store";

function buildSignature(definition: WorkspaceDefinition | null | undefined, customItems: CustomTelemetryItemDefinition[]) {
  if (!definition) return "";
  return JSON.stringify({
    definition,
    customItems,
  });
}

export function useWorkspaceRemoteSync({
  projectId,
  definition,
  customItems,
}: {
  projectId: string;
  definition: WorkspaceDefinition | undefined;
  customItems: CustomTelemetryItemDefinition[];
}) {
  const syncRef = useRef<{
    hydrationReady: boolean;
    remoteUpdatedAt: string | null;
    lastSyncedSignature: string;
  }>({
    hydrationReady: false,
    remoteUpdatedAt: null,
    lastSyncedSignature: "",
  });

  const localSignature = useMemo(() => buildSignature(definition, customItems), [customItems, definition]);

  useEffect(() => {
    syncRef.current = {
      hydrationReady: false,
      remoteUpdatedAt: null,
      lastSyncedSignature: "",
    };

    if (!projectId) return;

    let cancelled = false;

    const applyRemoteState = (snapshot: WorkspaceRemoteStateSnapshot) => {
      if (!snapshot.definition) return;
      const normalizedCustomItems = (snapshot.customItems ?? []).map((item) => ({
        ...item,
        terminal: item.terminal
          ? {
              ...item.terminal,
              shell: (item.terminal.shell as string) === "custom" ? "cmd" : item.terminal.shell,
              cols: item.terminal.cols ?? 120,
              rows: item.terminal.rows ?? 30,
            }
          : item.terminal,
      }));

      useWorkspaceStore.setState((state) => ({
        definitionsByScope: {
          ...state.definitionsByScope,
          [projectId]: snapshot.definition!,
        },
      }));

      useCustomItemStore.setState((state) => ({
        itemsByProject: {
          ...state.itemsByProject,
          [projectId]: normalizedCustomItems,
        },
      }));
    };

    const fetchRemoteState = async () => {
      try {
        const { data } = await apiClient.get<WorkspaceRemoteStateSnapshot>(`/projects/${projectId}/workspace/state`);
        if (cancelled) return;

        const remoteSignature = buildSignature(data.definition, data.customItems ?? []);
        const currentLocalSignature = buildSignature(
          useWorkspaceStore.getState().definitionsByScope[projectId],
          useCustomItemStore.getState().itemsByProject[projectId] ?? [],
        );
        const localIsDirty =
          syncRef.current.lastSyncedSignature.length > 0 &&
          currentLocalSignature !== syncRef.current.lastSyncedSignature;

        if (data.definition && data.updatedAt !== syncRef.current.remoteUpdatedAt && !localIsDirty) {
          applyRemoteState(data);
          syncRef.current.lastSyncedSignature = remoteSignature;
        }

        syncRef.current.remoteUpdatedAt = data.updatedAt;
        syncRef.current.hydrationReady = true;
      } catch {
        syncRef.current.hydrationReady = true;
      }
    };

    void fetchRemoteState();
    const interval = window.setInterval(() => void fetchRemoteState(), 4_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !definition || !syncRef.current.hydrationReady) return;
    if (!localSignature || localSignature === syncRef.current.lastSyncedSignature) return;

    const timeout = window.setTimeout(async () => {
      try {
        const { data } = await apiClient.put<WorkspaceRemoteStateSnapshot>(`/projects/${projectId}/workspace/state`, {
          definition,
          customItems,
        });

        syncRef.current.remoteUpdatedAt = data.updatedAt;
        syncRef.current.lastSyncedSignature = localSignature;
      } catch {
        // Ignore sync failures locally. The workspace should remain usable offline.
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [customItems, definition, localSignature, projectId]);
}
