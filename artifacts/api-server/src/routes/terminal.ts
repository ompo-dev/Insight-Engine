import { Router } from "express";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const router = Router();

type TerminalShell = "bash" | "zsh" | "powershell" | "custom";

const OUTPUT_SENTINEL = "__LYNX_TERMINAL_CWD__";
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_OUTPUT_SIZE = 200_000;

function resolveWorkingDirectory(input?: string) {
  if (!input?.trim()) return process.cwd();

  const desired = resolve(input.trim());
  return existsSync(desired) ? desired : process.cwd();
}

function resolveShellRuntime(shell: TerminalShell) {
  if (shell === "bash") {
    return {
      label: "bash" as const,
      command: "bash",
      args: (source: string) => ["-lc", `${source}\nprintf '${OUTPUT_SENTINEL}%s\n' "$PWD"`],
    };
  }

  if (shell === "zsh") {
    return {
      label: "zsh" as const,
      command: "zsh",
      args: (source: string) => ["-lc", `${source}\nprintf '${OUTPUT_SENTINEL}%s\n' "$PWD"`],
    };
  }

  return {
    label: "powershell" as const,
    command: process.platform === "win32" ? "powershell.exe" : "pwsh",
    args: (source: string) => [
      "-NoLogo",
      "-NoProfile",
      "-Command",
      `${source}\nWrite-Output "${OUTPUT_SENTINEL}$((Get-Location).Path)"`,
    ],
  };
}

function trimBufferedOutput(value: string) {
  if (value.length <= MAX_OUTPUT_SIZE) return value;
  return value.slice(value.length - MAX_OUTPUT_SIZE);
}

function extractWorkingDirectory(stdout: string, fallback: string) {
  const lines = stdout.split(/\r?\n/);
  const sentinelIndex = [...lines].reverse().findIndex((line) => line.startsWith(OUTPUT_SENTINEL));

  if (sentinelIndex === -1) {
    return { workingDirectory: fallback, stdout: stdout.trimEnd() };
  }

  const indexFromStart = lines.length - 1 - sentinelIndex;
  const sentinelLine = lines[indexFromStart] ?? "";
  const nextWorkingDirectory = sentinelLine.slice(OUTPUT_SENTINEL.length).trim() || fallback;
  const nextStdout = lines.filter((_, index) => index !== indexFromStart).join("\n").trimEnd();

  return {
    workingDirectory: nextWorkingDirectory,
    stdout: nextStdout,
  };
}

function runTerminalCommand(params: {
  shell: TerminalShell;
  command: string;
  workingDirectory?: string;
}) {
  const runtime = resolveShellRuntime(params.shell);
  const cwd = resolveWorkingDirectory(params.workingDirectory);

  return new Promise<{
    output: string;
    workingDirectory: string;
    shell: TerminalShell;
    exitCode: number | null;
  }>((resolvePromise, rejectPromise) => {
    const child = spawn(runtime.command, runtime.args(params.command), {
      cwd,
      env: process.env,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const finish = (handler: () => void) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      handler();
    };

    const timeout = setTimeout(() => {
      child.kill();
      finish(() => rejectPromise(new Error("Comando excedeu o limite de 20 segundos.")));
    }, DEFAULT_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout = trimBufferedOutput(stdout + chunk.toString());
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr = trimBufferedOutput(stderr + chunk.toString());
    });

    child.on("error", (error) => {
      finish(() => rejectPromise(error));
    });

    child.on("close", (exitCode) => {
      finish(() => {
        const extracted = extractWorkingDirectory(stdout, cwd);
        const output = [extracted.stdout.trim(), stderr.trim()].filter(Boolean).join("\n").trim();

        resolvePromise({
          output,
          workingDirectory: extracted.workingDirectory,
          shell: runtime.label,
          exitCode,
        });
      });
    });
  });
}

router.post("/execute", async (req, res) => {
  const body = req.body as {
    shell?: TerminalShell;
    command?: string;
    workingDirectory?: string;
  };

  if (!body.command?.trim()) {
    res.status(400).json({ error: "command is required" });
    return;
  }

  try {
    const result = await runTerminalCommand({
      shell: body.shell ?? "powershell",
      command: body.command,
      workingDirectory: body.workingDirectory,
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao executar comando.";
    res.status(500).json({ error: message });
  }
});

export default router;
