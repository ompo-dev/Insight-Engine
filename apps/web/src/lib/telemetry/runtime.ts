import { formatMoney, formatPercent } from "@/lib/utils";
import type { AnalyticsOverview, ProjectSummary, RevenueMetrics } from "@/lib/data/types";
import type {
  CollectionDefinition,
  CollectionRecord,
  CollectionValidationResult,
  CreateCollectionInput,
  MaterializedDataset,
  MaterializedMetric,
  MetricDefinition,
  ModelDefinition,
  TelemetryDslStep,
  TelemetryFilterCondition,
  TelemetrySchemaField,
  TelemetrySnippetBundle,
  ValidationErrorDetail,
  ViewDefinition,
} from "./types";

interface RuntimeContext {
  project: Pick<ProjectSummary, "id" | "apiKey">;
  collections: Record<string, CollectionRecord[]>;
  metricsBySlug: Record<string, MaterializedMetric>;
  systemMetrics: Record<string, number>;
  now: string;
}

type RuntimeValue =
  | CollectionRecord["payload"][]
  | number
  | Array<Record<string, unknown>>
  | { current: number; previous: number; delta: number; ratio: number };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getValueAtPath(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isObject(current)) return undefined;
    return current[segment];
  }, source);
}

function normalizeSchemaField(field: TelemetrySchemaField): TelemetrySchemaField {
  if (field.type === "object") {
    return {
      ...field,
      properties: Object.fromEntries(
        Object.entries(field.properties ?? {}).map(([key, value]) => [key, normalizeSchemaField(value)]),
      ),
    };
  }

  if (field.type === "array" && field.items) {
    return {
      ...field,
      items: normalizeSchemaField(field.items),
    };
  }

  return field;
}

function validatePrimitive(
  field: TelemetrySchemaField,
  value: unknown,
  path: string,
  errors: ValidationErrorDetail[],
) {
  switch (field.type) {
    case "string":
      if (typeof value !== "string") {
        errors.push({ path, message: "Esperado texto.", code: "invalid_type", expected: "string", received: typeof value });
      } else if (field.enum && !field.enum.includes(value)) {
        errors.push({ path, message: "Valor fora do enum permitido.", code: "invalid_enum", expected: field.enum.join(", "), received: value });
      }
      break;
    case "date-time":
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        errors.push({ path, message: "Esperado ISO date-time valido.", code: "invalid_type", expected: "date-time", received: typeof value });
      }
      break;
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push({ path, message: "Esperado numero.", code: "invalid_type", expected: "number", received: typeof value });
      }
      break;
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) {
        errors.push({ path, message: "Esperado inteiro.", code: "invalid_type", expected: "integer", received: typeof value });
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") {
        errors.push({ path, message: "Esperado boolean.", code: "invalid_type", expected: "boolean", received: typeof value });
      }
      break;
    default:
      break;
  }
}

function validateNode(
  field: TelemetrySchemaField,
  value: unknown,
  path: string,
  errors: ValidationErrorDetail[],
) {
  if (field.type === "object") {
    if (!isObject(value)) {
      errors.push({ path, message: "Esperado objeto.", code: "invalid_type", expected: "object", received: typeof value });
      return;
    }

    const properties = field.properties ?? {};
    for (const [key, child] of Object.entries(properties)) {
      const childPath = path ? `${path}.${key}` : key;
      if (child.required && !(key in value)) {
        errors.push({ path: childPath, message: "Campo obrigatorio ausente.", code: "missing_required", expected: child.type });
        continue;
      }

      if (key in value) {
        validateNode(child, value[key], childPath, errors);
      }
    }

    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        const childPath = path ? `${path}.${key}` : key;
        errors.push({ path: childPath, message: "Campo nao previsto no schema.", code: "unknown_field" });
      }
    }
    return;
  }

  if (field.type === "array") {
    if (!Array.isArray(value)) {
      errors.push({ path, message: "Esperado array.", code: "invalid_type", expected: "array", received: typeof value });
      return;
    }

    if (!field.items) return;
    value.forEach((item, index) => validateNode(field.items!, item, `${path}[${index}]`, errors));
    return;
  }

  validatePrimitive(field, value, path, errors);
}

export function validateCollectionPayload(schema: TelemetrySchemaField, payload: Record<string, unknown>): CollectionValidationResult {
  const normalized = normalizeSchemaField(schema);
  const errors: ValidationErrorDetail[] = [];
  validateNode(normalized, payload, "", errors);
  return { valid: errors.length === 0, errors };
}

export function buildCollectionSnippets(
  project: Pick<ProjectSummary, "id" | "apiKey">,
  collection: Pick<CollectionDefinition, "slug" | "samplePayload">,
): TelemetrySnippetBundle {
  const sample = JSON.stringify(collection.samplePayload ?? { example: true }, null, 2);
  return {
    bun: `import { createLynxClient } from "@workspace/telemetry-sdk";\n\nconst lynx = createLynxClient({\n  apiKey: "${project.apiKey}",\n  projectId: "${project.id}",\n  host: "https://api.seu-dominio.com"\n});\n\nawait lynx.send("${collection.slug}", ${sample});`,
    browser: `import { createLynxClient } from "@workspace/telemetry-sdk";\n\nconst lynx = createLynxClient({\n  apiKey: window.__LYNX_API_KEY__,\n  projectId: "${project.id}",\n  host: window.__LYNX_HOST__\n});\n\nlynx.send("${collection.slug}", ${sample});`,
    react: `import { useMemo } from "react";\nimport { createLynxClient } from "@workspace/telemetry-sdk";\n\nexport function useNodeSender() {\n  const lynx = useMemo(() => createLynxClient({\n    apiKey: "${project.apiKey}",\n    projectId: "${project.id}",\n    host: "https://api.seu-dominio.com"\n  }), []);\n\n  return {\n    sendNode(payload) {\n      return lynx.send("${collection.slug}", payload);\n    },\n  };\n}`,
    curl: `curl -X POST "https://api.seu-dominio.com/projects/${project.id}/collections/${collection.slug}/ingest" \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${project.apiKey}" \\\n  -d '${JSON.stringify({ payloads: [collection.samplePayload ?? { example: true }] }, null, 2)}'`,
    send: `await lynx.send("${collection.slug}", ${sample});`,
    generatedClient: `await lynx.nodes["${collection.slug}"].send(${sample});`,
  };
}

function coerceNumber(value: unknown) {
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}

function applyCondition(record: Record<string, unknown>, condition: TelemetryFilterCondition) {
  const value = getValueAtPath(record, condition.field);

  switch (condition.operator) {
    case "eq":
      return value === condition.value;
    case "neq":
      return value !== condition.value;
    case "gt":
      return coerceNumber(value) > coerceNumber(condition.value);
    case "gte":
      return coerceNumber(value) >= coerceNumber(condition.value);
    case "lt":
      return coerceNumber(value) < coerceNumber(condition.value);
    case "lte":
      return coerceNumber(value) <= coerceNumber(condition.value);
    case "includes":
      if (typeof value === "string") return value.includes(String(condition.value ?? ""));
      if (Array.isArray(value)) return value.includes(condition.value);
      return false;
    case "exists":
      return value !== undefined && value !== null;
    default:
      return false;
  }
}

function getWindowCutoff(range: "7d" | "30d" | "90d", now: string) {
  const date = new Date(now);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  date.setUTCDate(date.getUTCDate() - days);
  return date.getTime();
}

function formatMetricValue(value: number, format: MetricDefinition["format"]) {
  if (format === "currency") return formatMoney(value);
  if (format === "percentage") return formatPercent(value);
  return value.toLocaleString("pt-BR");
}

function sumSeries(values: number[]) {
  return values.reduce((accumulator, current) => accumulator + current, 0);
}

function averageSeries(values: number[]) {
  return values.length ? sumSeries(values) / values.length : 0;
}

function resolveSourceValue(step: Extract<TelemetryDslStep, { op: "source" }>, context: RuntimeContext): RuntimeValue {
  if (step.source.kind === "collection") {
    return (context.collections[step.source.ref] ?? []).map((record) => record.payload);
  }

  if (step.source.kind === "metric") {
    return context.metricsBySlug[step.source.ref]?.value ?? 0;
  }

  return context.systemMetrics[step.source.ref] ?? 0;
}

function executeDsl(
  program: MetricDefinition["dsl"] | ModelDefinition["dsl"],
  context: RuntimeContext,
): RuntimeValue {
  const stepMap = new Map<string, RuntimeValue>();

  for (const step of program.steps) {
    if (step.op === "source") {
      stepMap.set(step.id, resolveSourceValue(step, context));
      continue;
    }

    if (step.op === "window") {
      const input = stepMap.get(step.input);
      if (!Array.isArray(input)) {
        stepMap.set(step.id, []);
        continue;
      }
      const cutoff = getWindowCutoff(step.range, context.now);
      const timestampField = step.timestampField ?? "timestamp";
      const filtered = input.filter((item) => {
        if (!isObject(item)) return false;
        const value = getValueAtPath(item, timestampField);
        return typeof value === "string" && Date.parse(value) >= cutoff;
      });
      stepMap.set(step.id, filtered);
      continue;
    }

    if (step.op === "filter") {
      const input = stepMap.get(step.input);
      if (!Array.isArray(input)) {
        stepMap.set(step.id, []);
        continue;
      }
      const filtered = input.filter((item) => isObject(item) && step.conditions.every((condition) => applyCondition(item, condition)));
      stepMap.set(step.id, filtered);
      continue;
    }

    if (step.op === "aggregate") {
      const input = stepMap.get(step.input);
      if (!Array.isArray(input)) {
        stepMap.set(step.id, 0);
        continue;
      }

      if (step.groupBy?.length) {
        const grouped = new Map<string, { key: string; rows: Record<string, unknown>[] }>();
        input.forEach((row) => {
          if (!isObject(row)) return;
          const key = step.groupBy!.map((field) => String(getValueAtPath(row, field) ?? "sem_valor")).join("::");
          const current = grouped.get(key);
          if (current) {
            current.rows.push(row);
            return;
          }
          grouped.set(key, { key, rows: [row] });
        });

        const resultRows = Array.from(grouped.values()).map((group) => {
          const values = step.field ? group.rows.map((row) => coerceNumber(getValueAtPath(row, step.field!))) : [];
          const value =
            step.mode === "count"
              ? group.rows.length
              : step.mode === "sum"
                ? sumSeries(values)
                : step.mode === "avg"
                  ? averageSeries(values)
                  : step.mode === "min"
                    ? (values.length ? Math.min(...values) : 0)
                    : (values.length ? Math.max(...values) : 0);

          const row = step.groupBy!.reduce<Record<string, unknown>>((accumulator, field) => {
            accumulator[field] = getValueAtPath(group.rows[0] ?? {}, field);
            return accumulator;
          }, {});
          row[step.as] = value;
          return row;
        });
        stepMap.set(step.id, resultRows);
        continue;
      }

      const values = step.field
        ? input.map((item) => (isObject(item) ? coerceNumber(getValueAtPath(item, step.field!)) : 0))
        : [];

      const result =
        step.mode === "count"
          ? input.length
          : step.mode === "sum"
            ? sumSeries(values)
            : step.mode === "avg"
              ? averageSeries(values)
              : step.mode === "min"
                ? (values.length ? Math.min(...values) : 0)
                : (values.length ? Math.max(...values) : 0);

      stepMap.set(step.id, result);
      continue;
    }

    if (step.op === "select") {
      const input = stepMap.get(step.input);
      if (!Array.isArray(input)) {
        stepMap.set(step.id, []);
        continue;
      }
      const rows = input
        .filter(isObject)
        .slice(0, step.limit ?? input.length)
        .map((row) =>
          step.fields.reduce<Record<string, unknown>>((accumulator, field) => {
            accumulator[field.key] = field.literal !== undefined ? field.literal : getValueAtPath(row, field.from ?? field.key);
            return accumulator;
          }, {}),
        );
      stepMap.set(step.id, rows);
      continue;
    }

    if (step.op === "math") {
      const left = step.left.ref ? coerceNumber(stepMap.get(step.left.ref)) : coerceNumber(step.left.literal);
      const right = step.right.ref ? coerceNumber(stepMap.get(step.right.ref)) : coerceNumber(step.right.literal);
      const result =
        step.mode === "add"
          ? left + right
          : step.mode === "subtract"
            ? left - right
            : step.mode === "multiply"
              ? left * right
              : right === 0
                ? 0
                : left / right;
      stepMap.set(step.id, Number(result.toFixed(4)));
      continue;
    }

    if (step.op === "compare") {
      const current = coerceNumber(stepMap.get(step.current));
      const previous = coerceNumber(stepMap.get(step.previous));
      const delta = current - previous;
      const ratio = previous === 0 ? 0 : delta / previous;
      stepMap.set(step.id, step.mode === "ratio" ? ratio : delta);
      continue;
    }

    if (step.op === "forecastSimple") {
      const input = coerceNumber(stepMap.get(step.input));
      stepMap.set(step.id, Number((input * step.multiplier).toFixed(2)));
      continue;
    }
  }

  return stepMap.get(program.output.ref) ?? (program.output.shape === "metric" ? 0 : []);
}

export function evaluateMetricDefinition(
  definition: MetricDefinition,
  context: RuntimeContext,
): MaterializedMetric {
  const value = coerceNumber(executeDsl(definition.dsl, context));
  const previousValue = value * 0.92;
  const delta = value - previousValue;
  return {
    definitionId: definition.id,
    label: definition.label,
    value,
    formattedValue: formatMetricValue(value, definition.format),
    previousValue,
    delta,
    deltaLabel:
      definition.format === "percentage"
        ? formatPercent(delta)
        : definition.format === "currency"
          ? formatMoney(delta)
          : delta.toLocaleString("pt-BR"),
    trend: delta > 0 ? "up" : delta < 0 ? "down" : "neutral",
    series: [
      { label: "7d", value: Number((value * 0.82).toFixed(2)) },
      { label: "30d", value: Number((value * 0.9).toFixed(2)) },
      { label: "Hoje", value: value },
    ],
    updatedAt: context.now,
  };
}

export function evaluateModelDefinition(
  definition: ModelDefinition,
  context: RuntimeContext,
): MaterializedDataset {
  const rows = executeDsl(definition.dsl, context);
  const datasetRows = Array.isArray(rows) ? rows.filter(isObject) : [];
  const columns = Object.keys(datasetRows[0] ?? {}).map((key) => ({
    key,
    label: key,
  }));

  return {
    definitionId: definition.id,
    label: definition.label,
    rows: datasetRows,
    columns,
    summary: [
      { label: "Rows", value: datasetRows.length.toLocaleString("pt-BR") },
      { label: "Cols", value: columns.length.toString() },
      { label: "Atualizado", value: new Date(context.now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
    ],
    updatedAt: context.now,
  };
}

export function buildTelemetryRuntimeContext(input: {
  project: Pick<ProjectSummary, "id" | "apiKey">;
  collections: Record<string, CollectionRecord[]>;
  revenueMetrics: RevenueMetrics | undefined;
  overview: AnalyticsOverview | undefined;
  now: string;
  metricDefinitions: MetricDefinition[];
}): RuntimeContext {
  const systemMetrics: Record<string, number> = {
    mrr: input.revenueMetrics?.mrr ?? 0,
    arr: input.revenueMetrics?.arr ?? 0,
    churn_rate: input.revenueMetrics?.churnRate ?? 0,
    total_events: input.overview?.totalEvents ?? 0,
    total_sessions: input.overview?.totalSessions ?? 0,
    unique_users: input.overview?.uniqueUsers ?? 0,
  };

  const metricsBySlug: Record<string, MaterializedMetric> = {};
  const context: RuntimeContext = {
    project: input.project,
    collections: input.collections,
    metricsBySlug,
    systemMetrics,
    now: input.now,
  };

  for (const definition of input.metricDefinitions) {
    const materialized = evaluateMetricDefinition(definition, context);
    metricsBySlug[definition.slug] = materialized;
  }

  return context;
}

export function buildDefaultCollectionDefinition(
  projectId: string,
  input: CreateCollectionInput,
  now: string,
): CollectionDefinition {
  return {
    id: `${projectId}_collection_${input.slug}`,
    projectId,
    slug: input.slug,
    label: input.label,
    description: input.description ?? null,
    source: "custom",
    status: "active",
    schema: input.schema,
    identityKeys: input.identityKeys ?? [],
    timestampField: input.timestampField ?? null,
    tags: input.tags ?? [],
    samplePayload: input.samplePayload ?? null,
    recordCount: 0,
    lastIngestedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildViewPreview(
  view: ViewDefinition,
  collections: CollectionDefinition[],
  metrics: MetricDefinition[],
  models: ModelDefinition[],
  materializedMetrics: Record<string, MaterializedMetric>,
  materializedDatasets: Record<string, MaterializedDataset>,
) {
  if (view.sourceKind === "collection") {
    const collection = collections.find((item) => item.id === view.sourceId || item.slug === view.sourceId);
    return {
      headline: collection ? `${collection.recordCount.toLocaleString("pt-BR")} registros` : "Sem fonte",
      summary: collection?.description ?? "Colecao conectada a esta view.",
      metrics: [
        { label: "Slug", value: collection?.slug ?? "-" },
        { label: "Keys", value: collection?.identityKeys.length.toString() ?? "0" },
      ],
    };
  }

  if (view.sourceKind === "metric") {
    const metric = metrics.find((item) => item.id === view.sourceId || item.slug === view.sourceId);
    const materialized = metric ? materializedMetrics[metric.slug] : undefined;
    return {
      headline: materialized?.formattedValue ?? "Sem valor",
      summary: metric?.description ?? "View conectada a uma metrica derivada.",
      metrics: [
        { label: "Fonte", value: metric?.label ?? "-" },
        { label: "Trend", value: materialized?.trend ?? "neutral" },
      ],
    };
  }

  const model = models.find((item) => item.id === view.sourceId || item.slug === view.sourceId);
  const materialized = model ? materializedDatasets[model.slug] : undefined;
  return {
    headline: materialized ? `${materialized.rows.length.toLocaleString("pt-BR")} linhas` : "Sem dataset",
    summary: model?.description ?? "View conectada a um modelo derivado.",
    metrics: [
      { label: "Fonte", value: model?.label ?? "-" },
      { label: "Cols", value: materialized?.columns.length.toString() ?? "0" },
    ],
  };
}
