import type {
  AnalyticsOverview,
  CreateBoardItemInput,
  DatastoreRecord,
  CustomerListResponse,
  DatastoreQueryResponse,
  DeliveryBoard,
  DeliveryBoardItem,
  EngineeringOverview,
  EventListResponse,
  Experiment,
  FeatureFlag,
  ProjectSettings,
  SessionDetail,
  SessionListResponse,
  RevenueMetrics,
  UpdateBoardItemInput,
} from "./types";
import { createEmptyDataset, createInitialDatabase, NOW, type ProjectDataset, type ProjectRecord } from "./mock-seed";
import {
  buildAlerts,
  buildDeliveryBoard,
  buildEngineeringOverview,
  buildExperimentDetail,
  buildFunnelDetail,
  buildInsights,
  buildOverview,
  buildProjectSummary,
  buildRevenueMetrics,
  buildRevenuePlans,
  buildRevenueTimeline,
  deriveCollections,
} from "./mock-selectors";
import type {
  CollectionDefinition,
  CollectionIngestResponse,
  CollectionRecord,
  CollectionRecordListResponse,
  CollectionValidationResult,
  CreateCollectionInput,
  CreateMetricInput,
  CreateModelInput,
  CreateViewInput,
  MaterializedDataset,
  MaterializedMetric,
  MetricDefinition,
  ModelDefinition,
  TelemetrySnippetBundle,
  UpdateCollectionInput,
  ViewDefinition,
} from "@/lib/telemetry/types";
import {
  buildCollectionSnippets,
  buildDefaultCollectionDefinition,
  buildTelemetryRuntimeContext,
  buildViewPreview,
  evaluateModelDefinition,
  validateCollectionPayload,
} from "@/lib/telemetry/runtime";

const database: Record<string, ProjectDataset> = createInitialDatabase();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function findDataset(projectIdentifier: string): ProjectDataset | undefined {
  if (database[projectIdentifier]) {
    return database[projectIdentifier];
  }

  return Object.values(database).find(
    (dataset) =>
      dataset.project.id === projectIdentifier ||
      dataset.project.slug === projectIdentifier,
  );
}

function getDataset(projectIdentifier: string): ProjectDataset {
  const dataset = findDataset(projectIdentifier);

  if (!dataset) {
    throw new Error(`Project "${projectIdentifier}" was not found.`);
  }

  return dataset;
}

function sortByTimestampDesc<T extends { timestamp?: string; createdAt?: string; startedAt?: string }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => {
    const leftValue = left.timestamp ?? left.createdAt ?? left.startedAt ?? "";
    const rightValue = right.timestamp ?? right.createdAt ?? right.startedAt ?? "";
    return new Date(rightValue).getTime() - new Date(leftValue).getTime();
  });
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function toCollectionRecord(record: DatastoreRecord): CollectionRecord {
  return {
    id: record.id,
    projectId: record.projectId,
    collectionSlug: record.collection,
    payload: record.data,
    ingestedAt: record.createdAt,
  };
}

function hydrateCollectionDefinition(dataset: ProjectDataset, definition: CollectionDefinition): CollectionDefinition {
  const records = dataset.datastore[definition.slug] ?? [];
  return {
    ...definition,
    recordCount: records.length,
    lastIngestedAt: records[0]?.createdAt ?? definition.lastIngestedAt ?? null,
  };
}

function getCollectionDefinition(dataset: ProjectDataset, collectionSlug: string) {
  const definition = dataset.telemetry.collections.find(
    (item) => item.slug === collectionSlug || item.id === collectionSlug,
  );

  if (!definition) {
    throw new Error(`Collection "${collectionSlug}" not found`);
  }

  return definition;
}

function buildRuntimeForDataset(dataset: ProjectDataset) {
  const overview = buildOverview(dataset);
  const revenueMetrics = buildRevenueMetrics(dataset);
  const collections = Object.fromEntries(
    dataset.telemetry.collections.map((definition) => [
      definition.slug,
      (dataset.datastore[definition.slug] ?? []).map(toCollectionRecord),
    ]),
  );

  return buildTelemetryRuntimeContext({
    project: buildProjectSummary(dataset),
    collections,
    revenueMetrics,
    overview,
    now: NOW.toISOString(),
    metricDefinitions: dataset.telemetry.metrics,
  });
}

function listMaterializedMetricsInternal(dataset: ProjectDataset): Record<string, MaterializedMetric> {
  return buildRuntimeForDataset(dataset).metricsBySlug;
}

function listMaterializedDatasetsInternal(dataset: ProjectDataset): Record<string, MaterializedDataset> {
  const runtime = buildRuntimeForDataset(dataset);

  return Object.fromEntries(
    dataset.telemetry.models.map((definition) => [
      definition.slug,
      evaluateModelDefinition(definition, runtime),
    ]),
  );
}

export const mockDatabase = {
  listProjects() {
    return Object.values(database)
      .map((dataset) => buildProjectSummary(dataset))
      .sort((left, right) => left.name.localeCompare(right.name));
  },
  createProject(input: { name: string; description?: string; website?: string }) {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const createdAt = NOW.toISOString();
    const project: ProjectRecord = {
      id: nextId("proj"),
      name: input.name,
      slug,
      description: input.description ?? null,
      website: input.website ?? null,
      apiKey: `lynx_live_${slug.replace(/-/g, "_")}`,
      abacatePayConnected: false,
      createdAt,
      updatedAt: createdAt,
    };

    database[project.id] = createEmptyDataset(project);
    return buildProjectSummary(database[project.id]);
  },
  updateProject(projectId: string, updates: { name?: string; description?: string; website?: string }) {
    const dataset = getDataset(projectId);
    dataset.project = {
      ...dataset.project,
      name: updates.name ?? dataset.project.name,
      description: updates.description ?? dataset.project.description,
      website: updates.website ?? dataset.project.website,
      updatedAt: NOW.toISOString(),
    };
    dataset.settings.website = updates.website ?? dataset.settings.website;
    return buildProjectSummary(dataset);
  },
  getOverview(projectId: string) {
    return buildOverview(getDataset(projectId));
  },
  listEvents(projectId: string, options: { limit?: number; offset?: number; eventName?: string; sessionId?: string; userId?: string } = {}): EventListResponse {
    const dataset = getDataset(projectId);
    const filtered = dataset.events.filter((event) => {
      if (options.eventName && event.name !== options.eventName) return false;
      if (options.sessionId && event.sessionId !== options.sessionId) return false;
      if (options.userId && event.userId !== options.userId) return false;
      return true;
    });
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const sorted = sortByTimestampDesc(filtered);

    return { events: sorted.slice(offset, offset + limit), total: sorted.length, limit, offset };
  },
  listSessions(projectId: string, options: { limit?: number; offset?: number; userId?: string } = {}): SessionListResponse {
    const dataset = getDataset(projectId);
    const filtered = dataset.sessions.filter((session) => {
      if (options.userId && session.userId !== options.userId) return false;
      return true;
    });
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const sorted = sortByTimestampDesc(filtered);

    return { sessions: sorted.slice(offset, offset + limit), total: sorted.length, limit, offset };
  },
  getSession(projectId: string, sessionId: string): SessionDetail {
    const dataset = getDataset(projectId);
    const session = dataset.sessions.find((entry) => entry.id === sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    return {
      session,
      events: dataset.events.filter((event) => event.sessionId === session.sessionId),
    };
  },
  listFunnels(projectId: string) {
    return clone(getDataset(projectId).funnels);
  },
  getFunnel(projectId: string, funnelId: string) {
    const dataset = getDataset(projectId);
    const funnel = dataset.funnels.find((entry) => entry.id === funnelId);
    if (!funnel) throw new Error("Funnel not found");
    return buildFunnelDetail(dataset, funnel);
  },
  createFunnel(projectId: string, input: { name: string; description?: string; steps: Array<{ order: number; eventName: string; label: string }> }) {
    const dataset = getDataset(projectId);
    const funnel = {
      id: nextId(`${projectId}-funnel`),
      projectId,
      name: input.name,
      description: input.description ?? null,
      steps: input.steps,
      createdAt: NOW.toISOString(),
    };

    dataset.funnels.unshift(funnel);
    return clone(funnel);
  },
  listExperiments(projectId: string) {
    return clone(getDataset(projectId).experiments);
  },
  createExperiment(projectId: string, input: { name: string; description?: string; hypothesis?: string; metric?: string; targetSampleSize?: number; variants: Experiment["variants"] }) {
    const dataset = getDataset(projectId);
    const normalizedVariants = input.variants.map((variant, index, variants) => {
      const total = variants.reduce((sum, item) => sum + item.weight, 0);
      const divisor = total > 1 ? (total <= 100 ? 100 : total) : 1;

      return {
        ...variant,
        id: variant.id || `variant-${index + 1}`,
        weight: Number((variant.weight / divisor).toFixed(2)),
      };
    });
    const experiment = {
      id: nextId(`${projectId}-exp`),
      projectId,
      name: input.name,
      description: input.description ?? null,
      status: "draft" as const,
      hypothesis: input.hypothesis ?? null,
      variants: normalizedVariants,
      metric: input.metric ?? null,
      targetSampleSize: input.targetSampleSize ?? null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      startedAt: null,
      endedAt: null,
    };

    dataset.experiments.unshift(experiment);
    return clone(experiment);
  },
  getExperiment(projectId: string, experimentId: string) {
    const dataset = getDataset(projectId);
    const experiment = dataset.experiments.find((entry) => entry.id === experimentId);
    if (!experiment) throw new Error("Experiment not found");
    return buildExperimentDetail(experiment, dataset.experiments.indexOf(experiment) + 1);
  },
  updateExperiment(projectId: string, experimentId: string, input: Partial<Experiment>) {
    const dataset = getDataset(projectId);
    const index = dataset.experiments.findIndex((entry) => entry.id === experimentId);
    if (index === -1) throw new Error("Experiment not found");

    const current = dataset.experiments[index];
    const nextStatus = input.status ?? current.status;
    dataset.experiments[index] = {
      ...current,
      ...input,
      status: nextStatus,
      updatedAt: NOW.toISOString(),
      startedAt: nextStatus === "running" ? current.startedAt ?? NOW.toISOString() : current.startedAt,
      endedAt: nextStatus === "completed" ? NOW.toISOString() : current.endedAt,
    };

    return clone(dataset.experiments[index]);
  },
  listLogs(projectId: string, options: { search?: string; level?: string; limit?: number; offset?: number } = {}) {
    const dataset = getDataset(projectId);
    const filtered = dataset.logs.filter((entry) => {
      if (options.level && entry.level !== options.level) return false;
      if (options.search && !entry.message.toLowerCase().includes(options.search.toLowerCase())) return false;
      return true;
    });
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;
    const entries = sortByTimestampDesc(filtered).slice(offset, offset + limit);

    return { entries, total: filtered.length, limit, offset };
  },
  listRequests(projectId: string, options: { method?: string; statusCode?: number; limit?: number; offset?: number } = {}) {
    const dataset = getDataset(projectId);
    const filtered = dataset.requests.filter((entry) => {
      if (options.method && entry.method !== options.method.toUpperCase()) return false;
      if (options.statusCode && entry.statusCode !== options.statusCode) return false;
      return true;
    });
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;
    const requests = sortByTimestampDesc(filtered).slice(offset, offset + limit);

    return { requests, total: filtered.length, limit, offset };
  },
  listDatastoreCollections(projectId: string) {
    return deriveCollections(getDataset(projectId));
  },
  queryDatastore(projectId: string, collection: string, options: { limit?: number; offset?: number } = {}): DatastoreQueryResponse {
    const records = sortByTimestampDesc(getDataset(projectId).datastore[collection] ?? []);
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    return { collection, records: records.slice(offset, offset + limit), total: records.length, limit, offset };
  },
  insertDatastoreRecord(projectId: string, collection: string, data: Record<string, unknown>) {
    const dataset = getDataset(projectId);
    const record = {
      id: nextId(`${projectId}-${collection}`),
      projectId,
      collection,
      data,
      createdAt: NOW.toISOString(),
    };

    if (!dataset.datastore[collection]) dataset.datastore[collection] = [];
    dataset.datastore[collection].unshift(record);
    return clone(record);
  },
  listCollectionDefinitions(projectId: string): CollectionDefinition[] {
    const dataset = getDataset(projectId);
    return dataset.telemetry.collections.map((definition) => clone(hydrateCollectionDefinition(dataset, definition)));
  },
  createCollectionDefinition(projectId: string, input: CreateCollectionInput): CollectionDefinition {
    const dataset = getDataset(projectId);
    const existing = dataset.telemetry.collections.find((item) => item.slug === input.slug);
    if (existing) {
      throw new Error(`Collection "${input.slug}" already exists`);
    }

    const definition = buildDefaultCollectionDefinition(projectId, input, NOW.toISOString());
    dataset.telemetry.collections.unshift(definition);
    if (!dataset.datastore[input.slug]) {
      dataset.datastore[input.slug] = [];
    }
    return clone(hydrateCollectionDefinition(dataset, definition));
  },
  updateCollectionDefinition(projectId: string, collectionId: string, input: UpdateCollectionInput): CollectionDefinition {
    const dataset = getDataset(projectId);
    const index = dataset.telemetry.collections.findIndex(
      (item) => item.id === collectionId || item.slug === collectionId,
    );

    if (index === -1) {
      throw new Error(`Collection "${collectionId}" not found`);
    }

    const current = dataset.telemetry.collections[index];
    dataset.telemetry.collections[index] = {
      ...current,
      ...input,
      schema: input.schema ?? current.schema,
      identityKeys: input.identityKeys ?? current.identityKeys,
      tags: input.tags ?? current.tags,
      samplePayload: input.samplePayload ?? current.samplePayload,
      updatedAt: NOW.toISOString(),
    };

    return clone(hydrateCollectionDefinition(dataset, dataset.telemetry.collections[index]));
  },
  validateCollectionRecord(projectId: string, collectionSlug: string, payload: Record<string, unknown>): CollectionValidationResult {
    const dataset = getDataset(projectId);
    const definition = getCollectionDefinition(dataset, collectionSlug);
    return validateCollectionPayload(definition.schema, payload);
  },
  ingestCollectionRecords(projectId: string, collectionSlug: string, payloads: Record<string, unknown>[]): CollectionIngestResponse {
    const dataset = getDataset(projectId);
    const definition = getCollectionDefinition(dataset, collectionSlug);
    const errors: CollectionIngestResponse["errors"] = [];
    const recordIds: string[] = [];

    if (!dataset.datastore[definition.slug]) {
      dataset.datastore[definition.slug] = [];
    }

    payloads.forEach((payload, index) => {
      const validation = validateCollectionPayload(definition.schema, payload);
      if (!validation.valid) {
        errors.push(...validation.errors.map((error) => ({ ...error, index })));
        return;
      }

      const record = {
        id: nextId(`${projectId}-${definition.slug}`),
        projectId,
        collection: definition.slug,
        data: payload,
        createdAt: (
          typeof payload.updatedAt === "string" && !Number.isNaN(Date.parse(payload.updatedAt))
            ? new Date(payload.updatedAt)
            : NOW
        ).toISOString(),
      };

      dataset.datastore[definition.slug].unshift(record);
      recordIds.push(record.id);
    });

    const collectionIndex = dataset.telemetry.collections.findIndex((item) => item.id === definition.id);
    if (collectionIndex >= 0) {
      dataset.telemetry.collections[collectionIndex] = hydrateCollectionDefinition(
        dataset,
        dataset.telemetry.collections[collectionIndex],
      );
    }

    return {
      accepted: recordIds.length,
      rejected: payloads.length - recordIds.length,
      errors,
      recordIds,
    };
  },
  listCollectionRecords(
    projectId: string,
    collectionSlug: string,
    options: { limit?: number; offset?: number } = {},
  ): CollectionRecordListResponse {
    const dataset = getDataset(projectId);
    const definition = getCollectionDefinition(dataset, collectionSlug);
    const records = sortByTimestampDesc(dataset.datastore[definition.slug] ?? []).map(toCollectionRecord);
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    return {
      collectionSlug: definition.slug,
      records: records.slice(offset, offset + limit),
      total: records.length,
      limit,
      offset,
    };
  },
  getCollectionSnippets(projectId: string, collectionSlug: string): TelemetrySnippetBundle {
    const dataset = getDataset(projectId);
    const definition = getCollectionDefinition(dataset, collectionSlug);
    return buildCollectionSnippets(buildProjectSummary(dataset), definition);
  },
  listMetricDefinitions(projectId: string): MetricDefinition[] {
    return clone(getDataset(projectId).telemetry.metrics);
  },
  createMetricDefinition(projectId: string, input: CreateMetricInput): MetricDefinition {
    const dataset = getDataset(projectId);
    const definition: MetricDefinition = {
      id: `${projectId}_metric_${input.slug}`,
      projectId,
      slug: input.slug,
      label: input.label,
      description: input.description ?? null,
      format: input.format,
      tags: input.tags ?? [],
      sources: input.sources,
      dsl: input.dsl,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    dataset.telemetry.metrics.unshift(definition);
    return clone(definition);
  },
  updateMetricDefinition(projectId: string, metricId: string, input: Partial<CreateMetricInput>): MetricDefinition {
    const dataset = getDataset(projectId);
    const index = dataset.telemetry.metrics.findIndex((item) => item.id === metricId || item.slug === metricId);
    if (index === -1) throw new Error(`Metric "${metricId}" not found`);
    dataset.telemetry.metrics[index] = {
      ...dataset.telemetry.metrics[index],
      ...input,
      tags: input.tags ?? dataset.telemetry.metrics[index].tags,
      sources: input.sources ?? dataset.telemetry.metrics[index].sources,
      dsl: input.dsl ?? dataset.telemetry.metrics[index].dsl,
      updatedAt: NOW.toISOString(),
    };
    return clone(dataset.telemetry.metrics[index]);
  },
  listMaterializedMetrics(projectId: string): Record<string, MaterializedMetric> {
    return clone(listMaterializedMetricsInternal(getDataset(projectId)));
  },
  listModelDefinitions(projectId: string): ModelDefinition[] {
    return clone(getDataset(projectId).telemetry.models);
  },
  createModelDefinition(projectId: string, input: CreateModelInput): ModelDefinition {
    const dataset = getDataset(projectId);
    const definition: ModelDefinition = {
      id: `${projectId}_model_${input.slug}`,
      projectId,
      slug: input.slug,
      label: input.label,
      description: input.description ?? null,
      tags: input.tags ?? [],
      sources: input.sources,
      dsl: input.dsl,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    dataset.telemetry.models.unshift(definition);
    return clone(definition);
  },
  updateModelDefinition(projectId: string, modelId: string, input: Partial<CreateModelInput>): ModelDefinition {
    const dataset = getDataset(projectId);
    const index = dataset.telemetry.models.findIndex((item) => item.id === modelId || item.slug === modelId);
    if (index === -1) throw new Error(`Model "${modelId}" not found`);
    dataset.telemetry.models[index] = {
      ...dataset.telemetry.models[index],
      ...input,
      tags: input.tags ?? dataset.telemetry.models[index].tags,
      sources: input.sources ?? dataset.telemetry.models[index].sources,
      dsl: input.dsl ?? dataset.telemetry.models[index].dsl,
      updatedAt: NOW.toISOString(),
    };
    return clone(dataset.telemetry.models[index]);
  },
  listMaterializedDatasets(projectId: string): Record<string, MaterializedDataset> {
    return clone(listMaterializedDatasetsInternal(getDataset(projectId)));
  },
  listViewDefinitions(projectId: string): ViewDefinition[] {
    return clone(getDataset(projectId).telemetry.views);
  },
  createViewDefinition(projectId: string, input: CreateViewInput): ViewDefinition {
    const dataset = getDataset(projectId);
    const definition: ViewDefinition = {
      id: `${projectId}_view_${input.slug}`,
      projectId,
      slug: input.slug,
      label: input.label,
      description: input.description ?? null,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      presentation: input.presentation,
      tags: input.tags ?? [],
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    dataset.telemetry.views.unshift(definition);
    return clone(definition);
  },
  updateViewDefinition(projectId: string, viewId: string, input: Partial<CreateViewInput>): ViewDefinition {
    const dataset = getDataset(projectId);
    const index = dataset.telemetry.views.findIndex((item) => item.id === viewId || item.slug === viewId);
    if (index === -1) throw new Error(`View "${viewId}" not found`);
    dataset.telemetry.views[index] = {
      ...dataset.telemetry.views[index],
      ...input,
      tags: input.tags ?? dataset.telemetry.views[index].tags,
      updatedAt: NOW.toISOString(),
    };
    return clone(dataset.telemetry.views[index]);
  },
  listViewPreviews(projectId: string) {
    const dataset = getDataset(projectId);
    const materializedMetrics = listMaterializedMetricsInternal(dataset);
    const materializedDatasets = listMaterializedDatasetsInternal(dataset);
    return Object.fromEntries(
      dataset.telemetry.views.map((view) => [
        view.slug,
        buildViewPreview(
          view,
          dataset.telemetry.collections.map((item) => hydrateCollectionDefinition(dataset, item)),
          dataset.telemetry.metrics,
          dataset.telemetry.models,
          materializedMetrics,
          materializedDatasets,
        ),
      ]),
    );
  },
  listDashboards(projectId: string) {
    return clone(getDataset(projectId).dashboards);
  },
  listRevenueEvents(projectId: string, options: { type?: string; limit?: number; offset?: number } = {}) {
    const dataset = getDataset(projectId);
    const filtered = dataset.revenueEvents.filter((event) => !options.type || event.type === options.type);
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    return { events: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset };
  },
  getRevenueMetrics(projectId: string) {
    return buildRevenueMetrics(getDataset(projectId));
  },
  getRevenueTimeline(projectId: string) {
    return buildRevenueTimeline(getDataset(projectId));
  },
  getRevenuePlans(projectId: string) {
    return buildRevenuePlans(getDataset(projectId));
  },
  listCustomers(projectId: string, options: { limit?: number; offset?: number; search?: string; status?: string } = {}): CustomerListResponse {
    const dataset = getDataset(projectId);
    const filtered = dataset.customers.filter((customer) => {
      if (options.status && customer.status !== options.status) return false;
      if (options.search) {
        const haystack = `${customer.email} ${customer.name ?? ""}`.toLowerCase();
        if (!haystack.includes(options.search.toLowerCase())) return false;
      }
      return true;
    });
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const customers = sortByTimestampDesc(filtered).slice(offset, offset + limit);

    return { customers, total: filtered.length, limit, offset };
  },
  listFeatureFlags(projectId: string) {
    return clone(getDataset(projectId).featureFlags);
  },
  createFeatureFlag(projectId: string, input: Partial<FeatureFlag> & { key: string; name: string }) {
    const dataset = getDataset(projectId);
    const flag: FeatureFlag = {
      id: nextId(`${projectId}-flag`),
      projectId,
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      enabled: input.enabled ?? false,
      rolloutPercentage: input.rolloutPercentage ?? 0,
      targetingRules: input.targetingRules ?? [],
      variants: input.variants ?? [],
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };

    dataset.featureFlags.unshift(flag);
    return clone(flag);
  },
  updateFeatureFlag(projectId: string, flagId: string, input: Partial<FeatureFlag>) {
    const dataset = getDataset(projectId);
    const index = dataset.featureFlags.findIndex((flag) => flag.id === flagId);
    if (index === -1) throw new Error("Feature flag not found");
    dataset.featureFlags[index] = { ...dataset.featureFlags[index], ...input, updatedAt: NOW.toISOString() };
    return clone(dataset.featureFlags[index]);
  },
  deleteFeatureFlag(projectId: string, flagId: string) {
    const dataset = getDataset(projectId);
    dataset.featureFlags = dataset.featureFlags.filter((flag) => flag.id !== flagId);
  },
  getInsights(projectId: string) {
    return buildInsights(getDataset(projectId));
  },
  getAlerts(projectId: string) {
    return buildAlerts(getDataset(projectId));
  },
  getProjectSettings(projectId: string): ProjectSettings {
    return clone(getDataset(projectId).settings);
  },
  getEngineeringOverview(projectId: string): EngineeringOverview {
    return buildEngineeringOverview(getDataset(projectId));
  },
  getDeliveryBoard(projectId: string): DeliveryBoard {
    return buildDeliveryBoard(getDataset(projectId));
  },
  createBoardItem(projectId: string, input: CreateBoardItemInput): DeliveryBoardItem {
    const dataset = getDataset(projectId);
    const item: DeliveryBoardItem = {
      id: nextId(`${projectId}-board`),
      projectId: dataset.project.id,
      title: input.title,
      summary: input.summary ?? null,
      type: input.type,
      status: input.status ?? "backlog",
      priority: input.priority,
      owner: input.owner,
      linkedIssueNumber: null,
      linkedPullRequestNumber: null,
      linkedBranch: input.linkedBranch ?? null,
      linkedReleaseTag: null,
      impact: {
        product: "Impacto ainda em monitoramento.",
        revenue: "Sem sinal suficiente ate o primeiro deploy.",
        engineering: input.linkedBranch ? `Branch ${input.linkedBranch} aberta.` : "Aguardando branch tecnica.",
        tone: "neutral",
      },
      etaLabel: "Novo card",
      updatedAt: NOW.toISOString(),
    };

    dataset.engineering.boardItems.unshift(item);
    return clone(item);
  },
  updateBoardItem(projectId: string, itemId: string, input: UpdateBoardItemInput): DeliveryBoardItem {
    const dataset = getDataset(projectId);
    const index = dataset.engineering.boardItems.findIndex((item) => item.id === itemId);

    if (index === -1) {
      throw new Error("Board item not found");
    }

    const current = dataset.engineering.boardItems[index];
    dataset.engineering.boardItems[index] = {
      ...current,
      ...input,
      impact:
        input.status === "released"
          ? {
              ...current.impact,
              engineering: "Publicado e monitorando impacto em producao.",
              tone: "positive",
            }
          : current.impact,
      updatedAt: NOW.toISOString(),
    };

    return clone(dataset.engineering.boardItems[index]);
  },
  updateProjectSettings(projectId: string, input: Partial<ProjectSettings>) {
    const dataset = getDataset(projectId);
    dataset.settings = { ...dataset.settings, ...input };
    dataset.project.website = dataset.settings.website;
    dataset.project.updatedAt = NOW.toISOString();
    return clone(dataset.settings);
  },
};

