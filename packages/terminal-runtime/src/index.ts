import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  nowIso,
  type TerminalOutputEvent,
  type TerminalSessionShell,
  type TerminalSessionSnapshot,
  type TerminalSessionStatus,
  type TerminalSignal,
} from "@workspace/runtime-core";

interface PtyRuntime {
  onData: (callback: (chunk: string) => void) => void;
  onExit: (callback: (event: { exitCode?: number; signal?: number }) => void) => void;
  write: (input: string) => void;
  resize?: (cols: number, rows: number) => void;
  kill?: () => void;
}

interface TerminalSessionRecord {
  id: string;
  projectId: string;
  shell: TerminalSessionShell;
  workingDirectory: string;
  status: TerminalSessionStatus;
  output: string;
  createdAt: string;
  updatedAt: string;
  exitCode: number | null;
  cols: number;
  rows: number;
  runtime: PtyRuntime;
  subscribers: Set<(event: TerminalOutputEvent) => void>;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

const MAX_OUTPUT_SIZE = 400_000;
const ANSI_ESCAPE_PATTERN = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const sessions = new Map<string, TerminalSessionRecord>();
const NODE_PTY_HOST_PATH = fileURLToPath(new URL("./node-pty-host.mjs", import.meta.url));

function trimOutput(output: string) {
  if (output.length <= MAX_OUTPUT_SIZE) return output;
  return output.slice(output.length - MAX_OUTPUT_SIZE);
}

function snapshotSession(session: TerminalSessionRecord): TerminalSessionSnapshot {
  return {
    id: session.id,
    projectId: session.projectId,
    shell: session.shell,
    workingDirectory: session.workingDirectory,
    status: session.status,
    output: session.output,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    exitCode: session.exitCode,
    cols: session.cols,
    rows: session.rows,
  };
}

function normalizeOutputLines(output: string) {
  return output
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\u0000/g, "").trimEnd());
}

function inferWorkingDirectoryFromLine(shell: TerminalSessionShell, line: string) {
  if (!line) return null;

  if (shell === "cmd") {
    const match = line.match(/^([A-Za-z]:\\[^<>|"?*\r\n]*)>(?:.*)?$/);
    return match?.[1] ?? null;
  }

  if (shell === "powershell") {
    const match = line.match(/^PS\s+(.+?)>(?:.*)?$/);
    return match?.[1]?.trim() ?? null;
  }

  return null;
}

function inferWorkingDirectory(shell: TerminalSessionShell, output: string) {
  const lines = normalizeOutputLines(output);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const workingDirectory = inferWorkingDirectoryFromLine(shell, lines[index] ?? "");
    if (workingDirectory) {
      return workingDirectory;
    }
  }

  return null;
}

function resolveWorkingDirectory(input?: string) {
  if (!input?.trim()) return resolve(process.cwd(), "..", "..");
  const desired = resolve(input.trim());
  return existsSync(desired) ? desired : resolve(process.cwd(), "..", "..");
}

function resolveShellRuntime(shell?: TerminalSessionShell) {
  const nextShell = shell ?? (process.platform === "win32" ? "cmd" : "bash");

  if (nextShell === "cmd") {
    return {
      shell: "cmd" as const,
      command: process.platform === "win32" ? "cmd.exe" : "sh",
      args: process.platform === "win32" ? ["/K"] : ([] as string[]),
    };
  }

  if (nextShell === "powershell") {
    return {
      shell: "powershell" as const,
      command: process.platform === "win32" ? "powershell.exe" : "pwsh",
      args: process.platform === "win32" ? ["-NoLogo", "-NoProfile", "-NoExit", "-Command", "-"] : ["-NoLogo", "-NoProfile"],
    };
  }

  return {
    shell: nextShell,
    command: nextShell,
    args: [] as string[],
  };
}

async function loadPtyModule() {
  try {
    const module = await import("node-pty");
    return module;
  } catch {
    return null;
  }
}

function createFallbackRuntime(command: string, args: string[], cwd: string): PtyRuntime {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    windowsHide: true,
    stdio: "pipe",
  });

  return createChildProcessRuntime(child);
}

function createChildProcessRuntime(child: ChildProcessWithoutNullStreams): PtyRuntime {
  const stdoutListeners = new Set<(chunk: string) => void>();
  const exitListeners = new Set<(event: { exitCode?: number; signal?: number }) => void>();

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdoutListeners.forEach((listener) => listener(text));
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stdoutListeners.forEach((listener) => listener(text));
  });

  child.on("close", (exitCode, signal) => {
    exitListeners.forEach((listener) =>
      listener({ exitCode: exitCode ?? undefined, signal: typeof signal === "number" ? signal : undefined }),
    );
  });

  return {
    onData: (callback) => {
      stdoutListeners.add(callback);
    },
    onExit: (callback) => {
      exitListeners.add(callback);
    },
    write: (input) => {
      child.stdin.write(input);
    },
    kill: () => {
      child.kill();
    },
  };
}

function resolveNodeHostCommand() {
  return process.platform === "win32" ? "node.exe" : "node";
}

async function createNodeHostRuntime(
  command: string,
  args: string[],
  cwd: string,
  cols: number,
  rows: number,
  env: Record<string, string>,
) {
  return await new Promise<PtyRuntime>((resolveRuntime, rejectRuntime) => {
    const child = spawn(resolveNodeHostCommand(), [NODE_PTY_HOST_PATH], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
      stdio: "pipe",
    });
    const stdoutListeners = new Set<(chunk: string) => void>();
    const exitListeners = new Set<(event: { exitCode?: number; signal?: number }) => void>();
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let ready = false;
    let settled = false;
    let exitEmitted = false;

    const emitExit = (event: { exitCode?: number; signal?: number }) => {
      if (exitEmitted) return;
      exitEmitted = true;
      exitListeners.forEach((listener) => listener(event));
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      rejectRuntime(new Error(message));
    };

    const runtime: PtyRuntime = {
      onData: (callback) => {
        stdoutListeners.add(callback);
      },
      onExit: (callback) => {
        exitListeners.add(callback);
      },
      write: (input) => {
        child.stdin.write(
          `${JSON.stringify({
            type: "input",
            data: Buffer.from(input, "utf8").toString("base64"),
          })}\n`,
        );
      },
      resize: (nextCols, nextRows) => {
        child.stdin.write(
          `${JSON.stringify({
            type: "resize",
            cols: nextCols,
            rows: nextRows,
          })}\n`,
        );
      },
      kill: () => {
        child.stdin.write(`${JSON.stringify({ type: "kill" })}\n`);
        setTimeout(() => {
          if (!child.killed) {
            child.kill();
          }
        }, 50);
      },
    };

    const handleHostMessage = (line: string) => {
      if (!line.trim()) return;

      let message: unknown;

      try {
        message = JSON.parse(line);
      } catch {
        return;
      }

      if (!message || typeof message !== "object" || !("type" in message)) {
        return;
      }

      const typedMessage = message as
        | { type: "ready" }
        | { type: "data"; chunk: string }
        | { type: "exit"; exitCode?: number | null; signal?: number | null }
        | { type: "error"; message: string };

      if (typedMessage.type === "ready") {
        if (settled) return;
        settled = true;
        ready = true;
        resolveRuntime(runtime);
        return;
      }

      if (typedMessage.type === "data") {
        const chunk = Buffer.from(typedMessage.chunk, "base64").toString("utf8");
        stdoutListeners.forEach((listener) => listener(chunk));
        return;
      }

      if (typedMessage.type === "exit") {
        emitExit({
          exitCode: typedMessage.exitCode ?? undefined,
          signal: typedMessage.signal ?? undefined,
        });
        return;
      }

      if (!ready) {
        fail(typedMessage.message || "Falha ao iniciar o terminal PTY.");
      }
    };

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();

      while (true) {
        const newlineIndex = stdoutBuffer.indexOf("\n");
        if (newlineIndex === -1) break;

        const line = stdoutBuffer.slice(0, newlineIndex);
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        handleHostMessage(line);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderrBuffer += chunk.toString();
    });

    child.on("error", (error) => {
      fail(error.message || "Falha ao iniciar o processo host do terminal.");
    });

    child.on("close", (exitCode, signal) => {
      if (!ready) {
        const failureMessage =
          stderrBuffer.trim() ||
          `Falha ao iniciar o terminal PTY (codigo ${exitCode ?? "desconhecido"}).`;
        fail(failureMessage);
        return;
      }

      emitExit({
        exitCode: exitCode ?? undefined,
        signal: typeof signal === "number" ? signal : undefined,
      });
    });

    child.stdin.write(
      `${JSON.stringify({
        type: "init",
        command,
        args,
        cwd,
        cols,
        rows,
        env,
      })}\n`,
    );
  });
}

async function createRuntime(shell: TerminalSessionShell, cwd: string, cols: number, rows: number) {
  const resolved = resolveShellRuntime(shell);
  const isBunRuntime =
    typeof globalThis === "object" &&
    "Bun" in globalThis &&
    Boolean((globalThis as { Bun?: unknown }).Bun);
  const safeEnv = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  if (isBunRuntime) {
    return {
      runtime: await createNodeHostRuntime(resolved.command, resolved.args, cwd, cols, rows, safeEnv),
      shell: resolved.shell,
    };
  }

  const ptyModule = await loadPtyModule();

  if (ptyModule?.spawn) {
    const processHandle = ptyModule.spawn(resolved.command, resolved.args, {
      name: "xterm-256color",
      cols,
      rows,
      cwd,
      env: safeEnv,
    });

    return {
      runtime: {
        onData: (callback: (chunk: string) => void) => {
          processHandle.onData(callback);
        },
        onExit: (callback: (event: { exitCode?: number; signal?: number }) => void) => {
          processHandle.onExit((event: { exitCode?: number; signal?: number }) => callback(event));
        },
        write: (input: string) => {
          processHandle.write(input);
        },
        resize: (nextCols: number, nextRows: number) => {
          processHandle.resize(nextCols, nextRows);
        },
        kill: () => {
          processHandle.kill();
        },
      } satisfies PtyRuntime,
      shell: resolved.shell,
    };
  }

  return {
    runtime: createFallbackRuntime(resolved.command, resolved.args, cwd),
    shell: resolved.shell,
  };
}

function markSessionRunning(session: TerminalSessionRecord) {
  session.status = "running";
  session.updatedAt = nowIso();

  if (session.idleTimer) {
    clearTimeout(session.idleTimer);
  }

  session.idleTimer = setTimeout(() => {
    if (session.status === "exited" || session.status === "error") return;
    session.status = "idle";
    session.updatedAt = nowIso();
  }, 250);
}

function emitOutput(session: TerminalSessionRecord, chunk: string) {
  session.output = trimOutput(`${session.output}${chunk}`);
  const inferredWorkingDirectory = inferWorkingDirectory(session.shell, session.output);
  if (inferredWorkingDirectory) {
    session.workingDirectory = inferredWorkingDirectory;
  }
  session.updatedAt = nowIso();
  const event: TerminalOutputEvent = {
    sessionId: session.id,
    projectId: session.projectId,
    channel: "terminal.output",
    chunk,
    output: session.output,
    status: session.status,
    createdAt: session.updatedAt,
  };
  session.subscribers.forEach((subscriber) => subscriber(event));
}

function getSession(projectId: string, sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session || session.projectId !== projectId) {
    throw new Error("Sessao de terminal nao encontrada.");
  }
  return session;
}

export async function openSession(input: {
  projectId: string;
  shell?: TerminalSessionShell;
  workingDirectory?: string;
  cols?: number;
  rows?: number;
  initialOutput?: string;
}) {
  const createdAt = nowIso();
  const workingDirectory = resolveWorkingDirectory(input.workingDirectory);
  const cols = input.cols ?? 120;
  const rows = input.rows ?? 30;
  const { runtime, shell } = await createRuntime(
    input.shell ?? (process.platform === "win32" ? "cmd" : "bash"),
    workingDirectory,
    cols,
    rows,
  );

  const session: TerminalSessionRecord = {
    id: `term_${Math.random().toString(36).slice(2, 10)}`,
    projectId: input.projectId,
    shell,
    workingDirectory,
    status: "idle",
    output: trimOutput(input.initialOutput ?? ""),
    createdAt,
    updatedAt: createdAt,
    exitCode: null,
    cols,
    rows,
    runtime,
    subscribers: new Set(),
    idleTimer: null,
  };

  runtime.onData((chunk) => {
    markSessionRunning(session);
    emitOutput(session, chunk);
  });

  runtime.onExit((event) => {
    session.status = "exited";
    session.exitCode = event.exitCode ?? null;
    session.updatedAt = nowIso();
  });

  sessions.set(session.id, session);
  return snapshotSession(session);
}

export function attachSession(projectId: string, sessionId: string) {
  return snapshotSession(getSession(projectId, sessionId));
}

export function listSessions(projectId?: string) {
  return [...sessions.values()]
    .filter((session) => (projectId ? session.projectId === projectId : true))
    .map((session) => snapshotSession(session));
}

export function writeInput(input: { projectId: string; sessionId: string; data: string }) {
  const session = getSession(input.projectId, input.sessionId);
  session.runtime.write(input.data);
  markSessionRunning(session);
  return snapshotSession(session);
}

export function resizeSession(input: { projectId: string; sessionId: string; cols: number; rows: number }) {
  const session = getSession(input.projectId, input.sessionId);
  session.cols = input.cols;
  session.rows = input.rows;
  session.runtime.resize?.(input.cols, input.rows);
  session.updatedAt = nowIso();
  return snapshotSession(session);
}

export function sendSignal(input: { projectId: string; sessionId: string; signal: TerminalSignal }) {
  const session = getSession(input.projectId, input.sessionId);

  if (input.signal === "SIGINT") {
    session.runtime.write("\u0003");
  } else if (input.signal === "EOF") {
    session.runtime.write("\u0004");
  } else {
    session.runtime.kill?.();
  }

  session.updatedAt = nowIso();
  return snapshotSession(session);
}

export function subscribeOutput(
  input: { projectId: string; sessionId: string },
  subscriber: (event: TerminalOutputEvent) => void,
) {
  const session = getSession(input.projectId, input.sessionId);
  session.subscribers.add(subscriber);
  return () => {
    session.subscribers.delete(subscriber);
  };
}

export function closeSession(projectId: string, sessionId: string) {
  const session = getSession(projectId, sessionId);
  session.runtime.kill?.();
  session.status = "exited";
  session.updatedAt = nowIso();
  sessions.delete(sessionId);
  return snapshotSession(session);
}
