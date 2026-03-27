import { create } from "zustand";
import { dashboardClient } from "@/lib/http/client";
import type {
  CustomerListResponse,
  RevenueEventListResponse,
  RevenueMetrics,
  RevenueTimeline,
  PlanRevenue,
} from "@/lib/data/types";

interface RevenueStore {
  metricsByProject: Record<string, RevenueMetrics>;
  timelineByProject: Record<string, RevenueTimeline>;
  plansByProject: Record<string, PlanRevenue[]>;
  eventsByProject: Record<string, RevenueEventListResponse>;
  customersByProject: Record<string, CustomerListResponse>;
  loading: Record<string, boolean>;
  loadMetrics: (projectId: string) => Promise<RevenueMetrics>;
  loadTimeline: (projectId: string) => Promise<RevenueTimeline>;
  loadPlans: (projectId: string) => Promise<PlanRevenue[]>;
  loadRevenueEvents: (projectId: string, params?: Parameters<typeof dashboardClient.revenue.events>[1]) => Promise<RevenueEventListResponse>;
  loadCustomers: (projectId: string, params?: Parameters<typeof dashboardClient.revenue.customers>[1]) => Promise<CustomerListResponse>;
}

export const useRevenueStore = create<RevenueStore>((set) => ({
  metricsByProject: {},
  timelineByProject: {},
  plansByProject: {},
  eventsByProject: {},
  customersByProject: {},
  loading: {},
  loadMetrics: async (projectId) => {
    const key = `metrics:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.revenue.metrics(projectId);
    set((state) => ({
      metricsByProject: { ...state.metricsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadTimeline: async (projectId) => {
    const key = `timeline:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.revenue.timeline(projectId);
    set((state) => ({
      timelineByProject: { ...state.timelineByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadPlans: async (projectId) => {
    const key = `plans:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.revenue.plans(projectId);
    set((state) => ({
      plansByProject: { ...state.plansByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadRevenueEvents: async (projectId, params = {}) => {
    const key = `revenue-events:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.revenue.events(projectId, params);
    set((state) => ({
      eventsByProject: { ...state.eventsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadCustomers: async (projectId, params = {}) => {
    const key = `customers:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.revenue.customers(projectId, params);
    set((state) => ({
      customersByProject: { ...state.customersByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
}));
