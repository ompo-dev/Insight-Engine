# Lynx Desktop

Shell desktop em Tauri para o runtime local do Lynx.

Modo atual:
- `devUrl` aponta para `http://localhost:3000`, reutilizando o `apps/web`.
- O runtime local continua vindo do `apps/api`.
- O build nativo depende de Rust/Cargo e Tauri instalados na maquina.

Comandos:
- `bun run --cwd apps/desktop dev`
- `bun run --cwd apps/desktop build`
