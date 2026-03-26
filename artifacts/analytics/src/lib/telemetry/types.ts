export type TelemetryFieldType = "string" | "number" | "integer" | "boolean" | "date-time" | "object" | "array";

export interface TelemetrySchemaField {
  type: TelemetryFieldType;
  label?: string;
  description?: string;
  required?: boolean;
  enum?: string[];
  properties?: Record<string, TelemetrySchemaField>;
  items?: TelemetrySchemaField;
}

export interface CollectionDefinition {
  id: string;
  projectId: string;
  slug: string;
  label: string;
  description?: string | null;
  source: "custom" | "system";
  status: "draft" | "active";
  schema: TelemetrySchemaField;
  identityKeys: string[];
  timestampField?: string | null;
  tags: string[];
  samplePayload?: Record<string, unknown> | null;
  recordCount: number;
  lastIngestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionRecord {
  id: string;
  projectId: string;
  collectionSlug: string;
  payload: Record<string, unknown>;
  ingestedAt: string;
}

export interface CollectionRecordListResponse {
  collectionSlug: string;
  records: CollectionRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ValidationErrorDetail {
  path: string;
  message: string;
  code:
    | "missing_required"
    | "invalid_type"
    | "unknown_field"
    | "invalid_enum"
    | "invalid_json";
  expected?: string;
  received?: string;
}

export interface CollectionValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
}

export interface CollectionIngestRequest {
  payloads: Record<string, unknown>[];
}

export interface CollectionIngestResponse {
  accepted: number;
  rejected: number;
  errors: Array<ValidationErrorDetail & { index: number }>;
  recordIds: string[];
}

export type TelemetrySourceKind = "collection" | "metric" | "system-metric";

export interface TelemetrySourceRef {
  kind: TelemetrySourceKind;
  ref: string;
  label?: string;
}

export interface TelemetryFilterCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "includes" | "exists";
  value?: string | number | boolean | null;
}

export interface TelemetrySourceStep {
  id: string;
  op: "source";
  source: TelemetrySourceRef;
}

export interface TelemetryWindowStep {
  id: string;
  op: "window";
  input: string;
  range: "7d" | "30d" | "90d";
  timestampField?: string;
}

export interface TelemetryFilterStep {
  id: string;
  op: "filter";
  input: string;
  conditions: TelemetryFilterCondition[];
}

export interface TelemetryAggregateStep {
  id: string;
  op: "aggregate";
  input: string;
  mode: "count" | "sum" | "avg" | "min" | "max";
  field?: string;
  groupBy?: string[];
  as: string;
}

export interface TelemetrySelectField {
  key: string;
  label?: string;
  from?: string;
  literal?: string | number | boolean | null;
}

export interface TelemetrySelectStep {
  id: string;
  op: "select";
  input: string;
  fields: TelemetrySelectField[];
  limit?: number;
}

export interface TelemetryMathOperand {
  ref?: string;
  literal?: number;
}

export interface TelemetryMathStep {
  id: string;
  op: "math";
  mode: "add" | "subtract" | "multiply" | "divide";
  left: TelemetryMathOperand;
  right: TelemetryMathOperand;
  as: string;
}

export interface TelemetryCompareStep {
  id: string;
  op: "compare";
  current: string;
  previous: string;
  mode: "delta" | "ratio";
  as: string;
}

export interface TelemetryForecastStep {
  id: string;
  op: "forecastSimple";
  input: string;
  multiplier: number;
  as: string;
}

export type TelemetryDslStep =
  | TelemetrySourceStep
  | TelemetryWindowStep
  | TelemetryFilterStep
  | TelemetryAggregateStep
  | TelemetrySelectStep
  | TelemetryMathStep
  | TelemetryCompareStep
  | TelemetryForecastStep;

export interface TelemetryDslProgram {
  version: 1;
  steps: TelemetryDslStep[];
  output: {
    ref: string;
    shape: "metric" | "dataset";
  };
}

export interface MetricDefinition {
  id: string;
  projectId: string;
  slug: string;
  label: string;
  description?: string | null;
  format: "number" | "currency" | "percentage";
  tags: string[];
  sources: TelemetrySourceRef[];
  dsl: TelemetryDslProgram;
  createdAt: string;
  updatedAt: string;
}

export interface ModelDefinition {
  id: string;
  projectId: string;
  slug: string;
  label: string;
  description?: string | null;
  tags: string[];
  sources: TelemetrySourceRef[];
  dsl: TelemetryDslProgram;
  createdAt: string;
  updatedAt: string;
}

export interface MaterializedMetric {
  definitionId: string;
  label: string;
  value: number;
  formattedValue: string;
  previousValue?: number | null;
  delta?: number | null;
  deltaLabel?: string | null;
  trend: "up" | "down" | "neutral";
  series: Array<{ label: string; value: number }>;
  updatedAt: string;
}

export interface MaterializedDataset {
  definitionId: string;
  label: string;
  rows: Array<Record<string, unknown>>;
  columns: Array<{ key: string; label: string }>;
  summary: Array<{ label: string; value: string }>;
  updatedAt: string;
}

export interface ViewDefinition {
  id: string;
  projectId: string;
  slug: string;
  label: string;
  description?: string | null;
  sourceKind: "collection" | "metric" | "model";
  sourceId: string;
  presentation: "stat" | "table" | "line" | "comparison";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryViewPreview {
  headline: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
}

export interface TelemetrySnippetBundle {
  bun: string;
  browser: string;
  react: string;
  curl: string;
  send: string;
  generatedClient: string;
}

export interface CreateCollectionInput {
  slug: string;
  label: string;
  description?: string;
  schema: TelemetrySchemaField;
  identityKeys?: string[];
  timestampField?: string;
  tags?: string[];
  samplePayload?: Record<string, unknown>;
}

export interface UpdateCollectionInput extends Partial<CreateCollectionInput> {
  status?: CollectionDefinition["status"];
}

export interface CreateMetricInput {
  slug: string;
  label: string;
  description?: string;
  format: MetricDefinition["format"];
  tags?: string[];
  sources: TelemetrySourceRef[];
  dsl: TelemetryDslProgram;
}

export interface CreateModelInput {
  slug: string;
  label: string;
  description?: string;
  tags?: string[];
  sources: TelemetrySourceRef[];
  dsl: TelemetryDslProgram;
}

export interface CreateViewInput {
  slug: string;
  label: string;
  description?: string;
  sourceKind: ViewDefinition["sourceKind"];
  sourceId: string;
  presentation: ViewDefinition["presentation"];
  tags?: string[];
}




