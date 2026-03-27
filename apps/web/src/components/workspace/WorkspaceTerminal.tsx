"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { FitAddon as FitAddonType } from "@xterm/addon-fit";
import type { Terminal as XTermType } from "xterm";
import { apiClient } from "@/lib/http/axios";
import type { TerminalNodeConfig } from "@/lib/telemetry/items";
import { cn } from "@/lib/utils";

interface WorkspaceTerminalProps {
  projectId: string;
  terminal: TerminalNodeConfig;
  onSync: (patch: Partial<TerminalNodeConfig>) => void;
  onActivate?: () => void;
  className?: string;
}

interface TerminalSessionSnapshot {
  id: string;
  projectId: string;
  shell: TerminalNodeConfig["shell"];
  workingDirectory: string;
  status: NonNullable<TerminalNodeConfig["sessionStatus"]>;
  output: string;
  createdAt: string;
  updatedAt: string;
  exitCode: number | null;
  cols: number;
  rows: number;
}

interface TerminalOutputStreamEvent {
  sessionId: string;
  projectId: string;
  channel: "terminal.output";
  chunk: string;
  output: string;
  status: NonNullable<TerminalNodeConfig["sessionStatus"]>;
  createdAt: string;
}

type TerminalViewState = {
  workingDirectory: string;
  sessionStatus: NonNullable<TerminalNodeConfig["sessionStatus"]>;
  lastExitCode: number | null;
};

type TerminalSessionStatus = NonNullable<TerminalNodeConfig["sessionStatus"]>;

type XTermPrivateCore = {
  _renderService?: {
    hasRenderer?: () => boolean;
  };
  viewport?: {
    __workspaceViewportGuardPatched?: boolean;
    syncScrollArea?: (immediate?: boolean) => void;
    _innerRefresh?: () => void;
  };
};

const TERMINAL_METADATA_POLL_INTERVAL_MS = 1000;
const TERMINAL_SYNC_DEBOUNCE_MS = 160;
const TERMINAL_RESIZE_DEBOUNCE_MS = 120;
const TERMINAL_STATUS_ACTIVITY_HOLD_MS = 900;

function mapViewState(terminal: TerminalNodeConfig): TerminalViewState {
  return {
    workingDirectory: terminal.workingDirectory,
    sessionStatus: terminal.sessionStatus ?? "disconnected",
    lastExitCode: terminal.lastExitCode ?? null,
  };
}

function updateViewState(
  setViewState: Dispatch<SetStateAction<TerminalViewState>>,
  nextState: TerminalViewState,
) {
  setViewState((current) => {
    if (
      current.workingDirectory === nextState.workingDirectory &&
      current.sessionStatus === nextState.sessionStatus &&
      current.lastExitCode === nextState.lastExitCode
    ) {
      return current;
    }

    return nextState;
  });
}

function getTerminalWindowTitle(shell: string, workingDirectory: string) {
  if (shell === "powershell") {
    return `PowerShell  ${workingDirectory}`;
  }

  if (shell === "bash" || shell === "zsh") {
    return `${shell}  ${workingDirectory}`;
  }

  return `Command Prompt  ${workingDirectory}`;
}

function inferWorkingDirectoryFromOutput(
  shell: TerminalNodeConfig["shell"],
  output: string,
) {
  if (!output.length) {
    return null;
  }

  const normalizedLines = output
    .replace(/\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\u0000/g, "").trimEnd());

  for (let index = normalizedLines.length - 1; index >= 0; index -= 1) {
    const line = normalizedLines[index] ?? "";

    if (shell === "cmd") {
      const match = line.match(/^([A-Za-z]:\\[^<>|"?*\r\n]*)>(?:.*)?$/);
      if (match?.[1]) {
        return match[1];
      }
      continue;
    }

    if (shell === "powershell") {
      const match = line.match(/^PS\s+(.+?)>(?:.*)?$/);
      if (match?.[1]?.trim()) {
        return match[1].trim();
      }
    }
  }

  return null;
}

function createTerminalTheme() {
  return {
    background: "#0c0c0c",
    foreground: "#f2f2f2",
    cursor: "#f2f2f2",
    cursorAccent: "#0c0c0c",
    selectionBackground: "rgba(255,255,255,0.16)",
    black: "#0c0c0c",
    red: "#ff7b72",
    green: "#9fd28f",
    yellow: "#f2cc60",
    blue: "#73b8ff",
    magenta: "#c792ea",
    cyan: "#7bdff2",
    white: "#f2f2f2",
    brightBlack: "#6b7280",
    brightRed: "#ff9b93",
    brightGreen: "#c5f29b",
    brightYellow: "#ffe08a",
    brightBlue: "#9dcdff",
    brightMagenta: "#ddb7ff",
    brightCyan: "#a5f0ff",
    brightWhite: "#ffffff",
  };
}

function getXTermPrivateCore(xterm: XTermType | null | undefined): XTermPrivateCore | null {
  if (!xterm) {
    return null;
  }

  return (xterm as { _core?: XTermPrivateCore })._core ?? null;
}

function hasXTermRenderer(xterm: XTermType | null | undefined) {
  const core = getXTermPrivateCore(xterm);
  return Boolean(core?._renderService?.hasRenderer?.());
}

function guardXTermViewport(xterm: XTermType) {
  const core = getXTermPrivateCore(xterm);
  const viewport = core?.viewport;

  if (!viewport || viewport.__workspaceViewportGuardPatched) {
    return;
  }

  const originalSyncScrollArea = viewport.syncScrollArea?.bind(viewport);
  const originalInnerRefresh = viewport._innerRefresh?.bind(viewport);

  if (originalSyncScrollArea) {
    viewport.syncScrollArea = (immediate?: boolean) => {
      if (!hasXTermRenderer(xterm)) {
        return;
      }

      return originalSyncScrollArea(immediate);
    };
  }

  if (originalInnerRefresh) {
    viewport._innerRefresh = () => {
      if (!hasXTermRenderer(xterm)) {
        return;
      }

      return originalInnerRefresh();
    };
  }

  viewport.__workspaceViewportGuardPatched = true;
}

export function WorkspaceTerminal({
  projectId,
  terminal,
  onSync,
  onActivate,
  className,
}: WorkspaceTerminalProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTermType | null>(null);
  const fitAddonRef = useRef<FitAddonType | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const streamSessionIdRef = useRef<string | null>(null);
  const lastRenderedOutputRef = useRef("");
  const sessionIdRef = useRef<string | null>(terminal.sessionId ?? null);
  const syncedTerminalRef = useRef<TerminalNodeConfig>(terminal);
  const onSyncRef = useRef(onSync);
  const onActivateRef = useRef(onActivate);
  const viewStateRef = useRef<TerminalViewState>(mapViewState(terminal));
  const pendingPatchRef = useRef<Partial<TerminalNodeConfig>>({});
  const ensureSessionPromiseRef = useRef<Promise<TerminalSessionSnapshot> | null>(null);
  const statusHoldTimeoutRef = useRef<number | null>(null);
  const inputActivityUntilRef = useRef(0);
  const focusWithinRef = useRef(false);
  const [viewState, setViewState] = useState<TerminalViewState>(() => mapViewState(terminal));
  const [displayStatus, setDisplayStatus] = useState<TerminalSessionStatus>(
    () => terminal.sessionStatus ?? "disconnected",
  );

  const clearStatusHoldTimeout = useCallback(() => {
    if (statusHoldTimeoutRef.current !== null) {
      window.clearTimeout(statusHoldTimeoutRef.current);
      statusHoldTimeoutRef.current = null;
    }
  }, []);

  const closeEventStream = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    streamSessionIdRef.current = null;
  }, []);

  const syncDisplayStatus = useCallback(() => {
    clearStatusHoldTimeout();

    const delay = inputActivityUntilRef.current - Date.now();
    if (delay > 0) {
      statusHoldTimeoutRef.current = window.setTimeout(() => {
        statusHoldTimeoutRef.current = null;
        setDisplayStatus(viewStateRef.current.sessionStatus);
      }, delay);
      return;
    }

    setDisplayStatus(viewStateRef.current.sessionStatus);
  }, [clearStatusHoldTimeout]);

  const flushPendingSync = useCallback(() => {
    if (syncTimeoutRef.current !== null) {
      window.clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};

    if (!Object.keys(patch).length) {
      return;
    }

    onSyncRef.current(patch);
  }, []);

  const enqueueSync = useCallback(
    (patch: Partial<TerminalNodeConfig>, immediate = false) => {
      const current = syncedTerminalRef.current;
      const nextPatch = Object.fromEntries(
        Object.entries(patch).filter(([key, value]) => {
          if (value === undefined) {
            return false;
          }

          return current[key as keyof TerminalNodeConfig] !== value;
        }),
      ) as Partial<TerminalNodeConfig>;

      if (!Object.keys(nextPatch).length) {
        return;
      }

      syncedTerminalRef.current = {
        ...current,
        ...nextPatch,
      };
      pendingPatchRef.current = {
        ...pendingPatchRef.current,
        ...nextPatch,
      };

      if (immediate) {
        flushPendingSync();
        return;
      }

      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = window.setTimeout(() => {
        flushPendingSync();
      }, TERMINAL_SYNC_DEBOUNCE_MS);
    },
    [flushPendingSync],
  );

  const focusTerminal = useCallback(() => {
    xtermRef.current?.focus();
  }, []);

  const activateNode = useCallback(() => {
    onActivateRef.current?.();
  }, []);

  const focusTerminalShell = useCallback(() => {
    window.requestAnimationFrame(() => {
      focusTerminal();
    });
  }, [focusTerminal]);

  const registerInputActivity = useCallback(() => {
    inputActivityUntilRef.current = Date.now() + TERMINAL_STATUS_ACTIVITY_HOLD_MS;
    setDisplayStatus("running");
    syncDisplayStatus();
  }, [syncDisplayStatus]);

  const renderOutput = useCallback((output: string) => {
    const xterm = xtermRef.current;
    if (!xterm) return;

    const previousOutput = lastRenderedOutputRef.current;

    if (!previousOutput.length) {
      if (output.length) {
        xterm.write(output);
      }
      lastRenderedOutputRef.current = output;
      return;
    }

    if (output.startsWith(previousOutput)) {
      const delta = output.slice(previousOutput.length);
      if (delta.length) {
        xterm.write(delta);
      }
      lastRenderedOutputRef.current = output;
      return;
    }

    xterm.reset();
    if (output.length) {
      xterm.write(output);
    }
    lastRenderedOutputRef.current = output;
  }, []);

  const writeTerminalError = useCallback(
    (message: string) => {
      const xterm = xtermRef.current;
      if (xterm) {
        xterm.write(`\r\n[workspace terminal] ${message}\r\n`);
      }
      updateViewState(setViewState, {
        workingDirectory: syncedTerminalRef.current.workingDirectory,
        sessionStatus: "error",
        lastExitCode: syncedTerminalRef.current.lastExitCode ?? null,
      });
      enqueueSync({ sessionStatus: "error" }, true);
    },
    [enqueueSync],
  );

  const pasteClipboardIntoTerminal = useCallback(async () => {
    const xterm = xtermRef.current;
    if (!xterm) {
      return;
    }

    if (!navigator.clipboard?.readText) {
      writeTerminalError("Leitura da area de transferencia nao esta disponivel neste navegador.");
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.length) {
        return;
      }

      if (!focusWithinRef.current) {
        activateNode();
      }
      focusTerminalShell();
      xterm.paste(clipboardText);
    } catch (error) {
      writeTerminalError(
        error instanceof Error
          ? error.message
          : "Falha ao ler a area de transferencia.",
      );
    }
  }, [activateNode, focusTerminalShell, writeTerminalError]);

  const applySnapshot = useCallback(
    (
      snapshot: TerminalSessionSnapshot,
      options?: {
        syncOutput?: boolean;
      },
    ) => {
      sessionIdRef.current = snapshot.id;

      if (options?.syncOutput ?? true) {
        renderOutput(snapshot.output);
      }

      updateViewState(setViewState, {
        workingDirectory: snapshot.workingDirectory,
        sessionStatus: snapshot.status,
        lastExitCode: snapshot.exitCode,
      });

      enqueueSync(
        {
          sessionId: snapshot.id,
          shell: snapshot.shell,
          workingDirectory: snapshot.workingDirectory,
          sessionStatus: snapshot.status,
          liveOutput: snapshot.output,
          lastExitCode: snapshot.exitCode,
          cols: snapshot.cols,
          rows: snapshot.rows,
        },
        snapshot.status === "exited",
      );
    },
    [enqueueSync, renderOutput],
  );

  const applyStreamOutputEvent = useCallback(
    (event: TerminalOutputStreamEvent) => {
      const inferredWorkingDirectory =
        inferWorkingDirectoryFromOutput(syncedTerminalRef.current.shell, event.output) ??
        syncedTerminalRef.current.workingDirectory;

      sessionIdRef.current = event.sessionId;
      renderOutput(event.output);
      updateViewState(setViewState, {
        workingDirectory: inferredWorkingDirectory,
        sessionStatus: event.status,
        lastExitCode: syncedTerminalRef.current.lastExitCode ?? null,
      });

      enqueueSync({
        sessionId: event.sessionId,
        workingDirectory: inferredWorkingDirectory,
        sessionStatus: event.status,
        liveOutput: event.output,
      });
    },
    [enqueueSync, renderOutput],
  );

  const connectEventStream = useCallback(
    (sessionId: string) => {
      if (!sessionId) {
        closeEventStream();
        return;
      }

      if (streamSessionIdRef.current === sessionId && eventSourceRef.current) {
        return;
      }

      closeEventStream();

      const stream = new EventSource(
        `/api/projects/${projectId}/terminal/sessions/${sessionId}/stream`,
      );

      stream.addEventListener("snapshot", (event) => {
        try {
          const snapshot = JSON.parse(
            (event as MessageEvent<string>).data,
          ) as TerminalSessionSnapshot;

          if (snapshot.id !== sessionId) {
            return;
          }

          applySnapshot(snapshot, { syncOutput: true });
        } catch {
          // Ignore malformed stream payloads and keep the terminal session alive.
        }
      });

      stream.addEventListener("terminal.output", (event) => {
        try {
          const outputEvent = JSON.parse(
            (event as MessageEvent<string>).data,
          ) as TerminalOutputStreamEvent;

          if (outputEvent.sessionId !== sessionId) {
            return;
          }

          applyStreamOutputEvent(outputEvent);
        } catch {
          // Ignore malformed stream payloads and keep the terminal session alive.
        }
      });

      stream.onerror = () => {
        if (stream.readyState === EventSource.CLOSED) {
          closeEventStream();
        }
      };

      eventSourceRef.current = stream;
      streamSessionIdRef.current = sessionId;
    },
    [applySnapshot, applyStreamOutputEvent, closeEventStream, projectId],
  );

  const ensureSession = useCallback(async () => {
    if (ensureSessionPromiseRef.current) {
      return await ensureSessionPromiseRef.current;
    }

    ensureSessionPromiseRef.current = (async () => {
      const current = syncedTerminalRef.current;
      const xterm = xtermRef.current;
      const cols = Math.max(xterm?.cols ?? current.cols ?? 120, 40);
      const rows = Math.max(xterm?.rows ?? current.rows ?? 30, 12);

      if (current.sessionId) {
        try {
          const { data } = await apiClient.get<TerminalSessionSnapshot>(
            `/projects/${projectId}/terminal/sessions/${current.sessionId}`,
          );
          applySnapshot(data);
          connectEventStream(data.id);
          return data;
        } catch {
          sessionIdRef.current = null;
          closeEventStream();
          enqueueSync({ sessionId: null, sessionStatus: "disconnected" }, true);
        }
      }

      const { data } = await apiClient.post<TerminalSessionSnapshot>(
        `/projects/${projectId}/terminal/sessions`,
        {
          shell: current.shell,
          workingDirectory: current.workingDirectory,
          cols,
          rows,
          initialOutput: current.liveOutput,
        },
      );

      applySnapshot(data);
      connectEventStream(data.id);
      return data;
    })().finally(() => {
      ensureSessionPromiseRef.current = null;
    });

    return await ensureSessionPromiseRef.current;
  }, [applySnapshot, closeEventStream, connectEventStream, enqueueSync, projectId]);

  const pollSnapshot = useCallback(async () => {
    const activeSessionId = sessionIdRef.current ?? syncedTerminalRef.current.sessionId;
    if (!activeSessionId) return;

    try {
      const { data } = await apiClient.get<TerminalSessionSnapshot>(
        `/projects/${projectId}/terminal/sessions/${activeSessionId}`,
      );
      const outputOutOfSync =
        !lastRenderedOutputRef.current.length ||
        data.output.length < lastRenderedOutputRef.current.length ||
        !data.output.startsWith(lastRenderedOutputRef.current);

      applySnapshot(data, {
        syncOutput: outputOutOfSync && !focusWithinRef.current,
      });
      connectEventStream(data.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao consultar a sessao do terminal.";

      if (message.includes("404")) {
        sessionIdRef.current = null;
        closeEventStream();
        updateViewState(setViewState, {
          workingDirectory: syncedTerminalRef.current.workingDirectory,
          sessionStatus: "disconnected",
          lastExitCode: syncedTerminalRef.current.lastExitCode ?? null,
        });
        enqueueSync({ sessionId: null, sessionStatus: "disconnected" }, true);
        return;
      }

      writeTerminalError(message);
    }
  }, [applySnapshot, closeEventStream, connectEventStream, enqueueSync, projectId, writeTerminalError]);

  const syncResize = useCallback(async () => {
    const xterm = xtermRef.current;
    const fitAddon = fitAddonRef.current;
    if (!xterm || !fitAddon) return;

    if (!hasXTermRenderer(xterm)) {
      return;
    }

    try {
      const proposed = fitAddon.proposeDimensions();
      if (!proposed) {
        return;
      }

      fitAddon.fit();
    } catch {
      return;
    }

    const nextCols = Math.max(xterm.cols, 40);
    const nextRows = Math.max(xterm.rows, 12);
    const current = syncedTerminalRef.current;

    if (current.cols === nextCols && current.rows === nextRows) {
      return;
    }

    enqueueSync({ cols: nextCols, rows: nextRows }, true);

    const activeSessionId = sessionIdRef.current ?? current.sessionId;
    if (!activeSessionId) {
      return;
    }

    try {
      await apiClient.post(`/projects/${projectId}/terminal/sessions/${activeSessionId}/resize`, {
        cols: nextCols,
        rows: nextRows,
      });
    } catch (error) {
      writeTerminalError(error instanceof Error ? error.message : "Falha ao redimensionar o terminal.");
    }
  }, [enqueueSync, projectId, writeTerminalError]);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    onActivateRef.current = onActivate;
  }, [onActivate]);

  useEffect(() => {
    viewStateRef.current = viewState;

    if (viewState.sessionStatus === "idle") {
      syncDisplayStatus();
      return;
    }

    clearStatusHoldTimeout();
    setDisplayStatus(viewState.sessionStatus);
  }, [clearStatusHoldTimeout, syncDisplayStatus, viewState]);

  useEffect(() => {
    syncedTerminalRef.current = terminal;
    sessionIdRef.current = terminal.sessionId ?? null;
    renderOutput(terminal.liveOutput ?? "");
    updateViewState(setViewState, mapViewState(terminal));
  }, [renderOutput, terminal]);

  useEffect(() => {
    if (!terminal.sessionId) {
      closeEventStream();
      return;
    }

    connectEventStream(terminal.sessionId);
  }, [closeEventStream, connectEventStream, terminal.sessionId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const disposeEventStream = () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      streamSessionIdRef.current = null;
    };

    let disposed = false;
    let dataDisposable: { dispose: () => void } | null = null;
    let renderDisposable: { dispose: () => void } | null = null;
    let mountTimeoutId: number | null = window.setTimeout(() => {
      mountTimeoutId = null;

      void Promise.all([import("xterm"), import("@xterm/addon-fit")])
        .then(([xtermModule, fitAddonModule]) => {
          if (disposed) {
            return;
          }

          const xterm = new xtermModule.Terminal({
            cursorBlink: true,
            fontFamily: "\"IBM Plex Mono\", monospace",
            fontSize: 13,
            lineHeight: 1.18,
            allowTransparency: false,
            convertEol: false,
            scrollback: 5000,
            theme: createTerminalTheme(),
          });
          const fitAddon = new fitAddonModule.FitAddon();

          xterm.loadAddon(fitAddon);
          xterm.open(viewport);
          guardXTermViewport(xterm);
          xtermRef.current = xterm;
          fitAddonRef.current = fitAddon;
          renderOutput(syncedTerminalRef.current.liveOutput ?? "");

          dataDisposable = xterm.onData((data) => {
            registerInputActivity();
            void (async () => {
              try {
                const session = await ensureSession();
                await apiClient.post(`/projects/${projectId}/terminal/sessions/${session.id}/input`, {
                  data,
                });
              } catch (error) {
                writeTerminalError(
                  error instanceof Error ? error.message : "Falha ao enviar input ao terminal.",
                );
              }
            })();
          });

          focusTerminal();

          let hasAppliedInitialFit = false;
          renderDisposable = xterm.onRender(() => {
            if (hasAppliedInitialFit) {
              return;
            }

            hasAppliedInitialFit = true;
            void syncResize();
          });

          resizeObserverRef.current = new ResizeObserver(() => {
            if (resizeTimeoutRef.current !== null) {
              window.clearTimeout(resizeTimeoutRef.current);
            }

            resizeTimeoutRef.current = window.setTimeout(() => {
              void syncResize();
            }, TERMINAL_RESIZE_DEBOUNCE_MS);
          });
          resizeObserverRef.current.observe(viewport);

          void ensureSession()
            .then(() => undefined)
            .catch((error) => {
              writeTerminalError(
                error instanceof Error ? error.message : "Falha ao iniciar a sessao do terminal.",
              );
            });

          pollIntervalRef.current = window.setInterval(() => {
            void pollSnapshot();
          }, TERMINAL_METADATA_POLL_INTERVAL_MS);
        })
        .catch((error) => {
          writeTerminalError(error instanceof Error ? error.message : "Falha ao carregar o terminal.");
        });
    }, 0);

    return () => {
      disposed = true;
      dataDisposable?.dispose();
      renderDisposable?.dispose();
      clearStatusHoldTimeout();
      focusWithinRef.current = false;

      if (mountTimeoutId !== null) {
        window.clearTimeout(mountTimeoutId);
      }

      if (pollIntervalRef.current !== null) {
        window.clearInterval(pollIntervalRef.current);
      }

      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }

      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }

      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      disposeEventStream();
      flushPendingSync();
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [
    ensureSession,
    flushPendingSync,
    focusTerminal,
    pollSnapshot,
    projectId,
    renderOutput,
    syncResize,
    writeTerminalError,
  ]);

  return (
    <div
      data-workspace-surface="true"
      className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-[#0c0c0c] text-[#f2f2f2]", className)}
      onFocusCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (nextTarget && event.currentTarget.contains(nextTarget)) {
          return;
        }

        if (focusWithinRef.current) {
          return;
        }

        focusWithinRef.current = true;
        activateNode();
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (nextTarget && event.currentTarget.contains(nextTarget)) {
          return;
        }

        focusWithinRef.current = false;
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-[#1f1f1f] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
          </div>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/72">
            {getTerminalWindowTitle(terminal.shell, viewState.workingDirectory)}
          </p>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/62">
          {displayStatus}
        </span>
      </div>

      <div
        ref={viewportRef}
        data-workspace-control="true"
        data-workspace-terminal="true"
        className="min-h-0 flex-1 overflow-hidden px-3 py-3 font-mono"
        onPointerDownCapture={() => {
          focusTerminalShell();
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void pasteClipboardIntoTerminal();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      />

      <div className="flex items-center justify-between border-t border-white/8 bg-[#111111] px-3 py-2 font-mono text-[11px] text-white/54">
        <span className="truncate">{viewState.workingDirectory}</span>
        <span>
          {viewState.lastExitCode === null
            ? displayStatus
            : `exit ${viewState.lastExitCode}`}
        </span>
      </div>
    </div>
  );
}
