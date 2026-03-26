import { apiClient } from "./axios";
import { mockDatabase } from "@/lib/data/mock-database";
import type {
  CreateBoardItemInput,
  CreateFeatureFlagInput,
  CreateProjectInput,
  DeliveryBoardItem,
  Experiment,
  EngineeringOverview,
  FeatureFlag,
  FunnelDetail,
  FunnelStep,
  ProjectSettings,
  UpdateBoardItemInput,
} from "@/lib/data/types";
import type {
  CollectionDefinition,
  CollectionIngestResponse,
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
  TelemetryViewPreview,
  UpdateCollectionInput,
  ViewDefinition,
} from "@/lib/telemetry/types";

const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";
const MOCK_LATENCY = 180;

function wait<T>(factory: () => T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(factory()), MOCK_LATENCY);
  });
}

async function mockOrApi<T>(mockFactory: () => T, apiFactory: () => Promise<T>): Promise<T> {
  return USE_MOCKS ? wait(mockFactory) : apiFactory();
}

export const dashboardClient = {
  projects: {
    list: () =>
      mockOrApi(
        () => mockDatabase.listProjects(),
        async () => (await apiClient.get("/projects")).data,
      ),
    create: (data: CreateProjectInput) =>
      mockOrApi(
        () => mockDatabase.createProject(data),
        async () => (await apiClient.post("/projects", data)).data,
      ),
    update: (projectId: string, data: Partial<CreateProjectInput>) =>
      mockOrApi(
        () => mockDatabase.updateProject(projectId, data),
        async () => (await apiClient.patch(`/projects/${projectId}`, data)).data,
      ),
    getSettings: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.getProjectSettings(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/settings`)).data,
      ),
    updateSettings: (projectId: string, data: Partial<ProjectSettings>) =>
      mockOrApi(
        () => mockDatabase.updateProjectSettings(projectId, data),
        async () => (await apiClient.patch(`/projects/${projectId}/settings`, data)).data,
      ),
  },
  analytics: {
    overview: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.getOverview(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/analytics/overview`)).data,
      ),
    events: (projectId: string, params: { limit?: number; offset?: number; eventName?: string; sessionId?: string; userId?: string } = {}) =>
      mockOrApi(
        () => mockDatabase.listEvents(projectId, params),
        async () => (await apiClient.get(`/projects/${projectId}/events`, { params })).data,
      ),
    sessions: (projectId: string, params: { limit?: number; offset?: number; userId?: string } = {}) =>
      mockOrApi(
        () => mockDatabase.listSessions(projectId, params),
        async () => (await apiClient.get(`/projects/${projectId}/sessions`, { params })).data,
      ),
    sessionDetail: (projectId: string, sessionId: string) =>
      mockOrApi(
        () => mockDatabase.getSession(projectId, sessionId),
        async () => (await apiClient.get(`/projects/${projectId}/sessions/${sessionId}`)).data,
      ),
    funnels: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.listFunnels(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/funnels`)).data,
      ),
    funnelDetail: (projectId: string, funnelId: string): Promise<FunnelDetail> =>
      mockOrApi(
        () => mockDatabase.getFunnel(projectId, funnelId),
        async () => (await apiClient.get(`/projects/${projectId}/funnels/${funnelId}`)).data,
      ),
    createFunnel: (projectId: string, data: { name: string; description?: string; steps: FunnelStep[] }) =>
      mockOrApi(
        () => mockDatabase.createFunnel(projectId, data),
        async () => (await apiClient.post(`/projects/${projectId}/funnels`, data)).data,
      ),
    experiments: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.listExperiments(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/experiments`)).data,
      ),
    createExperiment: (
      projectId: string,
      data: { name: string; description?: string; hypothesis?: string; metric?: string; targetSampleSize?: number; variants: Experiment["variants"] },
    ) =>
      mockOrApi(
        () => mockDatabase.createExperiment(projectId, data),
        async () => (await apiClient.post(`/projects/${projectId}/experiments`, data)).data,
      ),
    experimentDetail: (projectId: string, experimentId: string) =>
      mockOrApi(
        () => mockDatabase.getExperiment(projectId, experimentId),
        async () => (await apiClient.get(`/projects/${projectId}/experiments/${experimentId}`)).data,
      ),
    updateExperiment: (projectId: string, experimentId: string, data: Partial<Experiment>) =>
      mockOrApi(
        () => mockDatabase.updateExperiment(projectId, experimentId, data),
        async () => (await apiClient.patch(`/projects/${projectId}/experiments/${experimentId}`, data)).data,
      ),
  },
  revenue: {
    metrics: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.getRevenueMetrics(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/revenue/metrics`)).data,
      ),
    timeline: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.getRevenueTimeline(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/revenue/timeline`)).data,
      ),
    plans: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.getRevenuePlans(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/revenue/plans`)).data,
      ),
    events: (projectId: string, params: { type?: string; limit?: number; offset?: number } = {}) =>
      mockOrApi(
        () => mockDatabase.listRevenueEvents(projectId, params),
        async () => (await apiClient.get(`/projects/${projectId}/revenue/events`, { params })).data,
      ),
    customers: (projectId: string, params: { limit?: number; offset?: number; search?: string; status?: string } = {}) =>
      mockOrApi(
        () => mockDatabase.listCustomers(projectId, params),
        async () => (await apiClient.get(`/projects/${projectId}/customers`, { params })).data,
      ),
  },
  feature: {
    flags: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.listFeatureFlags(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/feature-flags`)).data,
      ),
    createFlag: (projectId: string, data: CreateFeatureFlagInput) =>
      mockOrApi(
        () => mockDatabase.createFeatureFlag(projectId, data),
        async () => (await apiClient.post(`/projects/${projectId}/feature-flags`, data)).data,
      ),
    updateFlag: (projectId: string, flagId: string, data: Partial<FeatureFlag>) =>
      mockOrApi(
        () => mockDatabase.updateFeatureFlag(projectId, flagId, data),
        async () => (await apiClient.patch(`/projects/${projectId}/feature-flags/${flagId}`, data)).data,
      ),
    deleteFlag: (projectId: string, flagId: string) =>
      mockOrApi(
        () => mockDatabase.deleteFeatureFlag(projectId, flagId),
        async () => {
          await apiClient.delete(`/projects/${projectId}/feature-flags/${flagId}`);
        },
      ),
    insights: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.getInsights(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/insights`)).data,
      ),
    alerts: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.getAlerts(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/insights/alerts`)).data,
      ),
  },
  operations: {
    logs: (projectId: string, params: { search?: string; level?: string; limit?: number; offset?: number } = {}) =>
      mockOrApi(
        () => mockDatabase.listLogs(projectId, params),
        async () => (await apiClient.get(`/projects/${projectId}/logs`, { params })).data,
      ),
    requests: (projectId: string, params: { method?: string; statusCode?: number; limit?: number; offset?: number } = {}) =>
      mockOrApi(
        () => mockDatabase.listRequests(projectId, params),
        async () => (await apiClient.get(`/projects/${projectId}/requests`, { params })).data,
      ),
    collections: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.listDatastoreCollections(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/datastore`)).data,
      ),
    records: (projectId: string, collection: string, params: { limit?: number; offset?: number } = {}) =>
      mockOrApi(
        () => mockDatabase.queryDatastore(projectId, collection, params),
        async () => (await apiClient.get(`/projects/${projectId}/datastore/${collection}`, { params })).data,
      ),
    insertRecord: (projectId: string, collection: string, data: Record<string, unknown>) =>
      mockOrApi(
        () => mockDatabase.insertDatastoreRecord(projectId, collection, data),
        async () => (await apiClient.post(`/projects/${projectId}/datastore/${collection}`, { data })).data,
      ),
    dashboards: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.listDashboards(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/dashboards`)).data,
      ),
  },
  telemetry: {
    collections: (projectId: string): Promise<CollectionDefinition[]> =>
      mockOrApi(
        () => mockDatabase.listCollectionDefinitions(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/collections`)).data,
      ),
    createCollection: (projectId: string, data: CreateCollectionInput): Promise<CollectionDefinition> =>
      mockOrApi(
        () => mockDatabase.createCollectionDefinition(projectId, data),
        async () => (await apiClient.post(`/projects/${projectId}/collections`, data)).data,
      ),
    updateCollection: (
      projectId: string,
      collectionId: string,
      data: UpdateCollectionInput,
    ): Promise<CollectionDefinition> =>
      mockOrApi(
        () => mockDatabase.updateCollectionDefinition(projectId, collectionId, data),
        async () => (await apiClient.patch(`/projects/${projectId}/collections/${collectionId}`, data)).data,
      ),
    validateCollectionPayload: (
      projectId: string,
      collectionSlug: string,
      payload: Record<string, unknown>,
    ): Promise<CollectionValidationResult> =>
      mockOrApi(
        () => mockDatabase.validateCollectionRecord(projectId, collectionSlug, payload),
        async () => (await apiClient.post(`/projects/${projectId}/collections/${collectionSlug}/validate`, { payload })).data,
      ),
    ingestCollectionRecords: (
      projectId: string,
      collectionSlug: string,
      payloads: Record<string, unknown>[],
    ): Promise<CollectionIngestResponse> =>
      mockOrApi(
        () => mockDatabase.ingestCollectionRecords(projectId, collectionSlug, payloads),
        async () => (await apiClient.post(`/projects/${projectId}/collections/${collectionSlug}/ingest`, { payloads })).data,
      ),
    collectionRecords: (
      projectId: string,
      collectionSlug: string,
      params: { limit?: number; offset?: number } = {},
    ): Promise<CollectionRecordListResponse> =>
      mockOrApi(
        () => mockDatabase.listCollectionRecords(projectId, collectionSlug, params),
        async () => (await apiClient.get(`/projects/${projectId}/collections/${collectionSlug}/records`, { params })).data,
      ),
    collectionSnippets: (
      projectId: string,
      collectionSlug: string,
    ): Promise<TelemetrySnippetBundle> =>
      mockOrApi(
        () => mockDatabase.getCollectionSnippets(projectId, collectionSlug),
        async () => (await apiClient.get(`/projects/${projectId}/collections/${collectionSlug}/snippets`)).data,
      ),
    metrics: (projectId: string): Promise<MetricDefinition[]> =>
      mockOrApi(
        () => mockDatabase.listMetricDefinitions(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/metrics`)).data,
      ),
    createMetric: (projectId: string, data: CreateMetricInput): Promise<MetricDefinition> =>
      mockOrApi(
        () => mockDatabase.createMetricDefinition(projectId, data),
        async () => (await apiClient.post(`/projects/${projectId}/metrics`, data)).data,
      ),
    updateMetric: (projectId: string, metricId: string, data: Partial<CreateMetricInput>): Promise<MetricDefinition> =>
      mockOrApi(
        () => mockDatabase.updateMetricDefinition(projectId, metricId, data),
        async () => (await apiClient.patch(`/projects/${projectId}/metrics/${metricId}`, data)).data,
      ),
    materializedMetrics: (projectId: string): Promise<Record<string, MaterializedMetric>> =>
      mockOrApi(
        () => mockDatabase.listMaterializedMetrics(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/metrics/materialized`)).data,
      ),
    models: (projectId: string): Promise<ModelDefinition[]> =>
      mockOrApi(
        () => mockDatabase.listModelDefinitions(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/models`)).data,
      ),
    createModel: (projectId: string, data: CreateModelInput): Promise<ModelDefinition> =>
      mockOrApi(
        () => mockDatabase.createModelDefinition(projectId, data),
        async () => (await apiClient.post(`/projects/${projectId}/models`, data)).data,
      ),
    updateModel: (projectId: string, modelId: string, data: Partial<CreateModelInput>): Promise<ModelDefinition> =>
      mockOrApi(
        () => mockDatabase.updateModelDefinition(projectId, modelId, data),
        async () => (await apiClient.patch(`/projects/${projectId}/models/${modelId}`, data)).data,
      ),
    materializedDatasets: (projectId: string): Promise<Record<string, MaterializedDataset>> =>
      mockOrApi(
        () => mockDatabase.listMaterializedDatasets(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/models/materialized`)).data,
      ),
    views: (projectId: string): Promise<ViewDefinition[]> =>
      mockOrApi(
        () => mockDatabase.listViewDefinitions(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/views`)).data,
      ),
    createView: (projectId: string, data: CreateViewInput): Promise<ViewDefinition> =>
      mockOrApi(
        () => mockDatabase.createViewDefinition(projectId, data),
        async () => (await apiClient.post(`/projects/${projectId}/views`, data)).data,
      ),
    updateView: (projectId: string, viewId: string, data: Partial<CreateViewInput>): Promise<ViewDefinition> =>
      mockOrApi(
        () => mockDatabase.updateViewDefinition(projectId, viewId, data),
        async () => (await apiClient.patch(`/projects/${projectId}/views/${viewId}`, data)).data,
      ),
    viewPreviews: (
      projectId: string,
    ): Promise<Record<string, TelemetryViewPreview>> =>
      mockOrApi(
        () => mockDatabase.listViewPreviews(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/views/previews`)).data,
      ),
  },
  engineering: {
    overview: (projectId: string): Promise<EngineeringOverview> =>
      mockOrApi(
        () => mockDatabase.getEngineeringOverview(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/engineering`)).data,
      ),
    board: (projectId: string) =>
      mockOrApi(
        () => mockDatabase.getDeliveryBoard(projectId),
        async () => (await apiClient.get(`/projects/${projectId}/engineering/board`)).data,
      ),
    createBoardItem: (projectId: string, data: CreateBoardItemInput): Promise<DeliveryBoardItem> =>
      mockOrApi(
        () => mockDatabase.createBoardItem(projectId, data),
        async () => (await apiClient.post(`/projects/${projectId}/engineering/board`, data)).data,
      ),
    updateBoardItem: (
      projectId: string,
      itemId: string,
      data: UpdateBoardItemInput,
    ): Promise<DeliveryBoardItem> =>
      mockOrApi(
        () => mockDatabase.updateBoardItem(projectId, itemId, data),
        async () => (await apiClient.patch(`/projects/${projectId}/engineering/board/${itemId}`, data)).data,
      ),
  },
};



