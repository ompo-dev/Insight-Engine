import type {
  CollectionDefinition,
  MaterializedDataset,
  MaterializedMetric,
  MetricDefinition,
  ModelDefinition,
  TelemetryDslProgram,
  TelemetrySchemaField,
  TelemetrySnippetBundle,
  TelemetryViewPreview,
  ViewDefinition,
} from "@/lib/telemetry/types";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

export type TelemetryItemMode = "capture" | "value" | "list" | "canvas" | "custom";
export type TelemetryItemStatus = "healthy" | "attention" | "inactive" | "draft";
export type TelemetryItemResultType = "auto" | "number" | "currency" | "percentage" | "text" | "dataset";
export type NodeDisplayPresentation = "stat" | "table" | "line" | "comparison" | "text";
export type NodeActionType = "webhook" | "dataset-export" | "integration" | "ai-trigger";
export type NodeRunStatus = "idle" | "success" | "error";
export type NodeActionDeliveryStatus = "idle" | "delivered" | "error";
export type SpecialTelemetryNodeKind = "terminal" | "markdown" | "ai";
export type TerminalNodeShell = "bash" | "zsh" | "powershell" | "custom";
export type AiProvider = "openai" | "anthropic" | "google" | "custom";

export interface TerminalNodeConfig {
  shell: TerminalNodeShell;
  command: string;
  workingDirectory: string;
  streamOutput: boolean;
  stdinExpression: string;
  liveOutput: string;
}

export interface MarkdownNodeConfig {
  document: string;
  template: "report" | "notes" | "freeform";
  autoPreview: boolean;
}

export interface AiNodeConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  systemPrompt: string;
  autoRun: boolean;
  temperature: number;
  lastResponse: string;
}

export interface TelemetrySystemMetric {
  key: string;
  label: string;
  value: number;
}

export interface TelemetryExpressionSuggestion {
  value: string;
  label: string;
  description: string;
  category: "item" | "field" | "system";
}

export interface TelemetryExpressionPreview {
  kind: "empty" | "number" | "text" | "dataset" | "error";
  raw: unknown;
  text: string;
  error?: string;
  numericValue?: number;
}

export type TelemetryNodeIconKey =
  | "database"
  | "sparkles"
  | "table"
  | "chart"
  | "layout"
  | "workflow"
  | "arrowUp"
  | "arrowDown"
  | "arrowRight"
  | "receipt"
  | "alert"
  | "blocks"
  | "terminal"
  | "markdown"
  | "brain";

export interface TelemetryNodeVisuals {
  titleNode?: string | null;
  subTitleNode?: string | null;
  badgeNode?: string | null;
  iconNode?: TelemetryNodeIconKey | null;
}

export interface TelemetryItemSource {
  kind: "item" | "system";
  ref: string;
  label: string;
}

export interface ExecutionStep {
  id: string;
  label: string;
  status: NodeRunStatus;
  detail?: string;
}

export interface ExecutionRun {
  id: string;
  nodeId: string;
  startedAt: string;
  finishedAt: string;
  latencyMs: number;
  status: NodeRunStatus;
  trigger: "ingest" | "recompute" | "manual" | "action-replay";
  origin: string[];
  steps: ExecutionStep[];
}

export interface NodeResult {
  kind: TelemetryExpressionPreview["kind"];
  raw: unknown;
  text: string;
  updatedAt: string;
  status: NodeRunStatus;
  latencyMs: number;
  origin: string[];
  error?: string;
}

export interface ActionDelivery {
  id: string;
  runId: string;
  nodeId: string;
  type: NodeActionType;
  status: NodeActionDeliveryStatus;
  live: boolean;
  target: string;
  method: string;
  payload: unknown;
  deliveredAt: string;
  error?: string;
}

export interface NodeReceiveConfig {
  enabled: boolean;
  schema?: TelemetrySchemaField;
  samplePayload?: Record<string, unknown> | null;
  identityKeys: string[];
  timestampField?: string | null;
  snippets?: TelemetrySnippetBundle;
}

export interface NodeTransformConfig {
  enabled: boolean;
  expression: string;
  resultType: TelemetryItemResultType;
  preview?: TelemetryExpressionPreview;
}

export interface NodeDisplayConfig {
  enabled: boolean;
  presentation: NodeDisplayPresentation;
}

export interface NodeActionConfig {
  enabled: boolean;
  type: NodeActionType;
  target?: string | null;
  method: "POST" | "PUT" | "PATCH";
  live: boolean;
  payloadExpression: string;
}

export interface CustomTelemetryItemDefinition {
  id: string;
  projectId: string;
  slug: string;
  label: string;
  description?: string | null;
  tags: string[];
  status: TelemetryItemStatus;
  inputEnabled: boolean;
  schema?: TelemetrySchemaField;
  samplePayload?: Record<string, unknown> | null;
  identityKeys: string[];
  timestampField?: string | null;
  expression: string;
  resultType: TelemetryItemResultType;
  displayEnabled: boolean;
  presentation: NodeDisplayPresentation;
  actionEnabled: boolean;
  actionType: NodeActionType;
  actionTarget?: string | null;
  actionMethod: "POST" | "PUT" | "PATCH";
  actionLive: boolean;
  actionPayloadExpression: string;
  specialKind?: SpecialTelemetryNodeKind | null;
  terminal?: TerminalNodeConfig;
  markdown?: MarkdownNodeConfig;
  ai?: AiNodeConfig;
  executionRuns?: ExecutionRun[];
  actionDeliveries?: ActionDelivery[];
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryItemDefinition {
  id: string;
  projectId: string;
  slug: string;
  label: string;
  description?: string | null;
  mode: TelemetryItemMode;
  status: TelemetryItemStatus;
  tags: string[];
  acceptsInput: boolean;
  hasLogic: boolean;
  hasDisplay: boolean;
  outputShape: "records" | "value" | "dataset";
  schema?: TelemetrySchemaField;
  samplePayload?: Record<string, unknown> | null;
  identityKeys: string[];
  timestampField?: string | null;
  recordCount: number;
  lastIngestedAt?: string | null;
  format?: "number" | "currency" | "percentage";
  presentation?: NodeDisplayPresentation;
  dsl?: TelemetryDslProgram;
  sources: TelemetryItemSource[];
  materializedMetric?: MaterializedMetric;
  materializedDataset?: MaterializedDataset;
  canvasPreview?: TelemetryViewPreview;
  snippets?: TelemetrySnippetBundle;
  expression?: string;
  resultType?: TelemetryItemResultType;
  inputEnabled?: boolean;
  displayEnabled?: boolean;
  actionEnabled?: boolean;
  actionType?: NodeActionType;
  actionTarget?: string | null;
  actionMethod?: "POST" | "PUT" | "PATCH";
  actionLive?: boolean;
  actionPayloadExpression?: string;
  specialKind?: SpecialTelemetryNodeKind | null;
  terminal?: TerminalNodeConfig;
  markdown?: MarkdownNodeConfig;
  ai?: AiNodeConfig;
  expressionPreview?: TelemetryExpressionPreview;
  receive?: NodeReceiveConfig;
  transform?: NodeTransformConfig;
  display?: NodeDisplayConfig;
  action?: NodeActionConfig;
  result?: NodeResult;
  programVisuals?: TelemetryNodeVisuals;
  executionRuns?: ExecutionRun[];
  lastRun?: ExecutionRun;
  actionDeliveries?: ActionDelivery[];
  lastDelivery?: ActionDelivery;
  createdAt: string;
  updatedAt: string;
  legacy?: {
    kind: "collection" | "metric" | "model" | "view";
    entityId: string;
  };
}

export type NodeDefinition = TelemetryItemDefinition;
export type NodeSnippetBundle = TelemetrySnippetBundle;

export interface BuildTelemetryItemsInput {
  collections: CollectionDefinition[];
  metrics: MetricDefinition[];
  materializedMetrics: Record<string, MaterializedMetric>;
  models: ModelDefinition[];
  materializedDatasets: Record<string, MaterializedDataset>;
  views: ViewDefinition[];
  viewPreviews: Record<string, TelemetryViewPreview>;
}

export interface ComposeTelemetryItemsInput {
  legacyItems: TelemetryItemDefinition[];
  customItems: CustomTelemetryItemDefinition[];
  systemMetrics?: TelemetrySystemMetric[];
}

export type CreateTelemetryItemShape = "capture" | "value" | "list" | "canvas";

export interface CreateTelemetryItemInput {
  slug: string;
  label: string;
  description?: string;
  tags?: string[];
  shape: CreateTelemetryItemShape;
  input?: {
    schema: TelemetrySchemaField;
    identityKeys?: string[];
    timestampField?: string;
    samplePayload?: Record<string, unknown>;
  };
  logic?: {
    format?: "number" | "currency" | "percentage";
    sourceItemId?: string;
    sourceSystemMetric?: string;
    dsl: TelemetryDslProgram;
  };
  display?: {
    sourceItemId: string;
    presentation: "stat" | "table" | "line" | "comparison";
  };
}

export interface CreateCustomTelemetryItemInput {
  label?: string;
  slug?: string;
  description?: string;
  tags?: string[];
  expression?: string;
  inputEnabled?: boolean;
  displayEnabled?: boolean;
  presentation?: CustomTelemetryItemDefinition["presentation"];
  resultType?: TelemetryItemResultType;
  schema?: TelemetrySchemaField;
  samplePayload?: Record<string, unknown>;
  identityKeys?: string[];
  timestampField?: string;
  actionEnabled?: boolean;
  actionType?: NodeActionType;
  actionTarget?: string;
  actionMethod?: CustomTelemetryItemDefinition["actionMethod"];
  actionLive?: boolean;
  actionPayloadExpression?: string;
  specialKind?: SpecialTelemetryNodeKind;
  terminal?: Partial<TerminalNodeConfig>;
  markdown?: Partial<MarkdownNodeConfig>;
  ai?: Partial<AiNodeConfig>;
}

export function createTelemetryItemId(slug: string) {
  return slug;
}

export function slugifyTelemetryItem(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "item";
}

function ensureUniqueSlug(baseSlug: string, takenSlugs: string[]) {
  const taken = new Set(takenSlugs);
  if (!taken.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (taken.has(`${baseSlug}_${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}_${counter}`;
}

export function defaultTelemetryItemSchema(): TelemetrySchemaField {
  return {
    type: "object",
    properties: {
      id: { type: "string", required: true },
      userId: { type: "string", required: true },
      total: { type: "number" },
      updatedAt: { type: "date-time", required: true },
    },
  };
}

export function defaultTelemetryItemPayload(slug = "item_001"): Record<string, unknown> {
  return {
    id: `${slug}_001`,
    userId: "user_001",
    total: 0,
    updatedAt: new Date().toISOString(),
  };
}

function defaultTerminalNodeConfig(): TerminalNodeConfig {
  return {
    shell: "bash",
    command: "claude --resume",
    workingDirectory: "/workspace",
    streamOutput: true,
    stdinExpression: "result",
    liveOutput: [
      "$ claude --resume",
      "connecting to runtime...",
      "ready to receive stdin from upstream nodes",
    ].join("\n"),
  };
}

function defaultMarkdownNodeConfig(): MarkdownNodeConfig {
  return {
    template: "report",
    autoPreview: true,
    document: [
      "# Relatorio do node",
      "",
      "## Contexto",
      "- Recebe dados de outros nodes e APIs",
      "- Consolida em linguagem natural",
      "",
      "## Proximos passos",
      "- Refinar a narrativa",
      "- Enviar para o proximo fluxo",
    ].join("\n"),
  };
}

function defaultAiNodeConfig(): AiNodeConfig {
  return {
    provider: "openai",
    model: "gpt-5.4-mini",
    apiKey: "",
    systemPrompt: "Leia os dados recebidos, gere um resumo acionavel e envie o resultado para o proximo node.",
    autoRun: false,
    temperature: 0.3,
    lastResponse: "Aguardando contexto de entrada para executar o modelo.",
  };
}

function buildSpecialNodeSchema(kind: SpecialTelemetryNodeKind): TelemetrySchemaField {
  if (kind === "terminal") {
    return {
      type: "object",
      properties: {
        command: { type: "string", required: true },
        stdin: { type: "string" },
        cwd: { type: "string" },
        receivedAt: { type: "date-time", required: true },
      },
    };
  }

  if (kind === "markdown") {
    return {
      type: "object",
      properties: {
        title: { type: "string" },
        sections: { type: "array" },
        context: { type: "object" },
        generatedAt: { type: "date-time" },
      },
    };
  }

  return {
    type: "object",
    properties: {
      prompt: { type: "string", required: true },
      context: { type: "object" },
      instructions: { type: "string" },
      requestedAt: { type: "date-time", required: true },
    },
  };
}

function buildSpecialNodePayload(kind: SpecialTelemetryNodeKind, slug: string): Record<string, unknown> {
  if (kind === "terminal") {
    return {
      command: "claude --resume",
      stdin: `runtime payload for ${slug}`,
      cwd: "/workspace",
      receivedAt: new Date().toISOString(),
    };
  }

  if (kind === "markdown") {
    return {
      title: "Relatorio semanal",
      sections: ["receita", "engenharia", "suporte"],
      context: { source: slug },
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    prompt: "Analise os sinais recebidos e gere um resumo acionavel.",
    context: { source: slug },
    instructions: "Retorne markdown pronto para o proximo node.",
    requestedAt: new Date().toISOString(),
  };
}

function resolveSpecialNodeDefaults(kind: SpecialTelemetryNodeKind | undefined, slug: string) {
  if (!kind) return {};

  return {
    inputEnabled: true,
    displayEnabled: true,
    resultType: "text" as const,
    presentation: "text" as const,
    schema: buildSpecialNodeSchema(kind),
    samplePayload: buildSpecialNodePayload(kind, slug),
    terminal: kind === "terminal" ? defaultTerminalNodeConfig() : undefined,
    markdown: kind === "markdown" ? defaultMarkdownNodeConfig() : undefined,
    ai: kind === "ai" ? defaultAiNodeConfig() : undefined,
  };
}

export function createCustomTelemetryItemDraft(args: {
  projectId: string;
  existingSlugs: string[];
  seed?: CreateCustomTelemetryItemInput;
}): CustomTelemetryItemDefinition {
  const now = new Date().toISOString();
  const desiredLabel = args.seed?.label?.trim() || `Node ${args.existingSlugs.length + 1}`;
  const desiredSlug = ensureUniqueSlug(slugifyTelemetryItem(args.seed?.slug?.trim() || desiredLabel), args.existingSlugs);
  const specialKind = args.seed?.specialKind;
  const specialDefaults = resolveSpecialNodeDefaults(specialKind, desiredSlug);

  return {
    id: desiredSlug,
    projectId: args.projectId,
    slug: desiredSlug,
    label: args.seed?.label?.trim() || desiredLabel,
    description: args.seed?.description?.trim() || "No dinamico do workspace.",
    tags: args.seed?.tags ?? [],
    status: "draft",
    inputEnabled: args.seed?.inputEnabled ?? specialDefaults.inputEnabled ?? false,
    schema: args.seed?.schema ?? specialDefaults.schema ?? defaultTelemetryItemSchema(),
    samplePayload: args.seed?.samplePayload ?? specialDefaults.samplePayload ?? defaultTelemetryItemPayload(desiredSlug),
    identityKeys: args.seed?.identityKeys ?? ["id"],
    timestampField: args.seed?.timestampField ?? "updatedAt",
    expression: args.seed?.expression ?? "",
    resultType: args.seed?.resultType ?? specialDefaults.resultType ?? "auto",
    displayEnabled: args.seed?.displayEnabled ?? specialDefaults.displayEnabled ?? false,
    presentation: args.seed?.presentation ?? specialDefaults.presentation ?? "stat",
    actionEnabled: args.seed?.actionEnabled ?? false,
    actionType: args.seed?.actionType ?? "webhook",
    actionTarget: args.seed?.actionTarget?.trim() || "https://api.exemplo.dev/hooks/lynx",
    actionMethod: args.seed?.actionMethod ?? "POST",
    actionLive: args.seed?.actionLive ?? false,
    actionPayloadExpression: args.seed?.actionPayloadExpression ?? "result",
    specialKind: specialKind ?? null,
    terminal: specialKind === "terminal"
      ? { ...defaultTerminalNodeConfig(), ...args.seed?.terminal }
      : undefined,
    markdown: specialKind === "markdown"
      ? { ...defaultMarkdownNodeConfig(), ...args.seed?.markdown }
      : undefined,
    ai: specialKind === "ai"
      ? { ...defaultAiNodeConfig(), ...args.seed?.ai }
      : undefined,
    executionRuns: [],
    actionDeliveries: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getTelemetryItemModeLabel(mode: TelemetryItemMode) {
  switch (mode) {
    case "capture":
      return "Entrada";
    case "value":
      return "Valor";
    case "list":
      return "Lista";
    case "canvas":
      return "Canvas";
    case "custom":
      return "No";
  }
}

export function getTelemetryItemSourceIds(item: TelemetryItemDefinition) {
  return item.sources.filter((source) => source.kind === "item").map((source) => source.ref);
}

export function resolveTelemetryItem(items: TelemetryItemDefinition[], itemId: string) {
  return items.find((item) => item.id === itemId || item.slug === itemId);
}

function collectSchemaPaths(schema?: TelemetrySchemaField, prefix = ""): string[] {
  if (!schema || schema.type !== "object") return [];

  return Object.entries(schema.properties ?? {}).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value.type === "object") {
      return [path, ...collectSchemaPaths(value, path)];
    }
    return [path];
  });
}

function formatPreviewValue(raw: unknown, resultType: TelemetryItemResultType): TelemetryExpressionPreview {
  if (raw === undefined || raw === null || raw === "") {
    return { kind: "empty", raw, text: "Sem resultado" };
  }

  if (Array.isArray(raw)) {
    return {
      kind: "dataset",
      raw,
      text: `${raw.length.toLocaleString("pt-BR")} linhas`,
    };
  }

  if (typeof raw === "number") {
    const text = resultType === "currency"
      ? formatMoney(raw)
      : resultType === "percentage"
        ? formatPercent(raw)
        : formatNumber(raw);

    return {
      kind: "number",
      raw,
      text,
      numericValue: raw,
    };
  }

  if (typeof raw === "boolean") {
    return {
      kind: "text",
      raw,
      text: raw ? "Sim" : "Nao",
    };
  }

  if (typeof raw === "string") {
    return {
      kind: "text",
      raw,
      text: raw,
    };
  }

  return {
    kind: "dataset",
    raw,
    text: JSON.stringify(raw, null, 2),
  };
}

function createExpressionErrorPreview(error: unknown): TelemetryExpressionPreview {
  return {
    kind: "error",
    raw: null,
    text: "Expressao invalida",
    error: error instanceof Error ? error.message : "Nao foi possivel avaliar a expressao.",
  };
}

const NODE_ICON_SCOPE = {
  database: "database",
  sparkles: "sparkles",
  table: "table",
  chart: "chart",
  layout: "layout",
  workflow: "workflow",
  arrowUp: "arrowUp",
  arrowDown: "arrowDown",
  arrowRight: "arrowRight",
  receipt: "receipt",
  alert: "alert",
  blocks: "blocks",
  terminal: "terminal",
  markdown: "markdown",
  brain: "brain",
} as const satisfies Record<string, TelemetryNodeIconKey>;

type TelemetryProgramEvaluation = {
  preview: TelemetryExpressionPreview;
  visuals?: TelemetryNodeVisuals;
};

function isScriptProgram(program: string) {
  return /[;{}]|\b(if|else|const|let|var|titleNode|subTitleNode|badgeNode|iconNode)\b/.test(program);
}

function pickProgramField(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, value);
}

function readProgramNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildProgramHelpers() {
  const sum = (value: unknown, field?: string) => {
    if (!Array.isArray(value)) return typeof value === "number" ? value : 0;
    return value.reduce((total, item) => total + readProgramNumber(field ? pickProgramField(item, field) : item), 0);
  };

  return {
    count(value: unknown) {
      if (Array.isArray(value)) return value.length;
      if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length;
      return value === null || value === undefined || value === "" ? 0 : 1;
    },
    sum,
    avg(value: unknown, field?: string) {
      if (!Array.isArray(value) || !value.length) return 0;
      return sum(value, field) / value.length;
    },
    pct(current: number, total: number) {
      if (!Number.isFinite(current) || !Number.isFinite(total) || total === 0) return 0;
      return (current / total) * 100;
    },
    round(value: number, digits = 0) {
      const factor = Math.pow(10, digits);
      return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
    },
    first<T>(value: T[]) {
      return Array.isArray(value) ? value[0] : undefined;
    },
    last<T>(value: T[]) {
      return Array.isArray(value) ? value[value.length - 1] : undefined;
    },
    pick(value: unknown, path: string) {
      return pickProgramField(value, path);
    },
    icon: NODE_ICON_SCOPE,
  };
}

function coerceProgramText(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function coerceProgramIcon(value: unknown): TelemetryNodeIconKey | null {
  if (typeof value !== "string") return null;
  return value in NODE_ICON_SCOPE ? (value as TelemetryNodeIconKey) : null;
}

function evaluateNodeProgram(
  program: string,
  scope: Record<string, unknown>,
  resultType: TelemetryItemResultType,
): TelemetryProgramEvaluation {
  const normalizedProgram = program.trim();
  if (!normalizedProgram) {
    return {
      preview: { kind: "empty", raw: null, text: "Sem expressao" },
    };
  }

  const bannedPattern = /(?:^|\W)(?:window|document|globalThis|Function|eval|import|export|class|while|for|this|constructor|new|try|catch|finally|throw)(?:\W|$)/;
  if (bannedPattern.test(normalizedProgram)) {
    return {
      preview: {
        kind: "error",
        raw: null,
        text: "Programa invalido",
        error: "O node aceita JavaScript seguro para programacao e apresentacao dinamica.",
      },
    };
  }

  if (!isScriptProgram(normalizedProgram)) {
    return {
      preview: evaluateExpression(normalizedProgram, scope, resultType),
    };
  }

  try {
    const fn = new Function(
      ...Object.keys(scope),
      `"use strict";
      return (() => {
        let result;
        let output;
        let titleNode;
        let subTitleNode;
        let badgeNode;
        let iconNode;
        const __scriptResult = (() => {
          ${normalizedProgram}
        })();
        const __resolvedResult = result !== undefined ? result : output !== undefined ? output : __scriptResult;
        return {
          result: __resolvedResult,
          titleNode,
          subTitleNode,
          badgeNode,
          iconNode,
        };
      })();`,
    ) as (...args: unknown[]) => {
      result: unknown;
      titleNode?: unknown;
      subTitleNode?: unknown;
      badgeNode?: unknown;
      iconNode?: unknown;
    };

    const evaluated = fn(...Object.values(scope));
    return {
      preview: formatPreviewValue(evaluated.result, resultType),
      visuals: {
        titleNode: coerceProgramText(evaluated.titleNode),
        subTitleNode: coerceProgramText(evaluated.subTitleNode),
        badgeNode: coerceProgramText(evaluated.badgeNode),
        iconNode: coerceProgramIcon(evaluated.iconNode),
      },
    };
  } catch (error) {
    return {
      preview: createExpressionErrorPreview(error),
    };
  }
}

function evaluateExpression(expression: string, scope: Record<string, unknown>, resultType: TelemetryItemResultType) {
  if (!expression.trim()) {
    return { kind: "empty", raw: null, text: "Sem expressao" } satisfies TelemetryExpressionPreview;
  }

  try {
    const fn = new Function(...Object.keys(scope), `"use strict"; return (${expression});`) as (...args: unknown[]) => unknown;
    const result = fn(...Object.values(scope));
    return formatPreviewValue(result, resultType);
  } catch (error) {
    return createExpressionErrorPreview(error);
  }
}

function extractExpressionTokens(expression: string) {
  return expression.match(/[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/g) ?? [];
}

function buildGeneratedSnippets(projectId: string, slug: string, payload: Record<string, unknown>): TelemetrySnippetBundle {
  const payloadJson = JSON.stringify(payload, null, 2);
  return {
    bun: `import { createLynxClient } from "@lynx/sdk";\n\nconst lynx = createLynxClient({\n  apiKey: process.env.LYNX_API_KEY!,\n  projectId: "${projectId}",\n  host: process.env.LYNX_HOST!,\n});\n\nawait lynx.send("${slug}", ${payloadJson});`,
    browser: `import { createLynxClient } from "@lynx/sdk";\n\nconst lynx = createLynxClient({\n  apiKey: window.__LYNX_API_KEY__,\n  projectId: "${projectId}",\n  host: window.__LYNX_HOST__,\n});\n\nlynx.send("${slug}", ${payloadJson});`,
    react: `const payload = ${payloadJson};\n\nawait lynx.send("${slug}", payload);`,
    curl: `curl -X POST https://api.lynx.local/projects/${projectId}/collections/${slug}/ingest \\\n  -H "Authorization: Bearer <api-key>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"payloads":[${JSON.stringify(payload)}]}'`,
    send: `await lynx.send("${slug}", ${payloadJson});`,
    generatedClient: `await lynx.nodes["${slug}"].send(${payloadJson});`,
  };
}

function getLegacyScopeValue(item: TelemetryItemDefinition): unknown {
  if (item.mode === "capture") {
    return item.samplePayload ?? {};
  }

  if (item.mode === "value") {
    return item.materializedMetric?.value ?? 0;
  }

  if (item.mode === "list") {
    return item.materializedDataset?.rows ?? [];
  }

  if (item.mode === "canvas") {
    return item.canvasPreview?.headline ?? item.label;
  }

  return item.expressionPreview?.raw ?? 0;
}

function getSourceLabel(ref: string, legacyMap: Map<string, TelemetryItemDefinition>, customMap: Map<string, CustomTelemetryItemDefinition>, systemMap: Map<string, TelemetrySystemMetric>) {
  if (legacyMap.has(ref)) return legacyMap.get(ref)?.label ?? ref;
  if (customMap.has(ref)) return customMap.get(ref)?.label ?? ref;
  if (systemMap.has(ref)) return systemMap.get(ref)?.label ?? ref;
  return ref;
}

function resolveSourcesFromExpression(
  expression: string,
  legacyMap: Map<string, TelemetryItemDefinition>,
  customMap: Map<string, CustomTelemetryItemDefinition>,
  systemMap: Map<string, TelemetrySystemMetric>,
): TelemetryItemSource[] {
  const seen = new Set<string>();
  const sources: TelemetryItemSource[] = [];

  for (const token of extractExpressionTokens(expression)) {
    const root = token.split(".")[0];
    if (seen.has(root)) continue;

    if (legacyMap.has(root) || customMap.has(root)) {
      seen.add(root);
      sources.push({ kind: "item", ref: root, label: getSourceLabel(root, legacyMap, customMap, systemMap) });
      continue;
    }

    if (systemMap.has(root)) {
      seen.add(root);
      sources.push({ kind: "system", ref: root, label: systemMap.get(root)?.label ?? root });
    }
  }

  return sources;
}

function buildExpressionScope(args: {
  currentItemId: string;
  legacyItems: TelemetryItemDefinition[];
  customItems: CustomTelemetryItemDefinition[];
  systemMetrics: TelemetrySystemMetric[];
  evaluateCustom: (itemId: string, stack: Set<string>) => TelemetryItemDefinition | null;
  stack: Set<string>;
}) {
  const scope: Record<string, unknown> = {
    ...buildProgramHelpers(),
  };

  args.legacyItems.forEach((item) => {
    scope[item.slug] = getLegacyScopeValue(item);
  });

  args.customItems.forEach((item) => {
    if (item.id === args.currentItemId) return;
    const evaluated = args.evaluateCustom(item.id, new Set(args.stack));
    scope[item.slug] = evaluated?.expressionPreview?.raw ?? (item.inputEnabled ? item.samplePayload ?? {} : 0);
  });

  args.systemMetrics.forEach((metric) => {
    if (!(metric.key in scope)) {
      scope[metric.key] = metric.value;
    }
  });

  return scope;
}

function getOutputShape(item: CustomTelemetryItemDefinition, preview: TelemetryExpressionPreview): TelemetryItemDefinition["outputShape"] {
  if (item.specialKind) return "value";
  if (item.resultType === "dataset" || preview.kind === "dataset") return "dataset";
  if (!item.expression.trim() && item.inputEnabled) return "records";
  return "value";
}

function getCustomStatus(item: CustomTelemetryItemDefinition, preview: TelemetryExpressionPreview): TelemetryItemStatus {
  if (!item.inputEnabled && !item.expression.trim() && !item.displayEnabled) return "draft";
  if (preview.kind === "error") return "attention";
  if (item.inputEnabled || item.expression.trim() || item.displayEnabled) return "healthy";
  return item.status;
}

function buildSpecialNodePreview(item: CustomTelemetryItemDefinition): TelemetryExpressionPreview | null {
  if (item.specialKind === "terminal") {
    const transcript = item.terminal?.liveOutput?.trim() || item.terminal?.command || "Terminal pronto.";
    return {
      kind: "text",
      raw: transcript,
      text: transcript.split("\n").slice(-1)[0] ?? transcript,
    };
  }

  if (item.specialKind === "markdown") {
    const document = item.markdown?.document?.trim() || "Documento markdown pronto para receber contexto.";
    const headline =
      document.split("\n").find((line) => line.trim().length > 0)?.replace(/^#+\s*/, "") ??
      "Markdown pronto";
    return {
      kind: "text",
      raw: document,
      text: headline,
    };
  }

  if (item.specialKind === "ai") {
    const response = item.ai?.lastResponse?.trim() || item.ai?.systemPrompt?.trim() || "Modelo pronto.";
    return {
      kind: "text",
      raw: response,
      text: response.length > 96 ? `${response.slice(0, 93)}...` : response,
    };
  }

  return null;
}

function buildCustomCanvasPreview(
  item: CustomTelemetryItemDefinition,
  preview: TelemetryExpressionPreview,
  sources: TelemetryItemSource[],
  visuals?: TelemetryNodeVisuals,
): TelemetryViewPreview | undefined {
  if (!item.displayEnabled) return undefined;

  return {
    headline: visuals?.titleNode ?? preview.text,
    summary:
      visuals?.subTitleNode ??
      item.description?.trim() ??
      (item.expression.trim() ? item.expression : "Item pronto para ser exibido no canvas."),
    metrics: [
      { label: "Tipo", value: item.resultType },
      { label: "Refs", value: sources.length.toString() },
      { label: "Badge", value: visuals?.badgeNode ?? item.presentation },
    ],
  };
}

export function buildExpressionSuggestions(input: {
  items: TelemetryItemDefinition[];
  systemMetrics?: TelemetrySystemMetric[];
  currentItemId?: string | null;
}): TelemetryExpressionSuggestion[] {
  const suggestions: TelemetryExpressionSuggestion[] = [];
  const systemMetrics = input.systemMetrics ?? [];

  input.items.forEach((item) => {
    if (item.id === input.currentItemId) return;

    suggestions.push({
      value: item.slug,
      label: item.label,
      description: item.description?.trim() || "Item disponivel no workspace.",
      category: "item",
    });

    collectSchemaPaths(item.schema).forEach((fieldPath) => {
      suggestions.push({
        value: `${item.slug}.${fieldPath}`,
        label: `${item.label}.${fieldPath}`,
        description: "Campo disponivel para formula ou exibicao.",
        category: "field",
      });
    });
  });

  systemMetrics.forEach((metric) => {
    suggestions.push({
      value: metric.key,
      label: metric.label,
      description: `Metrica de sistema: ${metric.label}`,
      category: "system",
    });
  });

  [
    {
      value: "result = ",
      label: "Resultado do node",
      description: "Define o output final do node para card, fluxo e envio.",
    },
    {
      value: "titleNode = ",
      label: "Titulo dinamico",
      description: "Controla o titulo principal do node no canvas.",
    },
    {
      value: "subTitleNode = ",
      label: "Subtitulo dinamico",
      description: "Controla a linha secundaria do node no canvas.",
    },
    {
      value: "badgeNode = ",
      label: "Badge dinamica",
      description: "Controla o badge exibido no node e no chat.",
    },
    {
      value: "iconNode = icon.arrowUp",
      label: "Icone dinamico",
      description: "Troca o icone do node usando o namespace icon.",
    },
    {
      value: "icon.arrowUp",
      label: "Icone de alta",
      description: "Arrow up para leitura positiva.",
    },
    {
      value: "icon.arrowDown",
      label: "Icone de queda",
      description: "Arrow down para leitura negativa.",
    },
    {
      value: "icon.sparkles",
      label: "Icone destaque",
      description: "Sparkles para leitura inteligente ou destaque.",
    },
    {
      value: "icon.terminal",
      label: "Icone terminal",
      description: "Terminal para nodes de execucao e shell.",
    },
    {
      value: "icon.markdown",
      label: "Icone markdown",
      description: "Documento para relatorios e notas em markdown.",
    },
    {
      value: "icon.brain",
      label: "Icone IA",
      description: "Cerebro para nodes de modelo e automacao.",
    },
    {
      value: "sum(",
      label: "Soma",
      description: "Soma arrays ou valores numericos.",
    },
    {
      value: "avg(",
      label: "Media",
      description: "Calcula media de arrays ou campos.",
    },
    {
      value: "pct(",
      label: "Percentual",
      description: "Calcula percentual entre dois valores.",
    },
    {
      value: "round(",
      label: "Arredondar",
      description: "Arredonda valores numericos.",
    },
    {
      value: "pick(",
      label: "Pick field",
      description: "Acessa campos dinamicos por caminho.",
    },
  ].forEach((entry) => {
    suggestions.push({
      ...entry,
      category: "system",
    });
  });

  return suggestions.sort((left, right) => left.value.localeCompare(right.value, "pt-BR"));
}

export function buildTelemetryItems(input: BuildTelemetryItemsInput): TelemetryItemDefinition[] {
  const { collections, metrics, materializedMetrics, models, materializedDatasets, views, viewPreviews } = input;

  const collectionItems = collections.map<TelemetryItemDefinition>((collection) => ({
    id: createTelemetryItemId(collection.slug),
    projectId: collection.projectId,
    slug: collection.slug,
    label: collection.label,
    description: collection.description,
    mode: "capture",
    status: collection.status === "draft" ? "draft" : collection.recordCount > 0 ? "healthy" : "attention",
    tags: collection.tags,
    acceptsInput: true,
    hasLogic: false,
    hasDisplay: false,
    outputShape: "records",
    schema: collection.schema,
    samplePayload: collection.samplePayload,
    identityKeys: collection.identityKeys,
    timestampField: collection.timestampField,
    recordCount: collection.recordCount,
    lastIngestedAt: collection.lastIngestedAt,
    sources: [],
    snippets: collection.samplePayload ? buildGeneratedSnippets(collection.projectId, collection.slug, collection.samplePayload) : undefined,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    legacy: { kind: "collection", entityId: collection.id },
  }));

  const collectionLookup = new Map(collections.map((collection) => [collection.id, collection.slug]));
  const metricLookup = new Map(metrics.map((metric) => [metric.id, metric.slug]));
  const modelLookup = new Map(models.map((model) => [model.id, model.slug]));

  const metricItems = metrics.map<TelemetryItemDefinition>((metric) => {
    const output = materializedMetrics[metric.slug];
    return {
      id: createTelemetryItemId(metric.slug),
      projectId: metric.projectId,
      slug: metric.slug,
      label: metric.label,
      description: metric.description,
      mode: "value",
      status: output ? "healthy" : "draft",
      tags: metric.tags,
      acceptsInput: false,
      hasLogic: true,
      hasDisplay: false,
      outputShape: "value",
      identityKeys: [],
      recordCount: 0,
      format: metric.format,
      dsl: metric.dsl,
      sources: metric.sources.map((source) => {
        if (source.kind === "system-metric") {
          return { kind: "system" as const, ref: source.ref, label: source.label ?? source.ref };
        }

        const ref = source.kind === "collection"
          ? collectionLookup.get(source.ref) ?? source.ref
          : metricLookup.get(source.ref) ?? source.ref;

        return { kind: "item" as const, ref, label: source.label ?? ref };
      }),
      materializedMetric: output,
      createdAt: metric.createdAt,
      updatedAt: metric.updatedAt,
      legacy: { kind: "metric", entityId: metric.id },
    };
  });

  const modelItems = models.map<TelemetryItemDefinition>((model) => {
    const output = materializedDatasets[model.slug];
    return {
      id: createTelemetryItemId(model.slug),
      projectId: model.projectId,
      slug: model.slug,
      label: model.label,
      description: model.description,
      mode: "list",
      status: output ? "healthy" : "draft",
      tags: model.tags,
      acceptsInput: false,
      hasLogic: true,
      hasDisplay: false,
      outputShape: "dataset",
      identityKeys: [],
      recordCount: 0,
      dsl: model.dsl,
      sources: model.sources.map((source) => {
        if (source.kind === "system-metric") {
          return { kind: "system" as const, ref: source.ref, label: source.label ?? source.ref };
        }

        const ref = source.kind === "collection"
          ? collectionLookup.get(source.ref) ?? source.ref
          : metricLookup.get(source.ref) ?? source.ref;

        return { kind: "item" as const, ref, label: source.label ?? ref };
      }),
      materializedDataset: output,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      legacy: { kind: "model", entityId: model.id },
    };
  });

  const viewItems = views.map<TelemetryItemDefinition>((view) => {
    const preview = viewPreviews[view.slug];
    const sourceRef = view.sourceKind === "collection"
      ? collectionLookup.get(view.sourceId) ?? view.sourceId
      : view.sourceKind === "metric"
        ? metricLookup.get(view.sourceId) ?? view.sourceId
        : modelLookup.get(view.sourceId) ?? view.sourceId;

    return {
      id: createTelemetryItemId(view.slug),
      projectId: view.projectId,
      slug: view.slug,
      label: view.label,
      description: view.description,
      mode: "canvas",
      status: preview ? "healthy" : "attention",
      tags: view.tags,
      acceptsInput: false,
      hasLogic: false,
      hasDisplay: true,
      outputShape: view.presentation === "table" ? "dataset" : "value",
      identityKeys: [],
      recordCount: 0,
      presentation: view.presentation,
      sources: [{ kind: "item", ref: sourceRef, label: sourceRef }],
      canvasPreview: preview,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
      legacy: { kind: "view", entityId: view.id },
    };
  });

  return [...collectionItems, ...metricItems, ...modelItems, ...viewItems].sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR"),
  );
}

export function composeTelemetryItems(input: ComposeTelemetryItemsInput): TelemetryItemDefinition[] {
  const { legacyItems, customItems, systemMetrics = [] } = input;
  if (!customItems.length) {
    return [...legacyItems].sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  }

  const legacyMap = new Map(legacyItems.map((item) => [item.slug, item]));
  const customMap = new Map(customItems.map((item) => [item.slug, item]));
  const systemMap = new Map(systemMetrics.map((metric) => [metric.key, metric]));
  const cache = new Map<string, TelemetryItemDefinition>();

  const evaluateCustomItem = (itemId: string, stack = new Set<string>()): TelemetryItemDefinition | null => {
    const rawItem = customMap.get(itemId);
    if (!rawItem) return null;
    if (cache.has(rawItem.id)) return cache.get(rawItem.id) ?? null;

    if (stack.has(rawItem.id)) {
      const cyclicItem: TelemetryItemDefinition = {
        id: rawItem.id,
        projectId: rawItem.projectId,
        slug: rawItem.slug,
        label: rawItem.label,
        description: rawItem.description,
        mode: "custom",
        status: "attention",
        tags: rawItem.tags,
        acceptsInput: rawItem.inputEnabled,
        hasLogic: Boolean(rawItem.expression.trim()) || Boolean(rawItem.specialKind),
        hasDisplay: rawItem.displayEnabled,
        outputShape: "value",
        schema: rawItem.schema,
        samplePayload: rawItem.samplePayload,
        identityKeys: rawItem.identityKeys,
        timestampField: rawItem.timestampField,
        recordCount: 0,
        format: rawItem.resultType === "currency" || rawItem.resultType === "percentage" ? rawItem.resultType : "number",
        presentation: rawItem.presentation,
        sources: [],
        expression: rawItem.expression,
        resultType: rawItem.resultType,
        inputEnabled: rawItem.inputEnabled,
        displayEnabled: rawItem.displayEnabled,
        actionEnabled: rawItem.actionEnabled,
        actionType: rawItem.actionType,
        actionTarget: rawItem.actionTarget,
        actionMethod: rawItem.actionMethod,
        actionLive: rawItem.actionLive,
        actionPayloadExpression: rawItem.actionPayloadExpression,
        specialKind: rawItem.specialKind,
        terminal: rawItem.terminal,
        markdown: rawItem.markdown,
        ai: rawItem.ai,
        expressionPreview: createExpressionErrorPreview(new Error("Referencia circular entre itens.")),
        receive: {
          enabled: rawItem.inputEnabled,
          schema: rawItem.schema,
          samplePayload: rawItem.samplePayload,
          identityKeys: rawItem.identityKeys,
          timestampField: rawItem.timestampField,
          snippets: rawItem.inputEnabled
            ? buildGeneratedSnippets(
                rawItem.projectId,
                rawItem.slug,
                rawItem.samplePayload ?? defaultTelemetryItemPayload(rawItem.slug),
              )
            : undefined,
        },
        transform: {
          enabled: Boolean(rawItem.expression.trim()),
          expression: rawItem.expression,
          resultType: rawItem.resultType,
          preview: createExpressionErrorPreview(new Error("Referencia circular entre itens.")),
        },
        action: {
          enabled: rawItem.actionEnabled,
          type: rawItem.actionType,
          target: rawItem.actionTarget,
          method: rawItem.actionMethod,
          live: rawItem.actionLive,
          payloadExpression: rawItem.actionPayloadExpression,
        },
        result: {
          kind: "error",
          raw: null,
          text: "Expressao invalida",
          updatedAt: rawItem.updatedAt,
          status: "error",
          latencyMs: 0,
          origin: [],
          error: "Referencia circular entre itens.",
        },
        executionRuns: rawItem.executionRuns ?? [],
        lastRun: rawItem.executionRuns?.at(-1),
        actionDeliveries: rawItem.actionDeliveries ?? [],
        lastDelivery: rawItem.actionDeliveries?.at(-1),
        snippets: rawItem.inputEnabled ? buildGeneratedSnippets(rawItem.projectId, rawItem.slug, rawItem.samplePayload ?? defaultTelemetryItemPayload(rawItem.slug)) : undefined,
        createdAt: rawItem.createdAt,
        updatedAt: rawItem.updatedAt,
      };
      cache.set(rawItem.id, cyclicItem);
      return cyclicItem;
    }

    stack.add(rawItem.id);
    const scope = buildExpressionScope({
      currentItemId: rawItem.id,
      legacyItems,
      customItems,
      systemMetrics,
      evaluateCustom: evaluateCustomItem,
      stack,
    });
    const programEvaluation = rawItem.expression.trim()
      ? evaluateNodeProgram(rawItem.expression, scope, rawItem.resultType)
      : rawItem.specialKind
        ? {
            preview: buildSpecialNodePreview(rawItem) ?? { kind: "empty", raw: null, text: "Item vazio" } satisfies TelemetryExpressionPreview,
          }
      : rawItem.inputEnabled
        ? {
            preview: formatPreviewValue(rawItem.samplePayload ?? defaultTelemetryItemPayload(rawItem.slug), rawItem.resultType),
          }
        : {
            preview: { kind: "empty", raw: null, text: "Item vazio" } satisfies TelemetryExpressionPreview,
          };
    const preview = programEvaluation.preview;
    const programVisuals = programEvaluation.visuals;

    const sources = resolveSourcesFromExpression(rawItem.expression, legacyMap, customMap, systemMap);
    const outputShape = getOutputShape(rawItem, preview);
    const formattedMetric = preview.kind === "number"
      ? {
          definitionId: rawItem.id,
          label: rawItem.label,
          value: preview.numericValue ?? 0,
          formattedValue: preview.text,
          previousValue: null,
          delta: null,
          deltaLabel: null,
          trend: "neutral" as const,
          series: [],
          updatedAt: rawItem.updatedAt,
        }
      : undefined;

    const dataset = preview.kind === "dataset" && Array.isArray(preview.raw)
      ? {
          definitionId: rawItem.id,
          label: rawItem.label,
          rows: (preview.raw as Array<Record<string, unknown>>).slice(0, 20),
          columns: Object.keys((preview.raw as Array<Record<string, unknown>>)[0] ?? {}).map((key) => ({ key, label: key })),
          summary: [
            { label: "Linhas", value: (preview.raw as Array<unknown>).length.toLocaleString("pt-BR") },
            { label: "Origem", value: sources.map((source) => source.label).join(", ") || "manual" },
          ],
          updatedAt: rawItem.updatedAt,
        }
      : undefined;
    const lastRun = rawItem.executionRuns?.at(-1);
    const lastDelivery = rawItem.actionDeliveries?.at(-1);
    const snippets = rawItem.inputEnabled
      ? buildGeneratedSnippets(
          rawItem.projectId,
          rawItem.slug,
          rawItem.samplePayload ?? defaultTelemetryItemPayload(rawItem.slug),
        )
      : undefined;
    const resultStatus: NodeRunStatus = preview.kind === "error"
      ? "error"
      : rawItem.expression.trim() || rawItem.inputEnabled
        ? "success"
        : "idle";

    const item: TelemetryItemDefinition = {
      id: rawItem.id,
      projectId: rawItem.projectId,
      slug: rawItem.slug,
      label: rawItem.label,
      description: rawItem.description,
      mode: "custom",
      status: getCustomStatus(rawItem, preview),
      tags: rawItem.tags,
      acceptsInput: rawItem.inputEnabled,
      hasLogic: Boolean(rawItem.expression.trim()) || Boolean(rawItem.specialKind),
      hasDisplay: rawItem.displayEnabled,
      outputShape,
      schema: rawItem.schema,
      samplePayload: rawItem.samplePayload,
      identityKeys: rawItem.identityKeys,
      timestampField: rawItem.timestampField,
      recordCount: 0,
      format: rawItem.resultType === "currency" || rawItem.resultType === "percentage" ? rawItem.resultType : undefined,
      presentation: rawItem.presentation,
      sources,
      materializedMetric: formattedMetric,
      materializedDataset: dataset,
      canvasPreview: buildCustomCanvasPreview(rawItem, preview, sources, programVisuals),
      snippets,
      expression: rawItem.expression,
      resultType: rawItem.resultType,
      inputEnabled: rawItem.inputEnabled,
      displayEnabled: rawItem.displayEnabled,
      actionEnabled: rawItem.actionEnabled,
      actionType: rawItem.actionType,
      actionTarget: rawItem.actionTarget,
      actionMethod: rawItem.actionMethod,
      actionLive: rawItem.actionLive,
      actionPayloadExpression: rawItem.actionPayloadExpression,
      specialKind: rawItem.specialKind,
      terminal: rawItem.terminal,
      markdown: rawItem.markdown,
      ai: rawItem.ai,
      expressionPreview: preview,
      receive: {
        enabled: rawItem.inputEnabled,
        schema: rawItem.schema,
        samplePayload: rawItem.samplePayload,
        identityKeys: rawItem.identityKeys,
        timestampField: rawItem.timestampField,
        snippets,
      },
      transform: {
        enabled: Boolean(rawItem.expression.trim()),
        expression: rawItem.expression,
        resultType: rawItem.resultType,
        preview,
      },
      action: {
        enabled: rawItem.actionEnabled,
        type: rawItem.actionType,
        target: rawItem.actionTarget,
        method: rawItem.actionMethod,
        live: rawItem.actionLive,
        payloadExpression: rawItem.actionPayloadExpression,
      },
      result: {
        kind: preview.kind,
        raw: preview.raw,
        text: preview.text,
        updatedAt: rawItem.updatedAt,
        status: resultStatus,
        latencyMs: lastRun?.latencyMs ?? 0,
        origin: sources.map((source) => source.label),
        error: preview.error,
      },
      programVisuals,
      executionRuns: rawItem.executionRuns ?? [],
      lastRun,
      actionDeliveries: rawItem.actionDeliveries ?? [],
      lastDelivery,
      createdAt: rawItem.createdAt,
      updatedAt: rawItem.updatedAt,
    };

    cache.set(rawItem.id, item);
    stack.delete(rawItem.id);
    return item;
  };

  const customDefinitions = customItems
    .map((item) => evaluateCustomItem(item.id))
    .filter((item): item is TelemetryItemDefinition => Boolean(item));

  const shadowedKeys = new Set(
    customDefinitions.flatMap((item) => [item.id, item.slug]),
  );
  const visibleLegacyItems = legacyItems.filter(
    (item) => !shadowedKeys.has(item.id) && !shadowedKeys.has(item.slug),
  );

  return [...visibleLegacyItems, ...customDefinitions].sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR"),
  );
}



