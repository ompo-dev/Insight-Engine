import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const mode = process.argv[2];
const bunBinDir = process.platform === "win32"
  ? resolve(process.env.USERPROFILE ?? "C:\\Users\\Default", ".bun", "bin")
  : null;
const bunExecutable = bunBinDir
  ? resolve(bunBinDir, "bun.exe")
  : "bun";

const cargoBinDir = process.platform === "win32"
  ? resolve(process.env.USERPROFILE ?? "C:\\Users\\Default", ".cargo", "bin")
  : null;

const env = { ...process.env };
const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";

if (cargoBinDir) {
  const cargoExecutable = resolve(cargoBinDir, "cargo.exe");
  const currentPath = env[pathKey] ?? "";

  if (existsSync(cargoExecutable) && !currentPath.toLowerCase().includes(cargoBinDir.toLowerCase())) {
    env[pathKey] = `${cargoBinDir};${currentPath}`;
  }
}

if (bunBinDir) {
  const currentPath = env[pathKey] ?? "";

  if (existsSync(bunExecutable) && !currentPath.toLowerCase().includes(bunBinDir.toLowerCase())) {
    env[pathKey] = `${bunBinDir};${currentPath}`;
  }
}

if (!mode || !["dev", "build"].includes(mode)) {
  console.error("Usage: bun run scripts/run-tauri.mjs <dev|build>");
  process.exit(1);
}

const cargoCheck = spawnSync("cargo", ["--version"], {
  stdio: "ignore",
  shell: process.platform === "win32",
  env,
});

if (cargoCheck.status !== 0) {
  console.error("Rust/Cargo nao esta instalado nesta maquina.");
  console.error("Use `bun run dev` para web/api e instale Rust para habilitar o desktop Tauri.");
  console.error("Depois rode `bun run dev:desktop` ou `bun run build:desktop`.");
  process.exit(1);
}

const child = spawn(bunExecutable, ["x", "tauri", mode], {
  stdio: "inherit",
  shell: false,
  env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
