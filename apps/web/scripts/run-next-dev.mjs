import { spawn, spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const appDir = process.cwd();
const lockPath = resolve(appDir, ".next", "dev", "lock");
const nextDevDir = resolve(appDir, ".next", "dev");
const explicitTurbopack =
  process.argv.includes("--turbopack") || process.env.NEXT_USE_TURBOPACK === "1";
const useWebpack = process.platform === "win32" && !explicitTurbopack;

async function readLockInfo() {
  try {
    const raw = await readFile(lockPath, "utf8");
    const info = JSON.parse(raw);

    if (typeof info?.pid !== "number" || typeof info?.appUrl !== "string") {
      return null;
    }

    return info;
  } catch {
    return null;
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function findExistingServer() {
  const lockInfo = await readLockInfo();
  if (!lockInfo) {
    return null;
  }

  if (!isProcessRunning(lockInfo.pid)) {
    return null;
  }

  return lockInfo;
}

function normalizeProcessList(rawOutput) {
  if (!rawOutput.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawOutput);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function isWebpackCommandLine(commandLine) {
  return /\s--webpack(?:\s|$)/.test(commandLine);
}

function listWindowsNextProcesses() {
  if (process.platform !== "win32") {
    return [];
  }

  const query = `
$appDir = $env:APP_DIR
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -like "*$appDir*" -and
    (
      $_.CommandLine -like "*next\\dist\\bin\\next* dev*" -or
      $_.CommandLine -like "*start-server.js*"
    )
  } |
  Select-Object ProcessId, CommandLine |
  ConvertTo-Json -Compress
`;

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", query],
    {
      cwd: appDir,
      env: { ...process.env, APP_DIR: appDir },
      encoding: "utf8",
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    return [];
  }

  return normalizeProcessList(result.stdout).map((entry) => ({
    pid: Number(entry.ProcessId),
    commandLine: String(entry.CommandLine ?? ""),
  }));
}

async function clearNextDevArtifacts() {
  await rm(nextDevDir, { recursive: true, force: true });
}

async function ensureWindowsWebpackServerState() {
  if (!useWebpack) {
    return { reused: false, cleaned: false };
  }

  const nextProcesses = listWindowsNextProcesses().filter((entry) => Number.isFinite(entry.pid));

  if (!nextProcesses.length) {
    return { reused: false, cleaned: false };
  }

  const webpackProcess = nextProcesses.find((entry) => isWebpackCommandLine(entry.commandLine));
  if (webpackProcess) {
    return { reused: true, cleaned: false };
  }

  const stalePids = Array.from(new Set(nextProcesses.map((entry) => entry.pid)));
  console.log(
    `Encontrada instancia antiga do Next sem webpack para apps/web. Reiniciando em modo estavel (${stalePids.join(", ")}).`,
  );

  for (const pid of stalePids) {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 1200));
  await clearNextDevArtifacts();
  return { reused: false, cleaned: true };
}

async function waitForExistingServer(initialLockInfo) {
  const existingServer = initialLockInfo ?? (await findExistingServer());
  const location = existingServer?.appUrl ?? "http://localhost:3000";
  const pidLabel = existingServer?.pid ? ` (PID ${existingServer.pid})` : "";

  console.log(`Next dev ja esta rodando para apps/web em ${location}${pidLabel}. Reaproveitando a instancia atual.`);
  if (useWebpack) {
    console.log("Se essa instancia foi iniciada antes desta mudanca, ela ainda pode estar em Turbopack.");
    console.log("Nesse caso, pare o processo atual e rode `bun run dev` de novo para subir em webpack.");
  }
  console.log("Se quiser reiniciar, pare o processo existente e rode `bun run dev` de novo.");

  for (;;) {
    const currentServer = await findExistingServer();
    if (!currentServer) {
      console.log("Lock do Next liberado. Encerrando o wrapper de reaproveitamento.");
      process.exit(0);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

async function main() {
  const windowsState = await ensureWindowsWebpackServerState();
  const existingServer = await findExistingServer();
  if (existingServer) {
    await waitForExistingServer(existingServer);
    return;
  }

  if (useWebpack && !windowsState.cleaned) {
    await clearNextDevArtifacts();
  }

  let combinedOutput = "";
  const args = ["next", "dev"];

  if (useWebpack) {
    args.push("--webpack");
    console.log("Next dev iniciado com webpack no Windows para evitar travamentos do Turbopack em HMR.");
    console.log("Se quiser testar Turbopack mesmo assim, use `bun run dev:turbopack`.");
  }

  const child = spawn("bunx", args, {
    cwd: appDir,
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  const appendOutput = (chunk) => {
    combinedOutput += chunk.toString();
    if (combinedOutput.length > 16000) {
      combinedOutput = combinedOutput.slice(-16000);
    }
  };

  child.stdout.on("data", (chunk) => {
    appendOutput(chunk);
    process.stdout.write(chunk);
  });

  child.stderr.on("data", (chunk) => {
    appendOutput(chunk);
    process.stderr.write(chunk);
  });

  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });

  child.on("exit", async (code) => {
    const duplicateServerError = combinedOutput.includes("Another next dev server is already running.");
    if (duplicateServerError) {
      await waitForExistingServer();
      return;
    }

    process.exit(code ?? 0);
  });
}

await main();
