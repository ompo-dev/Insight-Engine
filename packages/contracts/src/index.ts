import { z } from "zod";

export const projectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  apiKey: z.string(),
  abacatePayConnected: z.boolean().default(false),
  eventCount: z.number().default(0),
  sessionCount: z.number().default(0),
  customerCount: z.number().default(0),
  mrr: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  website: z.string().url().optional()
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectSettingsSchema = z.object({
  projectId: z.string(),
  environment: z.enum(["production", "staging", "development"]),
  website: z.string(),
  apiBaseUrl: z.string(),
  webhookUrl: z.string(),
  timezone: z.string(),
  locale: z.string(),
  retentionDays: z.number(),
  enableAnonymizedTracking: z.boolean(),
  enableSessionReplay: z.boolean(),
  enableProductEmails: z.boolean(),
  enableErrorAlerts: z.boolean(),
  sdkSnippet: z.string()
});

export const terminalShellSchema = z.enum(["bash", "zsh", "powershell", "cmd"]);
export const terminalSessionStatusSchema = z.enum(["idle", "running", "error", "exited"]);
export const terminalSignalSchema = z.enum(["SIGINT", "SIGTERM", "EOF"]);

export const executeTerminalCommandSchema = z.object({
  shell: terminalShellSchema.default("cmd"),
  command: z.string().min(1),
  workingDirectory: z.string().optional()
});

export const executeTerminalResponseSchema = z.object({
  output: z.string(),
  workingDirectory: z.string(),
  shell: terminalShellSchema,
  exitCode: z.number().nullable()
});

export const terminalSessionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  shell: terminalShellSchema,
  workingDirectory: z.string(),
  status: terminalSessionStatusSchema,
  output: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  exitCode: z.number().nullable(),
  cols: z.number(),
  rows: z.number()
});

export const terminalInputSchema = z.object({
  data: z.string().min(1)
});

export const terminalResizeSchema = z.object({
  cols: z.number().int().positive(),
  rows: z.number().int().positive()
});

export const terminalSignalInputSchema = z.object({
  signal: terminalSignalSchema
});

export const terminalOutputEventSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  channel: z.literal("terminal.output"),
  chunk: z.string(),
  output: z.string(),
  status: terminalSessionStatusSchema,
  createdAt: z.string()
});

export const workspaceRemoteStateSchema = z.object({
  projectId: z.string(),
  definition: z.unknown().nullable(),
  customItems: z.array(z.record(z.string(), z.unknown())),
  updatedAt: z.string()
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectSettings = z.infer<typeof projectSettingsSchema>;
export type TerminalShell = z.infer<typeof terminalShellSchema>;
export type TerminalSessionStatus = z.infer<typeof terminalSessionStatusSchema>;
export type TerminalSignal = z.infer<typeof terminalSignalSchema>;
export type ExecuteTerminalCommandInput = z.infer<typeof executeTerminalCommandSchema>;
export type ExecuteTerminalResponse = z.infer<typeof executeTerminalResponseSchema>;
export type TerminalSession = z.infer<typeof terminalSessionSchema>;
export type TerminalInput = z.infer<typeof terminalInputSchema>;
export type TerminalResizeInput = z.infer<typeof terminalResizeSchema>;
export type TerminalSignalInput = z.infer<typeof terminalSignalInputSchema>;
export type TerminalOutputEvent = z.infer<typeof terminalOutputEventSchema>;
export type WorkspaceRemoteState = z.infer<typeof workspaceRemoteStateSchema>;
