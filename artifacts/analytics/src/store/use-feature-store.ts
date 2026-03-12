import { create } from "zustand";
import { dashboardClient } from "@/lib/http/client";
import type {
  Alert,
  FeatureFlag,
  InsightsResponse,
} from "@/lib/data/types";

interface FeatureStore {
  flagsByProject: Record<string, FeatureFlag[]>;
  insightsByProject: Record<string, InsightsResponse>;
  alertsByProject: Record<string, Alert[]>;
  loading: Record<string, boolean>;
  loadFlags: (projectId: string) => Promise<FeatureFlag[]>;
  createFlag: (projectId: string, data: Parameters<typeof dashboardClient.feature.createFlag>[1]) => Promise<FeatureFlag>;
  updateFlag: (projectId: string, flagId: string, data: Partial<FeatureFlag>) => Promise<FeatureFlag>;
  deleteFlag: (projectId: string, flagId: string) => Promise<void>;
  loadInsights: (projectId: string) => Promise<InsightsResponse>;
  loadAlerts: (projectId: string) => Promise<Alert[]>;
}

export const useFeatureStore = create<FeatureStore>((set) => ({
  flagsByProject: {},
  insightsByProject: {},
  alertsByProject: {},
  loading: {},
  loadFlags: async (projectId) => {
    const key = `flags:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const flags = await dashboardClient.feature.flags(projectId);
    set((state) => ({
      flagsByProject: { ...state.flagsByProject, [projectId]: flags },
      loading: { ...state.loading, [key]: false },
    }));
    return flags;
  },
  createFlag: async (projectId, data) => {
    const flag = await dashboardClient.feature.createFlag(projectId, data);
    set((state) => ({
      flagsByProject: { ...state.flagsByProject, [projectId]: [flag, ...(state.flagsByProject[projectId] ?? [])] },
    }));
    return flag;
  },
  updateFlag: async (projectId, flagId, data) => {
    const flag = await dashboardClient.feature.updateFlag(projectId, flagId, data);
    set((state) => ({
      flagsByProject: {
        ...state.flagsByProject,
        [projectId]: (state.flagsByProject[projectId] ?? []).map((item) =>
          item.id === flagId ? flag : item,
        ),
      },
    }));
    return flag;
  },
  deleteFlag: async (projectId, flagId) => {
    await dashboardClient.feature.deleteFlag(projectId, flagId);
    set((state) => ({
      flagsByProject: {
        ...state.flagsByProject,
        [projectId]: (state.flagsByProject[projectId] ?? []).filter((item) => item.id !== flagId),
      },
    }));
  },
  loadInsights: async (projectId) => {
    const key = `insights:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const insights = await dashboardClient.feature.insights(projectId);
    set((state) => ({
      insightsByProject: { ...state.insightsByProject, [projectId]: insights },
      loading: { ...state.loading, [key]: false },
    }));
    return insights;
  },
  loadAlerts: async (projectId) => {
    const key = `alerts:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const alerts = await dashboardClient.feature.alerts(projectId);
    set((state) => ({
      alertsByProject: { ...state.alertsByProject, [projectId]: alerts },
      loading: { ...state.loading, [key]: false },
    }));
    return alerts;
  },
}));
