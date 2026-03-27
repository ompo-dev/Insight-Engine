import { create } from "zustand";
import { dashboardClient } from "@/lib/http/client";
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

interface TelemetryStore {
  collectionsByProject: Record<string, CollectionDefinition[]>;
  collectionRecordsByKey: Record<string, CollectionRecordListResponse>;
  snippetsByKey: Record<string, TelemetrySnippetBundle>;
  metricsByProject: Record<string, MetricDefinition[]>;
  materializedMetricsByProject: Record<string, Record<string, MaterializedMetric>>;
  modelsByProject: Record<string, ModelDefinition[]>;
  materializedDatasetsByProject: Record<string, Record<string, MaterializedDataset>>;
  viewsByProject: Record<string, ViewDefinition[]>;
  viewPreviewsByProject: Record<string, Record<string, TelemetryViewPreview>>;
  loading: Record<string, boolean>;
  loadCollections: (projectId: string) => Promise<CollectionDefinition[]>;
  createCollection: (projectId: string, data: CreateCollectionInput) => Promise<CollectionDefinition>;
  updateCollection: (projectId: string, collectionId: string, data: UpdateCollectionInput) => Promise<CollectionDefinition>;
  validateCollection: (projectId: string, collectionSlug: string, payload: Record<string, unknown>) => Promise<CollectionValidationResult>;
  ingestCollection: (projectId: string, collectionSlug: string, payloads: Record<string, unknown>[]) => Promise<CollectionIngestResponse>;
  loadCollectionRecords: (projectId: string, collectionSlug: string, params?: { limit?: number; offset?: number }) => Promise<CollectionRecordListResponse>;
  loadSnippets: (projectId: string, collectionSlug: string) => Promise<TelemetrySnippetBundle>;
  loadMetrics: (projectId: string) => Promise<MetricDefinition[]>;
  createMetric: (projectId: string, data: CreateMetricInput) => Promise<MetricDefinition>;
  updateMetric: (projectId: string, metricId: string, data: Partial<CreateMetricInput>) => Promise<MetricDefinition>;
  loadMaterializedMetrics: (projectId: string) => Promise<Record<string, MaterializedMetric>>;
  loadModels: (projectId: string) => Promise<ModelDefinition[]>;
  createModel: (projectId: string, data: CreateModelInput) => Promise<ModelDefinition>;
  updateModel: (projectId: string, modelId: string, data: Partial<CreateModelInput>) => Promise<ModelDefinition>;
  loadMaterializedDatasets: (projectId: string) => Promise<Record<string, MaterializedDataset>>;
  loadViews: (projectId: string) => Promise<ViewDefinition[]>;
  createView: (projectId: string, data: CreateViewInput) => Promise<ViewDefinition>;
  updateView: (projectId: string, viewId: string, data: Partial<CreateViewInput>) => Promise<ViewDefinition>;
  loadViewPreviews: (projectId: string) => Promise<Record<string, TelemetryViewPreview>>;
}

function setLoading(setter: (fn: (state: TelemetryStore) => Partial<TelemetryStore>) => void, key: string, value: boolean) {
  setter((state) => ({ loading: { ...state.loading, [key]: value } }));
}

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  collectionsByProject: {},
  collectionRecordsByKey: {},
  snippetsByKey: {},
  metricsByProject: {},
  materializedMetricsByProject: {},
  modelsByProject: {},
  materializedDatasetsByProject: {},
  viewsByProject: {},
  viewPreviewsByProject: {},
  loading: {},
  loadCollections: async (projectId) => {
    const key = `telemetry-collections:${projectId}`;
    setLoading(set, key, true);
    const data = await dashboardClient.telemetry.collections(projectId);
    set((state) => ({
      collectionsByProject: { ...state.collectionsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  createCollection: async (projectId, data) => {
    const created = await dashboardClient.telemetry.createCollection(projectId, data);
    const collections = await dashboardClient.telemetry.collections(projectId);
    set((state) => ({
      collectionsByProject: { ...state.collectionsByProject, [projectId]: collections },
    }));
    return created;
  },
  updateCollection: async (projectId, collectionId, data) => {
    const updated = await dashboardClient.telemetry.updateCollection(projectId, collectionId, data);
    const collections = await dashboardClient.telemetry.collections(projectId);
    set((state) => ({
      collectionsByProject: { ...state.collectionsByProject, [projectId]: collections },
    }));
    return updated;
  },
  validateCollection: (projectId, collectionSlug, payload) =>
    dashboardClient.telemetry.validateCollectionPayload(projectId, collectionSlug, payload),
  ingestCollection: async (projectId, collectionSlug, payloads) => {
    const result = await dashboardClient.telemetry.ingestCollectionRecords(projectId, collectionSlug, payloads);
    const [collections, records, metrics, datasets] = await Promise.all([
      dashboardClient.telemetry.collections(projectId),
      dashboardClient.telemetry.collectionRecords(projectId, collectionSlug, { limit: 12 }),
      dashboardClient.telemetry.materializedMetrics(projectId),
      dashboardClient.telemetry.materializedDatasets(projectId),
    ]);
    set((state) => ({
      collectionsByProject: { ...state.collectionsByProject, [projectId]: collections },
      collectionRecordsByKey: {
        ...state.collectionRecordsByKey,
        [`${projectId}:${collectionSlug}`]: records,
      },
      materializedMetricsByProject: { ...state.materializedMetricsByProject, [projectId]: metrics },
      materializedDatasetsByProject: { ...state.materializedDatasetsByProject, [projectId]: datasets },
    }));
    return result;
  },
  loadCollectionRecords: async (projectId, collectionSlug, params = {}) => {
    const key = `${projectId}:${collectionSlug}`;
    const loadingKey = `telemetry-records:${key}`;
    setLoading(set, loadingKey, true);
    const data = await dashboardClient.telemetry.collectionRecords(projectId, collectionSlug, params);
    set((state) => ({
      collectionRecordsByKey: { ...state.collectionRecordsByKey, [key]: data },
      loading: { ...state.loading, [loadingKey]: false },
    }));
    return data;
  },
  loadSnippets: async (projectId, collectionSlug) => {
    const key = `${projectId}:${collectionSlug}`;
    const data = await dashboardClient.telemetry.collectionSnippets(projectId, collectionSlug);
    set((state) => ({
      snippetsByKey: { ...state.snippetsByKey, [key]: data },
    }));
    return data;
  },
  loadMetrics: async (projectId) => {
    const key = `telemetry-metrics:${projectId}`;
    setLoading(set, key, true);
    const data = await dashboardClient.telemetry.metrics(projectId);
    set((state) => ({
      metricsByProject: { ...state.metricsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  createMetric: async (projectId, data) => {
    const created = await dashboardClient.telemetry.createMetric(projectId, data);
    const [definitions, materialized] = await Promise.all([
      dashboardClient.telemetry.metrics(projectId),
      dashboardClient.telemetry.materializedMetrics(projectId),
    ]);
    set((state) => ({
      metricsByProject: { ...state.metricsByProject, [projectId]: definitions },
      materializedMetricsByProject: { ...state.materializedMetricsByProject, [projectId]: materialized },
    }));
    return created;
  },
  updateMetric: async (projectId, metricId, data) => {
    const updated = await dashboardClient.telemetry.updateMetric(projectId, metricId, data);
    const [definitions, materialized] = await Promise.all([
      dashboardClient.telemetry.metrics(projectId),
      dashboardClient.telemetry.materializedMetrics(projectId),
    ]);
    set((state) => ({
      metricsByProject: { ...state.metricsByProject, [projectId]: definitions },
      materializedMetricsByProject: { ...state.materializedMetricsByProject, [projectId]: materialized },
    }));
    return updated;
  },
  loadMaterializedMetrics: async (projectId) => {
    const key = `telemetry-materialized-metrics:${projectId}`;
    setLoading(set, key, true);
    const data = await dashboardClient.telemetry.materializedMetrics(projectId);
    set((state) => ({
      materializedMetricsByProject: { ...state.materializedMetricsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadModels: async (projectId) => {
    const key = `telemetry-models:${projectId}`;
    setLoading(set, key, true);
    const data = await dashboardClient.telemetry.models(projectId);
    set((state) => ({
      modelsByProject: { ...state.modelsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  createModel: async (projectId, data) => {
    const created = await dashboardClient.telemetry.createModel(projectId, data);
    const [definitions, materialized] = await Promise.all([
      dashboardClient.telemetry.models(projectId),
      dashboardClient.telemetry.materializedDatasets(projectId),
    ]);
    set((state) => ({
      modelsByProject: { ...state.modelsByProject, [projectId]: definitions },
      materializedDatasetsByProject: { ...state.materializedDatasetsByProject, [projectId]: materialized },
    }));
    return created;
  },
  updateModel: async (projectId, modelId, data) => {
    const updated = await dashboardClient.telemetry.updateModel(projectId, modelId, data);
    const [definitions, materialized] = await Promise.all([
      dashboardClient.telemetry.models(projectId),
      dashboardClient.telemetry.materializedDatasets(projectId),
    ]);
    set((state) => ({
      modelsByProject: { ...state.modelsByProject, [projectId]: definitions },
      materializedDatasetsByProject: { ...state.materializedDatasetsByProject, [projectId]: materialized },
    }));
    return updated;
  },
  loadMaterializedDatasets: async (projectId) => {
    const key = `telemetry-materialized-datasets:${projectId}`;
    setLoading(set, key, true);
    const data = await dashboardClient.telemetry.materializedDatasets(projectId);
    set((state) => ({
      materializedDatasetsByProject: { ...state.materializedDatasetsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadViews: async (projectId) => {
    const key = `telemetry-views:${projectId}`;
    setLoading(set, key, true);
    const data = await dashboardClient.telemetry.views(projectId);
    set((state) => ({
      viewsByProject: { ...state.viewsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  createView: async (projectId, data) => {
    const created = await dashboardClient.telemetry.createView(projectId, data);
    const [views, previews] = await Promise.all([
      dashboardClient.telemetry.views(projectId),
      dashboardClient.telemetry.viewPreviews(projectId),
    ]);
    set((state) => ({
      viewsByProject: { ...state.viewsByProject, [projectId]: views },
      viewPreviewsByProject: { ...state.viewPreviewsByProject, [projectId]: previews },
    }));
    return created;
  },
  updateView: async (projectId, viewId, data) => {
    const updated = await dashboardClient.telemetry.updateView(projectId, viewId, data);
    const [views, previews] = await Promise.all([
      dashboardClient.telemetry.views(projectId),
      dashboardClient.telemetry.viewPreviews(projectId),
    ]);
    set((state) => ({
      viewsByProject: { ...state.viewsByProject, [projectId]: views },
      viewPreviewsByProject: { ...state.viewPreviewsByProject, [projectId]: previews },
    }));
    return updated;
  },
  loadViewPreviews: async (projectId) => {
    const key = `telemetry-view-previews:${projectId}`;
    setLoading(set, key, true);
    const data = await dashboardClient.telemetry.viewPreviews(projectId);
    set((state) => ({
      viewPreviewsByProject: { ...state.viewPreviewsByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
}));



