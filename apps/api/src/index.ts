import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { builtinNodeDefinitions } from "@workspace/node-registry";
import { listArtifacts, listAuditEvents } from "@workspace/storage";
import {
  createProject,
  getProject,
  getProjectSettings,
  listProjects,
  updateProject,
  updateProjectSettings,
} from "@workspace/domain";
import {
  closeTerminalSession,
  createTerminalSession,
  getTerminalSessionSnapshot,
  runCommandInTerminalSession,
  resizeTerminalSession,
  signalTerminalSession,
  subscribeTerminalSessionOutput,
  writeToTerminalSession,
} from "./terminal-session-store";
import {
  connectNodesInProject,
  createWorkspaceViewForProject,
  createSpecialNodeForProject,
  disconnectEdgeInProject,
  getProjectWorkspaceState,
  removeNodeFromProject,
  saveProjectWorkspaceState,
  upsertCustomItemForProject,
} from "./workspace-state-store";

const app = new Elysia({ prefix: "/api" })
  .use(
    cors({
      origin: true,
      credentials: true,
    }),
  )
  .get("/health", () => ({
    ok: true,
    runtime: "elysia",
    timestamp: new Date().toISOString(),
  }))
  .get("/runtime/node-definitions", () => ({
    nodes: builtinNodeDefinitions,
  }))
  .get("/projects/:projectId/runtime/audit", async ({ params }) => ({
    events: await listAuditEvents(params.projectId),
  }))
  .get("/projects/:projectId/runtime/artifacts", async ({ params }) => ({
    artifacts: await listArtifacts(params.projectId),
  }))
  .get("/projects", async () => listProjects())
  .post("/projects", async ({ body }) => createProject(body), {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      website: t.Optional(t.String()),
    }),
  })
  .get("/projects/:projectId", async ({ params, set }) => {
    const project = await getProject(params.projectId);
    if (!project) {
      set.status = 404;
      return { error: "Project not found" };
    }

    return project;
  })
  .patch("/projects/:projectId", async ({ params, body }) => updateProject(params.projectId, body), {
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      website: t.Optional(t.String()),
    }),
  })
  .get("/projects/:projectId/settings", async ({ params, set }) => {
    try {
      return await getProjectSettings(params.projectId);
    } catch {
      set.status = 404;
      return { error: "Project not found" };
    }
  })
  .patch(
    "/projects/:projectId/settings",
    async ({ params, body, set }) => {
      try {
        return await updateProjectSettings(params.projectId, body);
      } catch {
        set.status = 404;
        return { error: "Project not found" };
      }
    },
    {
      body: t.Object({
        environment: t.Optional(t.Union([t.Literal("production"), t.Literal("staging"), t.Literal("development")])),
        website: t.Optional(t.String()),
        apiBaseUrl: t.Optional(t.String()),
        webhookUrl: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
        locale: t.Optional(t.String()),
        retentionDays: t.Optional(t.Number()),
        enableAnonymizedTracking: t.Optional(t.Boolean()),
        enableSessionReplay: t.Optional(t.Boolean()),
        enableProductEmails: t.Optional(t.Boolean()),
        enableErrorAlerts: t.Optional(t.Boolean()),
        sdkSnippet: t.Optional(t.String()),
      }),
    },
  )
  .get("/projects/:projectId/workspace/state", async ({ params }) => {
    return (
      (await getProjectWorkspaceState(params.projectId)) ?? {
        projectId: params.projectId,
        definition: null,
        customItems: [],
        updatedAt: new Date().toISOString(),
      }
    );
  })
  .put(
    "/projects/:projectId/workspace/state",
    async ({ params, body }) => {
      return await saveProjectWorkspaceState(params.projectId, {
        definition: body.definition ?? null,
        customItems: body.customItems ?? [],
      });
    },
    {
      body: t.Object({
        definition: t.Nullable(t.Any()),
        customItems: t.Array(t.Any()),
      }),
    },
  )
  .post(
    "/projects/:projectId/workspace/views",
    async ({ params, body }) => {
      return await createWorkspaceViewForProject(params.projectId, {
        name: body.name,
        template: body.template,
      });
    },
    {
      body: t.Object({
        name: t.String(),
        template: t.Optional(t.Union([t.Literal("workspace"), t.Literal("automation")])),
      }),
    },
  )
  .post(
    "/projects/:projectId/workspace/nodes/special",
    async ({ params, body }) => {
      return await createSpecialNodeForProject(params.projectId, body);
    },
    {
      body: t.Object({
        tabId: t.Optional(t.String()),
        kind: t.Union([
          t.Literal("default"),
          t.Literal("terminal"),
          t.Literal("markdown"),
          t.Literal("ai"),
          t.Literal("file-manager"),
          t.Literal("file-viewer"),
          t.Literal("browser"),
        ]),
        label: t.Optional(t.String()),
        description: t.Optional(t.String()),
        x: t.Optional(t.Number()),
        y: t.Optional(t.Number()),
        w: t.Optional(t.Number()),
        h: t.Optional(t.Number()),
        command: t.Optional(t.String()),
      }),
    },
  )
  .patch(
    "/projects/:projectId/workspace/items/:itemId",
    async ({ params, body }) => {
      return await upsertCustomItemForProject(params.projectId, params.itemId, body);
    },
    {
      body: t.Record(t.String(), t.Any()),
    },
  )
  .delete(
    "/projects/:projectId/workspace/nodes/:nodeId",
    async ({ params, query }) => {
      return await removeNodeFromProject(params.projectId, {
        tabId: typeof query.tabId === "string" ? query.tabId : undefined,
        nodeId: params.nodeId,
      });
    },
    {
      query: t.Object({
        tabId: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/projects/:projectId/workspace/edges",
    async ({ params, body }) => {
      return await connectNodesInProject(params.projectId, body);
    },
    {
      body: t.Object({
        tabId: t.Optional(t.String()),
        sourceNodeId: t.String(),
        targetNodeId: t.String(),
        label: t.Optional(t.String()),
        kind: t.Optional(t.String()),
        type: t.Optional(t.String()),
      }),
    },
  )
  .delete(
    "/projects/:projectId/workspace/edges/:edgeId",
    async ({ params, query }) => {
      return await disconnectEdgeInProject(params.projectId, {
        tabId: typeof query.tabId === "string" ? query.tabId : undefined,
        edgeId: params.edgeId,
      });
    },
    {
      query: t.Object({
        tabId: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/projects/:projectId/terminal/sessions",
    async ({ params, body }) => {
      return createTerminalSession({
        projectId: params.projectId,
        shell: body.shell,
        workingDirectory: body.workingDirectory,
        cols: body.cols,
        rows: body.rows,
        initialOutput: body.initialOutput,
      });
    },
    {
      body: t.Object({
        shell: t.Optional(t.Union([t.Literal("bash"), t.Literal("zsh"), t.Literal("powershell"), t.Literal("cmd")])),
        workingDirectory: t.Optional(t.String()),
        cols: t.Optional(t.Number()),
        rows: t.Optional(t.Number()),
        initialOutput: t.Optional(t.String()),
      }),
    },
  )
  .get("/projects/:projectId/terminal/sessions/:sessionId", async ({ params }) => {
    return getTerminalSessionSnapshot(params.projectId, params.sessionId);
  })
  .get("/projects/:projectId/terminal/sessions/:sessionId/stream", async ({ params, set }) => {
    set.headers["content-type"] = "text/event-stream";
    set.headers["cache-control"] = "no-cache, no-transform";
    set.headers["connection"] = "keep-alive";

    const initial = getTerminalSessionSnapshot(params.projectId, params.sessionId);
    let cleanup: (() => void) | undefined;

    return new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const writeEvent = (event: string, payload: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          };

          writeEvent("snapshot", initial);

          const unsubscribe = subscribeTerminalSessionOutput(
            {
              projectId: params.projectId,
              sessionId: params.sessionId,
            },
            (event) => {
              writeEvent("terminal.output", event);
            },
          );

          const keepAlive = setInterval(() => {
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          }, 10_000);

          cleanup = () => {
            clearInterval(keepAlive);
            unsubscribe();
          };
        },
        cancel() {
          cleanup?.();
        },
      }),
      {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        },
      },
    );
  })
  .post(
    "/projects/:projectId/terminal/sessions/:sessionId/input",
    async ({ params, body }) => {
      return writeToTerminalSession({
        projectId: params.projectId,
        sessionId: params.sessionId,
        data: body.data,
      });
    },
    {
      body: t.Object({
        data: t.String(),
      }),
    },
  )
  .post(
    "/projects/:projectId/terminal/sessions/:sessionId/resize",
    async ({ params, body }) => {
      return resizeTerminalSession({
        projectId: params.projectId,
        sessionId: params.sessionId,
        cols: body.cols,
        rows: body.rows,
      });
    },
    {
      body: t.Object({
        cols: t.Number(),
        rows: t.Number(),
      }),
    },
  )
  .post(
    "/projects/:projectId/terminal/sessions/:sessionId/signal",
    async ({ params, body }) => {
      return signalTerminalSession({
        projectId: params.projectId,
        sessionId: params.sessionId,
        signal: body.signal,
      });
    },
    {
      body: t.Object({
        signal: t.Union([t.Literal("SIGINT"), t.Literal("SIGTERM"), t.Literal("EOF")]),
      }),
    },
  )
  .post(
    "/projects/:projectId/terminal/sessions/:sessionId/commands",
    async ({ params, body }) => {
      return await runCommandInTerminalSession({
        projectId: params.projectId,
        sessionId: params.sessionId,
        command: body.command,
      });
    },
    {
      body: t.Object({
        command: t.String(),
      }),
    },
  )
  .delete("/projects/:projectId/terminal/sessions/:sessionId", async ({ params }) => {
    return closeTerminalSession(params.projectId, params.sessionId);
  })
  .post(
    "/projects/:projectId/terminal/execute",
    async ({ params, body, set }) => {
      try {
        const session = await createTerminalSession({
          projectId: params.projectId,
          shell: body.shell ?? "cmd",
          workingDirectory: body.workingDirectory,
          cols: body.cols,
          rows: body.rows,
        });
        const result = await runCommandInTerminalSession({
          projectId: params.projectId,
          sessionId: session.id,
          command: body.command,
        });
        closeTerminalSession(params.projectId, session.id);

        return {
          output: result.output,
          workingDirectory: result.workingDirectory,
          shell: result.session.shell,
          exitCode: result.exitCode,
        };
      } catch (cause) {
        set.status = 500;
        return {
          error: cause instanceof Error ? cause.message : "Falha ao executar comando.",
        };
      }
    },
    {
      body: t.Object({
        shell: t.Optional(t.Union([t.Literal("bash"), t.Literal("zsh"), t.Literal("powershell"), t.Literal("cmd")])),
        command: t.String(),
        workingDirectory: t.Optional(t.String()),
        cols: t.Optional(t.Number()),
        rows: t.Optional(t.Number()),
      }),
    },
  );

const port = Number(process.env.PORT ?? 4000);

app.listen(port);

console.log(`Elysia API listening on http://localhost:${port}`);
