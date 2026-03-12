import { create } from "zustand";
import { dashboardClient } from "@/lib/http/client";
import type {
  AnalyticsOverview,
  EventListResponse,
  Experiment,
  ExperimentDetail,
  Funnel,
  SessionDetail,
  SessionListResponse,
} from "@/lib/data/types";

interface ProductStore {
  overviewByProject: Record<string, AnalyticsOverview>;
  eventsByProject: Record<string, EventListResponse>;
  sessionsByProject: Record<string, SessionListResponse>;
  sessionDetailsById: Record<string, SessionDetail>;
  funnelsByProject: Record<string, Funnel[]>;
  experimentsByProject: Record<string, Experiment[]>;
  experimentDetailsById: Record<string, ExperimentDetail>;
  loading: Record<string, boolean>;
  loadOverview: (projectId: string) => Promise<AnalyticsOverview>;
  loadEvents: (projectId: string, params?: Parameters<typeof dashboardClient.analytics.events>[1]) => Promise<EventListResponse>;
  loadSessions: (projectId: string, params?: Parameters<typeof dashboardClient.analytics.sessions>[1]) => Promise<SessionListResponse>;
  loadSessionDetail: (projectId: string, sessionId: string) => Promise<SessionDetail>;
  loadFunnels: (projectId: string) => Promise<Funnel[]>;
  createFunnel: (projectId: string, data: { name: string; description?: string; steps: Funnel["steps"] }) => Promise<Funnel>;
  loadExperiments: (projectId: string) => Promise<Experiment[]>;
  createExperiment: (projectId: string, data: Parameters<typeof dashboardClient.analytics.createExperiment>[1]) => Promise<Experiment>;
  loadExperimentDetail: (projectId: string, experimentId: string) => Promise<ExperimentDetail>;
  updateExperiment: (projectId: string, experimentId: string, data: Partial<Experiment>) => Promise<Experiment>;
}

export const useProductStore = create<ProductStore>((set) => ({
  overviewByProject: {},
  eventsByProject: {},
  sessionsByProject: {},
  sessionDetailsById: {},
  funnelsByProject: {},
  experimentsByProject: {},
  experimentDetailsById: {},
  loading: {},
  loadOverview: async (projectId) => {
    set((state) => ({ loading: { ...state.loading, [`overview:${projectId}`]: true } }));
    const overview = await dashboardClient.analytics.overview(projectId);
    set((state) => ({
      overviewByProject: { ...state.overviewByProject, [projectId]: overview },
      loading: { ...state.loading, [`overview:${projectId}`]: false },
    }));
    return overview;
  },
  loadEvents: async (projectId, params = {}) => {
    const key = `events:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.analytics.events(projectId, params);
    set((state) => ({
      eventsByProject: { ...state.eventsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadSessions: async (projectId, params = {}) => {
    const key = `sessions:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.analytics.sessions(projectId, params);
    set((state) => ({
      sessionsByProject: { ...state.sessionsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadSessionDetail: async (projectId, sessionId) => {
    const key = `session:${sessionId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.analytics.sessionDetail(projectId, sessionId);
    set((state) => ({
      sessionDetailsById: { ...state.sessionDetailsById, [sessionId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadFunnels: async (projectId) => {
    const key = `funnels:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.analytics.funnels(projectId);
    set((state) => ({
      funnelsByProject: { ...state.funnelsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  createFunnel: async (projectId, data) => {
    const funnel = await dashboardClient.analytics.createFunnel(projectId, data);
    set((state) => ({
      funnelsByProject: {
        ...state.funnelsByProject,
        [projectId]: [funnel, ...(state.funnelsByProject[projectId] ?? [])],
      },
    }));
    return funnel;
  },
  loadExperiments: async (projectId) => {
    const key = `experiments:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.analytics.experiments(projectId);
    set((state) => ({
      experimentsByProject: { ...state.experimentsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  createExperiment: async (projectId, data) => {
    const experiment = await dashboardClient.analytics.createExperiment(projectId, data);
    set((state) => ({
      experimentsByProject: {
        ...state.experimentsByProject,
        [projectId]: [experiment, ...(state.experimentsByProject[projectId] ?? [])],
      },
    }));
    return experiment;
  },
  loadExperimentDetail: async (projectId, experimentId) => {
    const key = `experiment:${experimentId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const detail = await dashboardClient.analytics.experimentDetail(projectId, experimentId);
    set((state) => ({
      experimentDetailsById: { ...state.experimentDetailsById, [experimentId]: detail },
      loading: { ...state.loading, [key]: false },
    }));
    return detail;
  },
  updateExperiment: async (projectId, experimentId, data) => {
    const experiment = await dashboardClient.analytics.updateExperiment(projectId, experimentId, data);
    set((state) => ({
      experimentsByProject: {
        ...state.experimentsByProject,
        [projectId]: (state.experimentsByProject[projectId] ?? []).map((item) =>
          item.id === experimentId ? experiment : item,
        ),
      },
    }));
    return experiment;
  },
}));
