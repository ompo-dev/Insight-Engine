import type { WorkspaceNodeDefinition } from "@workspace/runtime-core";

function createNodeDefinition(input: WorkspaceNodeDefinition): WorkspaceNodeDefinition {
  return input;
}

export const builtinNodeDefinitions: WorkspaceNodeDefinition[] = [
  createNodeDefinition({
    type: "terminal",
    family: "terminal",
    label: "Terminal",
    description: "Sessao shell local com PTY, stdin continuo e relay de output.",
    capabilities: ["execute", "stream", "filesystem", "process-control"],
    configSchema: {
      type: "object",
      properties: {
        shell: { type: "string" },
        workingDirectory: { type: "string" },
        cols: { type: "number" },
        rows: { type: "number" },
      },
    },
    defaultState: {
      shell: "cmd",
      workingDirectory: ".",
      cols: 120,
      rows: 30,
    },
    renderer: "terminal",
    executor: "local",
    mcpActions: [
      "terminal_open_session",
      "terminal_attach_session",
      "terminal_write_input",
      "terminal_resize",
      "terminal_signal",
      "terminal_close_session",
    ],
  }),
  createNodeDefinition({
    type: "ai",
    family: "ai",
    label: "AI Node",
    description: "Agente local que usa MCP para ler, criar, editar e orquestrar nodes.",
    capabilities: ["plan", "act", "read-workspace", "mutate-workspace", "create-artifact"],
    configSchema: {
      type: "object",
      properties: {
        provider: { type: "string" },
        model: { type: "string" },
        systemPrompt: { type: "string" },
      },
    },
    defaultState: {
      provider: "openai",
      model: "gpt-5.4-mini",
      systemPrompt: "Leia o workspace e execute o fluxo necessario.",
    },
    renderer: "card",
    executor: "agent",
    mcpActions: [
      "workspace_get_state",
      "workspace_create_special_node",
      "workspace_update_custom_item",
      "workspace_connect_nodes",
      "workspace_delete_node",
    ],
  }),
  createNodeDefinition({
    type: "markdown",
    family: "markdown-report",
    label: "Markdown Report",
    description: "Node de documento e relatorio com preview local.",
    capabilities: ["render", "summarize", "export"],
    configSchema: {
      type: "object",
      properties: {
        template: { type: "string" },
        document: { type: "string" },
      },
    },
    defaultState: {
      template: "report",
      document: "# Relatorio",
    },
    renderer: "surface",
    executor: "none",
    mcpActions: ["workspace_update_custom_item"],
  }),
  createNodeDefinition({
    type: "file-manager",
    family: "file-manager",
    label: "File Manager",
    description: "Gerencia arquivos locais do projeto e do workspace.",
    capabilities: ["list-files", "upload", "delete", "open"],
    configSchema: {
      type: "object",
      properties: {
        assetIds: { type: "array" },
        viewMode: { type: "string" },
      },
    },
    defaultState: {
      assetIds: [],
      viewMode: "list",
    },
    renderer: "surface",
    executor: "local",
    mcpActions: ["workspace_update_custom_item"],
  }),
  createNodeDefinition({
    type: "file-viewer",
    family: "file-viewer",
    label: "File Viewer",
    description: "Visualiza texto, tabela, imagem e documento dentro do canvas.",
    capabilities: ["preview", "page", "sheet-select"],
    configSchema: {
      type: "object",
      properties: {
        assetId: { type: "string" },
        viewerType: { type: "string" },
      },
    },
    defaultState: {
      assetId: null,
      viewerType: "document",
    },
    renderer: "surface",
    executor: "none",
    mcpActions: ["workspace_update_custom_item"],
  }),
  createNodeDefinition({
    type: "browser",
    family: "browser",
    label: "Browser",
    description: "Node de navegador local para leitura e coleta de contexto.",
    capabilities: ["navigate", "snapshot", "history"],
    configSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        history: { type: "array" },
      },
    },
    defaultState: {
      url: "https://example.com",
      history: ["https://example.com"],
    },
    renderer: "surface",
    executor: "browser",
    mcpActions: ["workspace_update_custom_item"],
  }),
  createNodeDefinition({
    type: "dataset-query",
    family: "dataset-query",
    label: "Dataset Query",
    description: "Le e transforma datasets locais e outputs de outros nodes.",
    capabilities: ["query", "transform", "materialize"],
    configSchema: {
      type: "object",
      properties: {
        expression: { type: "string" },
      },
    },
    defaultState: {
      expression: "",
    },
    renderer: "card",
    executor: "local",
    mcpActions: ["workspace_update_custom_item"],
  }),
  createNodeDefinition({
    type: "http-webhook",
    family: "http-webhook",
    label: "HTTP/Webhook",
    description: "Entrega output do fluxo para endpoints HTTP externos.",
    capabilities: ["send", "retry", "format-payload"],
    configSchema: {
      type: "object",
      properties: {
        method: { type: "string" },
        target: { type: "string" },
      },
    },
    defaultState: {
      method: "POST",
      target: "",
    },
    renderer: "card",
    executor: "local",
    mcpActions: ["workspace_update_custom_item"],
  }),
  createNodeDefinition({
    type: "workflow-router",
    family: "workflow-router",
    label: "Workflow Router",
    description: "Coordena gatilhos, dependencia e roteamento entre nodes.",
    capabilities: ["route", "branch", "trigger"],
    configSchema: {
      type: "object",
      properties: {
        mode: { type: "string" },
      },
    },
    defaultState: {
      mode: "sequential",
    },
    renderer: "card",
    executor: "agent",
    mcpActions: ["workspace_connect_nodes", "workspace_disconnect_edge"],
  }),
  createNodeDefinition({
    type: "custom-plugin",
    family: "custom-plugin",
    label: "Custom Plugin",
    description: "Node programavel definido pelo proprio usuario ou por um agente.",
    capabilities: ["custom-config", "custom-render", "custom-execute"],
    configSchema: {
      type: "object",
      properties: {
        config: { type: "object" },
      },
    },
    defaultState: {
      config: {},
    },
    renderer: "card",
    executor: "agent",
    mcpActions: ["workspace_create_special_node", "workspace_update_custom_item"],
  }),
];

export const builtinNodeDefinitionMap = Object.fromEntries(
  builtinNodeDefinitions.map((definition) => [definition.type, definition]),
) as Record<string, WorkspaceNodeDefinition>;

export function getBuiltinNodeDefinition(type: string) {
  return builtinNodeDefinitionMap[type] ?? null;
}
