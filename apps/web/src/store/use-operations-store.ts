import { create } from "zustand";
import { dashboardClient } from "@/lib/http/client";
import type {
  Dashboard,
  DatastoreCollection,
  DatastoreQueryResponse,
  LogListResponse,
  RequestListResponse,
} from "@/lib/data/types";

interface OperationsStore {
  logsByProject: Record<string, LogListResponse>;
  requestsByProject: Record<string, RequestListResponse>;
  collectionsByProject: Record<string, DatastoreCollection[]>;
  recordsByCollection: Record<string, DatastoreQueryResponse>;
  dashboardsByProject: Record<string, Dashboard[]>;
  loading: Record<string, boolean>;
  loadLogs: (projectId: string, params?: Parameters<typeof dashboardClient.operations.logs>[1]) => Promise<LogListResponse>;
  loadRequests: (projectId: string, params?: Parameters<typeof dashboardClient.operations.requests>[1]) => Promise<RequestListResponse>;
  loadCollections: (projectId: string) => Promise<DatastoreCollection[]>;
  loadRecords: (projectId: string, collection: string, params?: Parameters<typeof dashboardClient.operations.records>[2]) => Promise<DatastoreQueryResponse>;
  insertRecord: (projectId: string, collection: string, data: Record<string, unknown>) => Promise<void>;
  loadDashboards: (projectId: string) => Promise<Dashboard[]>;
}

export const useOperationsStore = create<OperationsStore>((set) => ({
  logsByProject: {},
  requestsByProject: {},
  collectionsByProject: {},
  recordsByCollection: {},
  dashboardsByProject: {},
  loading: {},
  loadLogs: async (projectId, params = {}) => {
    const key = `logs:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.operations.logs(projectId, params);
    set((state) => ({
      logsByProject: { ...state.logsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadRequests: async (projectId, params = {}) => {
    const key = `requests:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.operations.requests(projectId, params);
    set((state) => ({
      requestsByProject: { ...state.requestsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadCollections: async (projectId) => {
    const key = `collections:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.operations.collections(projectId);
    set((state) => ({
      collectionsByProject: { ...state.collectionsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadRecords: async (projectId, collection, params = {}) => {
    const key = `records:${projectId}:${collection}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.operations.records(projectId, collection, params);
    set((state) => ({
      recordsByCollection: { ...state.recordsByCollection, [key]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  insertRecord: async (projectId, collection, data) => {
    await dashboardClient.operations.insertRecord(projectId, collection, data);
    const collections = await dashboardClient.operations.collections(projectId);
    const records = await dashboardClient.operations.records(projectId, collection, { limit: 50 });
    set((state) => ({
      collectionsByProject: { ...state.collectionsByProject, [projectId]: collections },
      recordsByCollection: { ...state.recordsByCollection, [`records:${projectId}:${collection}`]: records },
    }));
  },
  loadDashboards: async (projectId) => {
    const key = `dashboards:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.operations.dashboards(projectId);
    set((state) => ({
      dashboardsByProject: { ...state.dashboardsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
}));
