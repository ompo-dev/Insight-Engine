import { startLynxMcpServerStdio } from "@workspace/mcp-server";
import {
  closeTerminalSession,
  createTerminalSession,
  getTerminalSessionSnapshot,
  listTerminalSessions,
  resizeTerminalSession,
  signalTerminalSession,
  writeToTerminalSession,
} from "./terminal-session-store";
import {
  connectNodesInProject,
  createSpecialNodeForProject,
  createWorkspaceViewForProject,
  disconnectEdgeInProject,
  getProjectWorkspaceState,
  removeNodeFromProject,
  saveProjectWorkspaceState,
  upsertCustomItemForProject,
} from "./workspace-state-store";

await startLynxMcpServerStdio({
  getWorkspaceState: async (projectId) =>
    (await getProjectWorkspaceState(projectId)) ?? {
      projectId,
      definition: null,
      customItems: [],
      updatedAt: new Date().toISOString(),
    },
  replaceWorkspaceState: async (projectId, definition, customItems) =>
    saveProjectWorkspaceState(projectId, {
      definition,
      customItems,
    }),
  createView: async (projectId, input) => createWorkspaceViewForProject(projectId, input),
  createSpecialNode: async (projectId, input) =>
    createSpecialNodeForProject(projectId, input as Parameters<typeof createSpecialNodeForProject>[1]),
  updateCustomItem: async (projectId, itemId, patch) => upsertCustomItemForProject(projectId, itemId, patch),
  deleteNode: async (projectId, input) => removeNodeFromProject(projectId, input),
  connectNodes: async (projectId, input) => connectNodesInProject(projectId, input),
  disconnectEdge: async (projectId, input) => disconnectEdgeInProject(projectId, input),
  terminal: {
    openSession: async (input) => createTerminalSession(input),
    attachSession: (projectId, sessionId) => getTerminalSessionSnapshot(projectId, sessionId),
    writeInput: (input) => writeToTerminalSession(input),
    resizeSession: (input) => resizeTerminalSession(input),
    sendSignal: (input) => signalTerminalSession(input),
    listSessions: (projectId) => listTerminalSessions(projectId),
    closeSession: (projectId, sessionId) => closeTerminalSession(projectId, sessionId),
  },
});
