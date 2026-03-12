import type {
  CustomerListResponse,
  DatastoreQueryResponse,
  EventListResponse,
  Experiment,
  FeatureFlag,
  ProjectSettings,
  SessionDetail,
  SessionListResponse,
} from "./types";
import { createEmptyDataset, createInitialDatabase, NOW, type ProjectDataset, type ProjectRecord } from "./mock-seed";
import {
  buildAlerts,
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
  updateProjectSettings(projectId: string, input: Partial<ProjectSettings>) {
    const dataset = getDataset(projectId);
    dataset.settings = { ...dataset.settings, ...input };
    dataset.project.website = dataset.settings.website;
    dataset.project.updatedAt = NOW.toISOString();
    return clone(dataset.settings);
  },
};
