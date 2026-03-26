import type {
  ActionDelivery,
  CustomTelemetryItemDefinition,
  ExecutionRun,
  NodeActionConfig,
  NodeDisplayConfig,
  NodeReceiveConfig,
  NodeResult,
  NodeTransformConfig,
  TelemetryExpressionPreview,
  TelemetryItemDefinition,
  TelemetrySystemMetric,
} from "@/lib/telemetry/items";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

function readNodeValue(item: TelemetryItemDefinition): unknown {
  if (item.result?.raw !== undefined) return item.result.raw;
  if (item.expressionPreview?.raw !== undefined) return item.expressionPreview.raw;
  if (item.mode === "capture") return item.samplePayload ?? {};
  if (item.mode === "value") return item.materializedMetric?.value ?? 0;
  if (item.mode === "list") return item.materializedDataset?.rows ?? [];
  if (item.mode === "canvas") return item.canvasPreview?.headline ?? item.label;
  return null;
}

function formatPreview(raw: unknown): TelemetryExpressionPreview {
  if (raw === undefined || raw === null || raw === "") {
    return { kind: "empty", raw, text: "Sem resultado" };
  }

  if (Array.isArray(raw)) {
    return { kind: "dataset", raw, text: `${raw.length.toLocaleString("pt-BR")} linhas` };
  }

  if (typeof raw === "number") {
    return { kind: "number", raw, text: formatNumber(raw), numericValue: raw };
  }

  if (typeof raw === "string") {
    return { kind: "text", raw, text: raw };
  }

  if (typeof raw === "boolean") {
    return { kind: "text", raw, text: raw ? "Sim" : "Nao" };
  }

  return { kind: "dataset", raw, text: JSON.stringify(raw, null, 2) };
}

function evaluateExpression(expression: string, scope: Record<string, unknown>): TelemetryExpressionPreview {
  if (!expression.trim()) {
    return { kind: "empty", raw: null, text: "Sem expressao" };
  }

  const bannedPattern = /(?:^|\W)(?:window|document|globalThis|Function|eval|import|export|class|new|while|for|return|this|constructor)(?:\W|$)|=>|;/;
  if (bannedPattern.test(expression)) {
    return {
      kind: "error",
      raw: null,
      text: "Expressao invalida",
      error: "A linguagem do workspace aceita apenas expressoes declarativas seguras.",
    };
  }

  try {
    const fn = new Function(...Object.keys(scope), `"use strict"; return (${expression});`) as (...args: unknown[]) => unknown;
    return formatPreview(fn(...Object.values(scope)));
  } catch (error) {
    return {
      kind: "error",
      raw: null,
      text: "Expressao invalida",
      error: error instanceof Error ? error.message : "Nao foi possivel avaliar a expressao.",
    };
  }
}

function buildScope(items: TelemetryItemDefinition[], systemMetrics: TelemetrySystemMetric[]) {
  const scope: Record<string, unknown> = {
    count(value: unknown) {
      if (Array.isArray(value)) return value.length;
      if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length;
      return value === null || value === undefined || value === "" ? 0 : 1;
    },
    sum(value: unknown, field?: string) {
      if (!Array.isArray(value)) return typeof value === "number" ? value : 0;
      return value.reduce((total, item) => total + readNumber(field ? pickField(item, field) : item), 0);
    },
    avg(value: unknown, field?: string) {
      if (!Array.isArray(value) || !value.length) return 0;
      return (scope.sum as (input: unknown, fieldName?: string) => number)(value, field) / value.length;
    },
    pct(current: number, total: number) {
      if (!Number.isFinite(current) || !Number.isFinite(total) || total === 0) return 0;
      return (current / total) * 100;
    },
    round(value: number, digits = 0) {
      const factor = Math.pow(10, digits);
      return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
    },
    result: null,
    output: null,
  } as Record<string, unknown> & {
    sum: (value: unknown, field?: string) => number;
  };

  items.forEach((item) => {
    scope[item.slug] = readNodeValue(item);
  });

  systemMetrics.forEach((metric) => {
    scope[metric.key] = metric.value;
  });

  return scope;
}

function pickField(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, value);
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildReceiveConfig(item: TelemetryItemDefinition): NodeReceiveConfig {
  return {
    enabled: item.inputEnabled ?? item.mode === "capture",
    schema: item.schema,
    samplePayload: item.samplePayload,
    identityKeys: item.identityKeys,
    timestampField: item.timestampField,
    snippets: item.snippets,
  };
}

function buildTransformConfig(item: TelemetryItemDefinition): NodeTransformConfig {
  return {
    enabled: Boolean(item.expression?.trim()) || item.mode === "value" || item.mode === "list",
    expression: item.expression ?? "",
    resultType: item.resultType ?? item.format ?? "auto",
    preview: item.expressionPreview,
  };
}

function buildDisplayConfig(item: TelemetryItemDefinition): NodeDisplayConfig {
  return {
    enabled: item.displayEnabled ?? item.mode === "canvas",
    presentation: item.presentation ?? "stat",
  };
}

function buildActionConfig(rawItem?: CustomTelemetryItemDefinition): NodeActionConfig {
  return {
    enabled: rawItem?.actionEnabled ?? false,
    type: rawItem?.actionType ?? "webhook",
    target: rawItem?.actionTarget ?? null,
    method: rawItem?.actionMethod ?? "POST",
    live: rawItem?.actionLive ?? false,
    payloadExpression: rawItem?.actionPayloadExpression ?? "result",
  };
}

function buildResult(item: TelemetryItemDefinition): NodeResult | undefined {
  const preview = item.expressionPreview ?? formatPreview(readNodeValue(item));
  if (preview.kind === "empty" && item.mode !== "capture") return undefined;

  return {
    kind: preview.kind,
    raw: preview.raw,
    text: preview.text,
    updatedAt: item.updatedAt,
    status: preview.kind === "error" ? "error" : "success",
    latencyMs: Math.max(8, (item.sources.length + 1) * 6),
    origin: item.sources.map((source) => source.label),
    error: preview.error,
  };
}

function buildRun(item: TelemetryItemDefinition, rawItem?: CustomTelemetryItemDefinition): ExecutionRun | undefined {
  if (item.mode !== "custom") return item.lastRun;

  const startedAt = item.updatedAt;
  const finishedAt = item.updatedAt;
  const latencyMs = Math.max(8, (item.sources.length + 1) * 7);
  const steps = [] as ExecutionRun["steps"];

  if (item.inputEnabled) {
    steps.push({
      id: `${item.id}:receive`,
      label: "Receber",
      status: "success",
      detail: `${item.identityKeys.length} chave(s)`,
    });
  }

  if (item.expression?.trim()) {
    steps.push({
      id: `${item.id}:transform`,
      label: "Transformar",
      status: item.expressionPreview?.kind === "error" ? "error" : "success",
      detail: item.expressionPreview?.kind === "error" ? item.expressionPreview.error : item.expressionPreview?.text,
    });
  }

  if (item.displayEnabled) {
    steps.push({
      id: `${item.id}:display`,
      label: "Mostrar",
      status: item.expressionPreview?.kind === "error" ? "error" : "success",
      detail: item.presentation,
    });
  }

  if (rawItem?.actionEnabled) {
    steps.push({
      id: `${item.id}:action`,
      label: "Agir",
      status: item.lastDelivery?.status === "error" ? "error" : "success",
      detail: `${rawItem.actionType}${rawItem.actionLive ? " live" : " manual"}`,
    });
  }

  return {
    id: `${item.id}:${Date.parse(finishedAt)}`,
    nodeId: item.id,
    startedAt,
    finishedAt,
    latencyMs,
    status: steps.some((step) => step.status === "error") ? "error" : "success",
    trigger: item.inputEnabled ? "ingest" : "recompute",
    origin: item.sources.map((source) => source.label),
    steps,
  };
}

function buildDelivery(item: TelemetryItemDefinition, rawItem: CustomTelemetryItemDefinition | undefined, scope: Record<string, unknown>): ActionDelivery | undefined {
  if (!rawItem?.actionEnabled) return undefined;

  const payloadPreview = evaluateExpression(rawItem.actionPayloadExpression.trim() || "result", {
    ...scope,
    result: readNodeValue(item),
    output: readNodeValue(item),
    preview: item.expressionPreview?.text ?? item.label,
  });

  return {
    id: `${item.id}:delivery`,
    runId: `${item.id}:${Date.parse(item.updatedAt)}`,
    nodeId: item.id,
    type: rawItem.actionType,
    status: !rawItem.actionLive ? "idle" : payloadPreview.kind === "error" ? "error" : "delivered",
    live: rawItem.actionLive,
    target: rawItem.actionTarget ?? "dataset://workspace-output",
    method: rawItem.actionMethod,
    payload: payloadPreview.raw,
    deliveredAt: item.updatedAt,
    error: payloadPreview.error,
  };
}

function buildCustomHeadline(item: TelemetryItemDefinition) {
  if (item.presentation === "text") {
    return item.expressionPreview?.text ?? item.label;
  }
  return item.canvasPreview?.headline ?? item.expressionPreview?.text ?? item.label;
}

function buildCustomSummary(item: TelemetryItemDefinition, rawItem?: CustomTelemetryItemDefinition) {
  if (item.presentation === "text") {
    return item.description ?? item.expression ?? "Texto narrativo do no.";
  }

  if (rawItem?.actionEnabled) {
    return `${item.description ?? item.expression ?? "No configurado"} Acao: ${rawItem.actionType}${rawItem.actionLive ? " live" : " manual"}.`;
  }

  return item.description ?? item.expression ?? "No configurado";
}

export function decorateTelemetryNodes(input: {
  items: TelemetryItemDefinition[];
  customItems: CustomTelemetryItemDefinition[];
  systemMetrics: TelemetrySystemMetric[];
}) {
  const customItemMap = new Map(input.customItems.map((item) => [item.id, item]));
  const scope = buildScope(input.items, input.systemMetrics);

  return input.items.map((item) => {
    const rawItem = customItemMap.get(item.id);
    const delivery = buildDelivery(item, rawItem, scope);
    const result = buildResult(item);
    const nextItem: TelemetryItemDefinition = {
      ...item,
      inputEnabled: item.inputEnabled ?? rawItem?.inputEnabled ?? item.mode === "capture",
      displayEnabled: item.displayEnabled ?? rawItem?.displayEnabled ?? item.mode === "canvas",
      actionEnabled: rawItem?.actionEnabled ?? false,
      actionType: rawItem?.actionType,
      actionTarget: rawItem?.actionTarget,
      actionMethod: rawItem?.actionMethod,
      actionLive: rawItem?.actionLive,
      actionPayloadExpression: rawItem?.actionPayloadExpression,
      receive: buildReceiveConfig(item),
      transform: buildTransformConfig(item),
      display: buildDisplayConfig(item),
      action: buildActionConfig(rawItem),
      result,
      lastDelivery: delivery,
      actionDeliveries: delivery ? [delivery, ...(item.actionDeliveries ?? [])].slice(0, 10) : item.actionDeliveries ?? [],
    };

    const run = buildRun(nextItem, rawItem);
    nextItem.lastRun = run;
    nextItem.executionRuns = run ? [run, ...(item.executionRuns ?? [])].slice(0, 10) : item.executionRuns ?? [];

    if (rawItem && nextItem.mode === "custom") {
      nextItem.status = delivery?.status === "error" ? "attention" : nextItem.status;
      nextItem.canvasPreview = nextItem.displayEnabled
        ? {
            headline: buildCustomHeadline(nextItem),
            summary: buildCustomSummary(nextItem, rawItem),
            metrics: [
              { label: "Tipo", value: nextItem.resultType ?? "auto" },
              { label: "Refs", value: nextItem.sources.length.toString() },
              { label: "Acao", value: rawItem.actionEnabled ? `${rawItem.actionType}${rawItem.actionLive ? " live" : " manual"}` : "off" },
              ...(delivery ? [{ label: "Entrega", value: delivery.status }] : []),
            ],
          }
        : nextItem.canvasPreview;
    }

    return nextItem;
  });
}

export function formatNodeResultText(item: TelemetryItemDefinition) {
  const raw = item.result?.raw ?? item.expressionPreview?.raw;
  if (typeof raw === "number") {
    if (item.resultType === "currency" || item.format === "currency") return formatMoney(raw);
    if (item.resultType === "percentage" || item.format === "percentage") return formatPercent(raw);
    return formatNumber(raw);
  }
  return item.result?.text ?? item.expressionPreview?.text ?? item.label;
}

