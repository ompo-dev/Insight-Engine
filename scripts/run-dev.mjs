import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const bunExecutable = process.platform === "win32"
  ? resolve(process.env.USERPROFILE ?? "C:\\Users\\Default", ".bun", "bin", "bun.exe")
  : "bun";

const children = [];
let shuttingDown = false;

function killProcessTree(pid) {
  if (!pid) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // process already exited
    }
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    killProcessTree(child.pid);
  }

  process.exit(code);
}

function spawnWorkspaceDev(name, args) {
  const child = spawn(bunExecutable, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    detached: process.platform !== "win32",
  });

  children.push(child);

  child.on("exit", (code) => {
    if (shuttingDown) {
      return;
    }

    const exitCode = code ?? 0;
    if (exitCode !== 0) {
      console.error(`${name} encerrou com erro (${exitCode}). Finalizando o runner dev.`);
      shutdown(exitCode);
      return;
    }

    const remainingChildren = children.filter((entry) => entry.exitCode === null);
    if (remainingChildren.length === 0) {
      shutdown(0);
    }
  });

  child.on("error", (error) => {
    console.error(`${name} falhou ao iniciar.`);
    console.error(error);
    shutdown(1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

spawnWorkspaceDev("api", ["run", "--cwd", "apps/api", "dev"]);
spawnWorkspaceDev("web", ["run", "--cwd", "apps/web", "dev"]);
