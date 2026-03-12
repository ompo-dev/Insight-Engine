import { apiClient } from "./axios";
import { mockDatabase } from "@/lib/data/mock-database";
import type {
  CreateFeatureFlagInput,
  CreateProjectInput,
  Experiment,
  FeatureFlag,
  FunnelStep,
  ProjectSettings,
} from "@/lib/data/types";

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
};
