import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { builtinNodeDefinitions } from "@workspace/node-registry";
import type { TerminalSessionShell, TerminalSignal } from "@workspace/runtime-core";
import { z } from "zod";

function jsonResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function toolError(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}

export interface LynxMcpBindings<TDefinition = unknown, TItem = Record<string, unknown>> {
  getWorkspaceState: (
    projectId: string,
  ) => Promise<{ projectId: string; definition: TDefinition | null; customItems: TItem[]; updatedAt: string } | null>;
  replaceWorkspaceState: (
    projectId: string,
    definition: TDefinition | null,
    customItems: TItem[],
  ) => Promise<unknown>;
  createView: (projectId: string, input: { name: string; template?: "workspace" | "automation" }) => Promise<unknown>;
  createSpecialNode: (
    projectId: string,
    input: {
      tabId?: string;
      kind: string;
      label?: string;
      description?: string;
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      command?: string;
    },
  ) => Promise<unknown>;
  updateCustomItem: (projectId: string, itemId: string, patch: Partial<TItem>) => Promise<unknown>;
  deleteNode: (projectId: string, input: { tabId?: string; nodeId: string }) => Promise<unknown>;
  connectNodes: (
    projectId: string,
    input: { tabId?: string; sourceNodeId: string; targetNodeId: string; label?: string; type?: string },
  ) => Promise<unknown>;
  disconnectEdge: (projectId: string, input: { tabId?: string; edgeId: string }) => Promise<unknown>;
  terminal: {
    openSession: (input: {
      projectId: string;
      shell?: TerminalSessionShell;
      workingDirectory?: string;
      cols?: number;
      rows?: number;
    }) => Promise<unknown>;
    attachSession: (projectId: string, sessionId: string) => unknown;
    writeInput: (input: { projectId: string; sessionId: string; data: string }) => unknown;
    resizeSession: (input: { projectId: string; sessionId: string; cols: number; rows: number }) => unknown;
    sendSignal: (input: { projectId: string; sessionId: string; signal: TerminalSignal }) => unknown;
    listSessions: (projectId?: string) => unknown;
    closeSession: (projectId: string, sessionId: string) => unknown;
  };
}

export function createLynxMcpServer<TDefinition = unknown, TItem = Record<string, unknown>>(
  bindings: LynxMcpBindings<TDefinition, TItem>,
) {
  const server = new McpServer({
    name: "lynx-local-workspace",
    version: "0.2.0",
  });

  server.registerTool(
    "workspace_get_state",
    {
      description: "Retorna o snapshot atual do projeto.",
      inputSchema: {
        projectId: z.string(),
      },
    },
    async ({ projectId }) => {
      const state =
        (await bindings.getWorkspaceState(projectId)) ??
        {
          projectId,
          definition: null,
          customItems: [],
          updatedAt: new Date().toISOString(),
        };
      return jsonResult(state);
    },
  );

  server.registerTool(
    "workspace_replace_state",
    {
      description: "Substitui completamente o estado persistido do projeto.",
      inputSchema: {
        projectId: z.string(),
        definition: z.unknown().nullable(),
        customItems: z.array(z.record(z.string(), z.unknown())),
      },
    },
    async ({ projectId, definition, customItems }) =>
      jsonResult(await bindings.replaceWorkspaceState(projectId, definition as TDefinition | null, customItems as TItem[])),
  );

  server.registerTool(
    "workspace_create_view",
    {
      description: "Cria uma nova view no workspace.",
      inputSchema: {
        projectId: z.string(),
        name: z.string(),
        template: z.enum(["workspace", "automation"]).optional(),
      },
    },
    async ({ projectId, name, template }) => {
      if (!name.trim()) return toolError("name is required.");
      return jsonResult(await bindings.createView(projectId, { name, template }));
    },
  );

  server.registerTool(
    "workspace_create_special_node",
    {
      description: "Cria um node especial ou programavel.",
      inputSchema: {
        projectId: z.string(),
        tabId: z.string().optional(),
        kind: z.string(),
        label: z.string().optional(),
        description: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        w: z.number().optional(),
        h: z.number().optional(),
        command: z.string().optional(),
      },
    },
    async (args) => jsonResult(await bindings.createSpecialNode(args.projectId, args)),
  );

  server.registerTool(
    "workspace_update_custom_item",
    {
      description: "Atualiza configuracoes de um node customizado.",
      inputSchema: {
        projectId: z.string(),
        itemId: z.string(),
        patch: z.record(z.string(), z.unknown()),
      },
    },
    async ({ projectId, itemId, patch }) =>
      jsonResult(await bindings.updateCustomItem(projectId, itemId, patch as Partial<TItem>)),
  );

  server.registerTool(
    "workspace_delete_node",
    {
      description: "Remove um node e suas conexoes.",
      inputSchema: {
        projectId: z.string(),
        tabId: z.string().optional(),
        nodeId: z.string(),
      },
    },
    async ({ projectId, tabId, nodeId }) => jsonResult(await bindings.deleteNode(projectId, { tabId, nodeId })),
  );

  server.registerTool(
    "workspace_connect_nodes",
    {
      description: "Conecta dois nodes com uma edge tipada.",
      inputSchema: {
        projectId: z.string(),
        tabId: z.string().optional(),
        sourceNodeId: z.string(),
        targetNodeId: z.string(),
        label: z.string().optional(),
        type: z.string().optional(),
      },
    },
    async ({ projectId, tabId, sourceNodeId, targetNodeId, label, type }) =>
      jsonResult(await bindings.connectNodes(projectId, { tabId, sourceNodeId, targetNodeId, label, type })),
  );

  server.registerTool(
    "workspace_disconnect_edge",
    {
      description: "Remove uma edge existente.",
      inputSchema: {
        projectId: z.string(),
        tabId: z.string().optional(),
        edgeId: z.string(),
      },
    },
    async ({ projectId, tabId, edgeId }) => jsonResult(await bindings.disconnectEdge(projectId, { tabId, edgeId })),
  );

  server.registerTool(
    "node_list_definitions",
    {
      description: "Lista os node definitions nativos do runtime local.",
      inputSchema: {},
    },
    async () => jsonResult(builtinNodeDefinitions),
  );

  server.registerTool(
    "terminal_open_session",
    {
      description: "Abre uma sessao shell local.",
      inputSchema: {
        projectId: z.string(),
        shell: z.enum(["bash", "zsh", "powershell", "cmd"]).optional(),
        workingDirectory: z.string().optional(),
        cols: z.number().optional(),
        rows: z.number().optional(),
      },
    },
    async ({ projectId, shell, workingDirectory, cols, rows }) =>
      jsonResult(await bindings.terminal.openSession({ projectId, shell, workingDirectory, cols, rows })),
  );

  server.registerTool(
    "terminal_attach_session",
    {
      description: "Anexa a uma sessao shell existente e retorna o snapshot atual.",
      inputSchema: {
        projectId: z.string(),
        sessionId: z.string(),
      },
    },
    async ({ projectId, sessionId }) => jsonResult(bindings.terminal.attachSession(projectId, sessionId)),
  );

  server.registerTool(
    "terminal_write_input",
    {
      description: "Escreve bytes diretamente no stdin da sessao shell.",
      inputSchema: {
        projectId: z.string(),
        sessionId: z.string(),
        data: z.string(),
      },
    },
    async ({ projectId, sessionId, data }) => {
      if (!data.length) return toolError("data is required.");
      return jsonResult(bindings.terminal.writeInput({ projectId, sessionId, data }));
    },
  );

  server.registerTool(
    "terminal_resize",
    {
      description: "Redimensiona o PTY da sessao shell.",
      inputSchema: {
        projectId: z.string(),
        sessionId: z.string(),
        cols: z.number(),
        rows: z.number(),
      },
    },
    async ({ projectId, sessionId, cols, rows }) =>
      jsonResult(bindings.terminal.resizeSession({ projectId, sessionId, cols, rows })),
  );

  server.registerTool(
    "terminal_signal",
    {
      description: "Envia sinal para a sessao shell.",
      inputSchema: {
        projectId: z.string(),
        sessionId: z.string(),
        signal: z.enum(["SIGINT", "SIGTERM", "EOF"]),
      },
    },
    async ({ projectId, sessionId, signal }) =>
      jsonResult(bindings.terminal.sendSignal({ projectId, sessionId, signal })),
  );

  server.registerTool(
    "terminal_list_sessions",
    {
      description: "Lista sessoes shell abertas.",
      inputSchema: {
        projectId: z.string().optional(),
      },
    },
    async ({ projectId }) => jsonResult(bindings.terminal.listSessions(projectId)),
  );

  server.registerTool(
    "terminal_close_session",
    {
      description: "Fecha uma sessao shell local.",
      inputSchema: {
        projectId: z.string(),
        sessionId: z.string(),
      },
    },
    async ({ projectId, sessionId }) => jsonResult(bindings.terminal.closeSession(projectId, sessionId)),
  );

  return server;
}

export async function startLynxMcpServerStdio<TDefinition = unknown, TItem = Record<string, unknown>>(
  bindings: LynxMcpBindings<TDefinition, TItem>,
) {
  const server = createLynxMcpServer(bindings);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
