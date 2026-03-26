import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectsStore } from "@/store/use-projects-store";
import { useProductStore } from "@/store/use-product-store";
import { useRevenueStore } from "@/store/use-revenue-store";
import { useFeatureStore } from "@/store/use-feature-store";
import { useOperationsStore } from "@/store/use-operations-store";
import { useEngineeringStore } from "@/store/use-engineering-store";
import { useTelemetryStore } from "@/store/use-telemetry-store";
import type {
  CreateBoardItemInput,
  CreateFeatureFlagInput,
  CreateProjectInput,
  DeliveryBoardItem,
  Experiment,
  FeatureFlag,
  Funnel,
  FunnelStep,
  ProjectSettings,
  ProjectSummary,
  UpdateBoardItemInput,
} from "./types";
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
  UpdateCollectionInput,
  ViewDefinition,
} from "@/lib/telemetry/types";

type QueryOptions = {
  query?: {
    enabled?: boolean;
    refetchInterval?: number;
  };
};

type MutationOptions<TResult> = {
  mutation?: {
    onSuccess?: (result: TResult) => void;
    onError?: (error: unknown) => void;
  };
};

function useQueryEffect(enabled: boolean, action: () => Promise<unknown>, deps: unknown[], interval?: number) {
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    if (!enabled) return;
    void actionRef.current();
  }, [enabled, ...deps]);

  useEffect(() => {
    if (!enabled || !interval) return;
    const handle = window.setInterval(() => {
      void actionRef.current();
    }, interval);
    return () => window.clearInterval(handle);
  }, [enabled, interval]);
}

function useMutationBridge<TArgs, TResult>(
  action: (args: TArgs) => Promise<TResult>,
  options?: MutationOptions<TResult>,
) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (args: TArgs) => {
    setIsPending(true);
    try {
      const result = await action(args);
      options?.mutation?.onSuccess?.(result);
      return result;
    } catch (error) {
      options?.mutation?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutateAsync,
    mutate: (args: TArgs) => {
      void mutateAsync(args);
    },
  };
}

export function useListProjects() {
  const data = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const hydrate = useProjectsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { data, isLoading, refetch: hydrate };
}

export function useCreateProject(options?: MutationOptions<ProjectSummary>) {
  const createProject = useProjectsStore((state) => state.createProject);
  return useMutationBridge<{ data: CreateProjectInput }, ProjectSummary>(
    ({ data }) => createProject(data),
    options,
  );
}

export function useGetProjectSettings(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useProjectsStore((state) => (projectId ? state.settingsByProject[projectId] : undefined));
  const isLoading = useProjectsStore((state) => Boolean(projectId && state.isSettingsLoading[projectId]));
  const loadSettings = useProjectsStore((state) => state.loadSettings);

  useQueryEffect(enabled, () => loadSettings(projectId), [enabled, loadSettings, projectId]);

  return { data, isLoading, refetch: () => loadSettings(projectId) };
}

export function useUpdateProjectSettings(options?: MutationOptions<ProjectSettings>) {
  const updateSettings = useProjectsStore((state) => state.updateSettings);
  return useMutationBridge<{ projectId: string; data: Partial<ProjectSettings> }, ProjectSettings>(
    ({ projectId, data }) => updateSettings(projectId, data),
    options,
  );
}

export function useGetAnalyticsOverview(projectId: string, _params?: unknown, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useProductStore((state) => (projectId ? state.overviewByProject[projectId] : undefined));
  const isLoading = useProductStore((state) => Boolean(projectId && state.loading[`overview:${projectId}`]));
  const loadOverview = useProductStore((state) => state.loadOverview);

  useQueryEffect(enabled, () => loadOverview(projectId), [enabled, loadOverview, projectId]);

  return { data, isLoading, refetch: () => loadOverview(projectId) };
}

export function useListEvents(projectId: string, params: { limit?: number; offset?: number; eventName?: string; sessionId?: string; userId?: string } = {}, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const interval = options?.query?.refetchInterval;
  const key = useMemo(() => JSON.stringify(params), [params]);
  const data = useProductStore((state) => (projectId ? state.eventsByProject[projectId] : undefined));
  const isLoading = useProductStore((state) => Boolean(projectId && state.loading[`events:${projectId}`]));
  const loadEvents = useProductStore((state) => state.loadEvents);
  const action = () => loadEvents(projectId, params);

  useQueryEffect(enabled, action, [key, projectId], interval);

  return { data, isLoading, refetch: action };
}

export function useListSessions(projectId: string, params: { limit?: number; offset?: number; userId?: string } = {}, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const key = useMemo(() => JSON.stringify(params), [params]);
  const data = useProductStore((state) => (projectId ? state.sessionsByProject[projectId] : undefined));
  const isLoading = useProductStore((state) => Boolean(projectId && state.loading[`sessions:${projectId}`]));
  const loadSessions = useProductStore((state) => state.loadSessions);
  const action = () => loadSessions(projectId, params);

  useQueryEffect(enabled, action, [key, projectId]);

  return { data, isLoading, refetch: action };
}

export function useGetSession(projectId: string, sessionId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId && sessionId);
  const data = useProductStore((state) => (sessionId ? state.sessionDetailsById[sessionId] : undefined));
  const isLoading = useProductStore((state) => Boolean(sessionId && state.loading[`session:${sessionId}`]));
  const loadSessionDetail = useProductStore((state) => state.loadSessionDetail);
  const action = () => loadSessionDetail(projectId, sessionId);

  useQueryEffect(enabled, action, [projectId, sessionId]);

  return { data, isLoading, refetch: action };
}

export function useListFunnels(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useProductStore((state) => (projectId ? state.funnelsByProject[projectId] : undefined));
  const isLoading = useProductStore((state) => Boolean(projectId && state.loading[`funnels:${projectId}`]));
  const loadFunnels = useProductStore((state) => state.loadFunnels);

  useQueryEffect(enabled, () => loadFunnels(projectId), [enabled, loadFunnels, projectId]);

  return { data, isLoading, refetch: () => loadFunnels(projectId) };
}

export function useGetFunnel(projectId: string, funnelId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId && funnelId);
  const data = useProductStore((state) => (funnelId ? state.funnelDetailsById[funnelId] : undefined));
  const isLoading = useProductStore((state) => Boolean(funnelId && state.loading[`funnel:${funnelId}`]));
  const loadFunnelDetail = useProductStore((state) => state.loadFunnelDetail);
  const action = () => loadFunnelDetail(projectId, funnelId);

  useQueryEffect(enabled, action, [projectId, funnelId]);

  return { data, isLoading, refetch: action };
}

export function useCreateFunnel(options?: MutationOptions<Funnel>) {
  const createFunnel = useProductStore((state) => state.createFunnel);
  return useMutationBridge<
    { projectId: string; data: { name: string; description?: string; steps: FunnelStep[] } },
    Awaited<ReturnType<typeof createFunnel>>
  >(({ projectId, data }) => createFunnel(projectId, data), options);
}

export function useListExperiments(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useProductStore((state) => (projectId ? state.experimentsByProject[projectId] : undefined));
  const isLoading = useProductStore((state) => Boolean(projectId && state.loading[`experiments:${projectId}`]));
  const loadExperiments = useProductStore((state) => state.loadExperiments);

  useQueryEffect(enabled, () => loadExperiments(projectId), [enabled, loadExperiments, projectId]);

  return { data, isLoading, refetch: () => loadExperiments(projectId) };
}

export function useCreateExperiment(options?: MutationOptions<Experiment>) {
  const createExperiment = useProductStore((state) => state.createExperiment);
  return useMutationBridge<
    {
      projectId: string;
      data: {
        name: string;
        description?: string;
        hypothesis?: string;
        metric?: string;
        targetSampleSize?: number;
        variants: Experiment["variants"];
      };
    },
    Experiment
  >(({ projectId, data }) => createExperiment(projectId, data), options);
}

export function useGetExperiment(projectId: string, experimentId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId && experimentId);
  const data = useProductStore((state) => (experimentId ? state.experimentDetailsById[experimentId] : undefined));
  const isLoading = useProductStore((state) => Boolean(experimentId && state.loading[`experiment:${experimentId}`]));
  const loadExperimentDetail = useProductStore((state) => state.loadExperimentDetail);
  const action = () => loadExperimentDetail(projectId, experimentId);

  useQueryEffect(enabled, action, [projectId, experimentId]);

  return { data, isLoading, refetch: action };
}

export function useUpdateExperiment(options?: MutationOptions<Experiment>) {
  const updateExperiment = useProductStore((state) => state.updateExperiment);
  return useMutationBridge<{ projectId: string; experimentId: string; data: Partial<Experiment> }, Experiment>(
    ({ projectId, experimentId, data }) => updateExperiment(projectId, experimentId, data),
    options,
  );
}

export function useGetRevenueMetrics(projectId: string, _params?: unknown, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useRevenueStore((state) => (projectId ? state.metricsByProject[projectId] : undefined));
  const isLoading = useRevenueStore((state) => Boolean(projectId && state.loading[`metrics:${projectId}`]));
  const loadMetrics = useRevenueStore((state) => state.loadMetrics);

  useQueryEffect(enabled, () => loadMetrics(projectId), [enabled, loadMetrics, projectId]);

  return { data, isLoading, refetch: () => loadMetrics(projectId) };
}

export function useGetRevenueTimeline(projectId: string, _params?: unknown, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useRevenueStore((state) => (projectId ? state.timelineByProject[projectId] : undefined));
  const isLoading = useRevenueStore((state) => Boolean(projectId && state.loading[`timeline:${projectId}`]));
  const loadTimeline = useRevenueStore((state) => state.loadTimeline);

  useQueryEffect(enabled, () => loadTimeline(projectId), [enabled, loadTimeline, projectId]);

  return { data, isLoading, refetch: () => loadTimeline(projectId) };
}

export function useGetRevenuePlans(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useRevenueStore((state) => (projectId ? state.plansByProject[projectId] : undefined));
  const isLoading = useRevenueStore((state) => Boolean(projectId && state.loading[`plans:${projectId}`]));
  const loadPlans = useRevenueStore((state) => state.loadPlans);

  useQueryEffect(enabled, () => loadPlans(projectId), [enabled, loadPlans, projectId]);

  return { data, isLoading, refetch: () => loadPlans(projectId) };
}

export function useListRevenueEvents(projectId: string, params: { type?: string; limit?: number; offset?: number } = {}, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const key = useMemo(() => JSON.stringify(params), [params]);
  const data = useRevenueStore((state) => (projectId ? state.eventsByProject[projectId] : undefined));
  const isLoading = useRevenueStore((state) => Boolean(projectId && state.loading[`revenue-events:${projectId}`]));
  const loadRevenueEvents = useRevenueStore((state) => state.loadRevenueEvents);
  const action = () => loadRevenueEvents(projectId, params);

  useQueryEffect(enabled, action, [key, projectId]);

  return { data, isLoading, refetch: action };
}

export function useListCustomers(projectId: string, params: { limit?: number; offset?: number; search?: string; status?: string } = {}, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const key = useMemo(() => JSON.stringify(params), [params]);
  const data = useRevenueStore((state) => (projectId ? state.customersByProject[projectId] : undefined));
  const isLoading = useRevenueStore((state) => Boolean(projectId && state.loading[`customers:${projectId}`]));
  const loadCustomers = useRevenueStore((state) => state.loadCustomers);
  const action = () => loadCustomers(projectId, params);

  useQueryEffect(enabled, action, [key, projectId]);

  return { data, isLoading, refetch: action };
}

export function useListFeatureFlags(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useFeatureStore((state) => (projectId ? state.flagsByProject[projectId] : undefined));
  const isLoading = useFeatureStore((state) => Boolean(projectId && state.loading[`flags:${projectId}`]));
  const loadFlags = useFeatureStore((state) => state.loadFlags);

  useQueryEffect(enabled, () => loadFlags(projectId), [enabled, loadFlags, projectId]);

  return { data, isLoading, refetch: () => loadFlags(projectId) };
}

export function useCreateFeatureFlag(options?: MutationOptions<FeatureFlag>) {
  const createFlag = useFeatureStore((state) => state.createFlag);
  return useMutationBridge<{ projectId: string; data: CreateFeatureFlagInput }, FeatureFlag>(
    ({ projectId, data }) => createFlag(projectId, data),
    options,
  );
}

export function useUpdateFeatureFlag(options?: MutationOptions<FeatureFlag>) {
  const updateFlag = useFeatureStore((state) => state.updateFlag);
  return useMutationBridge<{ projectId: string; flagId: string; data: Partial<FeatureFlag> }, FeatureFlag>(
    ({ projectId, flagId, data }) => updateFlag(projectId, flagId, data),
    options,
  );
}

export function useDeleteFeatureFlag(options?: MutationOptions<void>) {
  const deleteFlag = useFeatureStore((state) => state.deleteFlag);
  return useMutationBridge<{ projectId: string; flagId: string }, void>(
    ({ projectId, flagId }) => deleteFlag(projectId, flagId),
    options,
  );
}

export function useGetInsights(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useFeatureStore((state) => (projectId ? state.insightsByProject[projectId] : undefined));
  const isLoading = useFeatureStore((state) => Boolean(projectId && state.loading[`insights:${projectId}`]));
  const loadInsights = useFeatureStore((state) => state.loadInsights);

  useQueryEffect(enabled, () => loadInsights(projectId), [enabled, loadInsights, projectId]);

  return { data, isLoading, refetch: () => loadInsights(projectId) };
}

export function useGetAlerts(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useFeatureStore((state) => (projectId ? state.alertsByProject[projectId] : undefined));
  const isLoading = useFeatureStore((state) => Boolean(projectId && state.loading[`alerts:${projectId}`]));
  const loadAlerts = useFeatureStore((state) => state.loadAlerts);

  useQueryEffect(enabled, () => loadAlerts(projectId), [enabled, loadAlerts, projectId]);

  return { data, isLoading, refetch: () => loadAlerts(projectId) };
}

export function useListLogs(projectId: string, params: { search?: string; level?: string; limit?: number; offset?: number } = {}, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const key = useMemo(() => JSON.stringify(params), [params]);
  const data = useOperationsStore((state) => (projectId ? state.logsByProject[projectId] : undefined));
  const isLoading = useOperationsStore((state) => Boolean(projectId && state.loading[`logs:${projectId}`]));
  const loadLogs = useOperationsStore((state) => state.loadLogs);
  const action = () => loadLogs(projectId, params);

  useQueryEffect(enabled, action, [key, projectId]);

  return { data, isLoading, refetch: action };
}

export function useListRequests(projectId: string, params: { method?: string; statusCode?: number; limit?: number; offset?: number } = {}, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const key = useMemo(() => JSON.stringify(params), [params]);
  const data = useOperationsStore((state) => (projectId ? state.requestsByProject[projectId] : undefined));
  const isLoading = useOperationsStore((state) => Boolean(projectId && state.loading[`requests:${projectId}`]));
  const loadRequests = useOperationsStore((state) => state.loadRequests);
  const action = () => loadRequests(projectId, params);

  useQueryEffect(enabled, action, [key, projectId]);

  return { data, isLoading, refetch: action };
}

export function useListDatastoreCollections(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useOperationsStore((state) => (projectId ? state.collectionsByProject[projectId] : undefined));
  const isLoading = useOperationsStore((state) => Boolean(projectId && state.loading[`collections:${projectId}`]));
  const loadCollections = useOperationsStore((state) => state.loadCollections);

  useQueryEffect(enabled, () => loadCollections(projectId), [enabled, loadCollections, projectId]);

  return { data, isLoading, refetch: () => loadCollections(projectId) };
}

export function useQueryDatastore(projectId: string, collection: string, params: { limit?: number; offset?: number } = {}, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId && collection);
  const queryKey = `records:${projectId}:${collection}`;
  const key = useMemo(() => JSON.stringify(params), [params]);
  const data = useOperationsStore((state) => state.recordsByCollection[queryKey]);
  const isLoading = useOperationsStore((state) => Boolean(state.loading[queryKey]));
  const loadRecords = useOperationsStore((state) => state.loadRecords);
  const action = () => loadRecords(projectId, collection, params);

  useQueryEffect(enabled, action, [collection, key, projectId]);

  return { data, isLoading, refetch: action };
}

export function useInsertDatastoreRecord(options?: MutationOptions<void>) {
  const insertRecord = useOperationsStore((state) => state.insertRecord);
  return useMutationBridge<{ projectId: string; collection: string; data: { data: Record<string, unknown> } }, void>(
    ({ projectId, collection, data }) => insertRecord(projectId, collection, data.data),
    options,
  );
}

export function useListDashboards(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useOperationsStore((state) => (projectId ? state.dashboardsByProject[projectId] : undefined));
  const isLoading = useOperationsStore((state) => Boolean(projectId && state.loading[`dashboards:${projectId}`]));
  const loadDashboards = useOperationsStore((state) => state.loadDashboards);

  useQueryEffect(enabled, () => loadDashboards(projectId), [enabled, loadDashboards, projectId]);

  return { data, isLoading, refetch: () => loadDashboards(projectId) };
}

export function useGetEngineeringOverview(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useEngineeringStore((state) => (projectId ? state.overviewByProject[projectId] : undefined));
  const isLoading = useEngineeringStore((state) => Boolean(projectId && state.loading[`engineering-overview:${projectId}`]));
  const loadOverview = useEngineeringStore((state) => state.loadOverview);

  useQueryEffect(enabled, () => loadOverview(projectId), [enabled, loadOverview, projectId]);

  return { data, isLoading, refetch: () => loadOverview(projectId) };
}

export function useGetDeliveryBoard(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useEngineeringStore((state) => (projectId ? state.boardByProject[projectId] : undefined));
  const isLoading = useEngineeringStore((state) => Boolean(projectId && state.loading[`engineering-board:${projectId}`]));
  const loadBoard = useEngineeringStore((state) => state.loadBoard);

  useQueryEffect(enabled, () => loadBoard(projectId), [enabled, loadBoard, projectId]);

  return { data, isLoading, refetch: () => loadBoard(projectId) };
}

export function useCreateBoardItem(options?: MutationOptions<DeliveryBoardItem>) {
  const createBoardItem = useEngineeringStore((state) => state.createBoardItem);
  return useMutationBridge<{ projectId: string; data: CreateBoardItemInput }, DeliveryBoardItem>(
    ({ projectId, data }) => createBoardItem(projectId, data),
    options,
  );
}

export function useUpdateBoardItem(options?: MutationOptions<DeliveryBoardItem>) {
  const updateBoardItem = useEngineeringStore((state) => state.updateBoardItem);
  return useMutationBridge<
    { projectId: string; itemId: string; data: UpdateBoardItemInput },
    DeliveryBoardItem
  >(({ projectId, itemId, data }) => updateBoardItem(projectId, itemId, data), options);
}

export function useListCollectionDefinitions(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useTelemetryStore((state) => (projectId ? state.collectionsByProject[projectId] : undefined));
  const isLoading = useTelemetryStore((state) => Boolean(projectId && state.loading[`telemetry-collections:${projectId}`]));
  const loadCollections = useTelemetryStore((state) => state.loadCollections);

  useQueryEffect(enabled, () => loadCollections(projectId), [enabled, loadCollections, projectId]);

  return { data, isLoading, refetch: () => loadCollections(projectId) };
}

export function useCreateCollectionDefinition(options?: MutationOptions<CollectionDefinition>) {
  const createCollection = useTelemetryStore((state) => state.createCollection);
  return useMutationBridge<{ projectId: string; data: CreateCollectionInput }, CollectionDefinition>(
    ({ projectId, data }) => createCollection(projectId, data),
    options,
  );
}

export function useUpdateCollectionDefinition(options?: MutationOptions<CollectionDefinition>) {
  const updateCollection = useTelemetryStore((state) => state.updateCollection);
  return useMutationBridge<
    { projectId: string; collectionId: string; data: UpdateCollectionInput },
    CollectionDefinition
  >(({ projectId, collectionId, data }) => updateCollection(projectId, collectionId, data), options);
}

export function useValidateCollectionPayload(options?: MutationOptions<CollectionValidationResult>) {
  const validateCollection = useTelemetryStore((state) => state.validateCollection);
  return useMutationBridge<
    { projectId: string; collectionSlug: string; payload: Record<string, unknown> },
    CollectionValidationResult
  >(({ projectId, collectionSlug, payload }) => validateCollection(projectId, collectionSlug, payload), options);
}

export function useIngestCollectionRecords(options?: MutationOptions<CollectionIngestResponse>) {
  const ingestCollection = useTelemetryStore((state) => state.ingestCollection);
  return useMutationBridge<
    { projectId: string; collectionSlug: string; payloads: Record<string, unknown>[] },
    CollectionIngestResponse
  >(({ projectId, collectionSlug, payloads }) => ingestCollection(projectId, collectionSlug, payloads), options);
}

export function useListCollectionRecords(
  projectId: string,
  collectionSlug: string,
  params: { limit?: number; offset?: number } = {},
  options?: QueryOptions,
) {
  const enabled = options?.query?.enabled ?? Boolean(projectId && collectionSlug);
  const queryKey = `${projectId}:${collectionSlug}`;
  const key = useMemo(() => JSON.stringify(params), [params]);
  const data = useTelemetryStore((state) => state.collectionRecordsByKey[queryKey]);
  const isLoading = useTelemetryStore((state) => Boolean(state.loading[`telemetry-records:${queryKey}`]));
  const loadRecords = useTelemetryStore((state) => state.loadCollectionRecords);
  const action = () => loadRecords(projectId, collectionSlug, params);

  useQueryEffect(enabled, action, [projectId, collectionSlug, key]);

  return { data, isLoading, refetch: action };
}

export function useGetCollectionSnippets(projectId: string, collectionSlug: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId && collectionSlug);
  const key = `${projectId}:${collectionSlug}`;
  const data = useTelemetryStore((state) => state.snippetsByKey[key]);
  const isLoading = useTelemetryStore((state) => false);
  const loadSnippets = useTelemetryStore((state) => state.loadSnippets);

  useQueryEffect(enabled, () => loadSnippets(projectId, collectionSlug), [enabled, loadSnippets, projectId, collectionSlug]);

  return { data, isLoading, refetch: () => loadSnippets(projectId, collectionSlug) };
}

export function useListMetricDefinitions(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useTelemetryStore((state) => (projectId ? state.metricsByProject[projectId] : undefined));
  const isLoading = useTelemetryStore((state) => Boolean(projectId && state.loading[`telemetry-metrics:${projectId}`]));
  const loadMetrics = useTelemetryStore((state) => state.loadMetrics);

  useQueryEffect(enabled, () => loadMetrics(projectId), [enabled, loadMetrics, projectId]);

  return { data, isLoading, refetch: () => loadMetrics(projectId) };
}

export function useCreateMetricDefinition(options?: MutationOptions<MetricDefinition>) {
  const createMetric = useTelemetryStore((state) => state.createMetric);
  return useMutationBridge<{ projectId: string; data: CreateMetricInput }, MetricDefinition>(
    ({ projectId, data }) => createMetric(projectId, data),
    options,
  );
}

export function useGetMaterializedMetrics(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useTelemetryStore((state) => (projectId ? state.materializedMetricsByProject[projectId] : undefined));
  const isLoading = useTelemetryStore((state) => Boolean(projectId && state.loading[`telemetry-materialized-metrics:${projectId}`]));
  const loadMaterialized = useTelemetryStore((state) => state.loadMaterializedMetrics);

  useQueryEffect(enabled, () => loadMaterialized(projectId), [enabled, loadMaterialized, projectId]);

  return { data, isLoading, refetch: () => loadMaterialized(projectId) };
}

export function useListModelDefinitions(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useTelemetryStore((state) => (projectId ? state.modelsByProject[projectId] : undefined));
  const isLoading = useTelemetryStore((state) => Boolean(projectId && state.loading[`telemetry-models:${projectId}`]));
  const loadModels = useTelemetryStore((state) => state.loadModels);

  useQueryEffect(enabled, () => loadModels(projectId), [enabled, loadModels, projectId]);

  return { data, isLoading, refetch: () => loadModels(projectId) };
}

export function useCreateModelDefinition(options?: MutationOptions<ModelDefinition>) {
  const createModel = useTelemetryStore((state) => state.createModel);
  return useMutationBridge<{ projectId: string; data: CreateModelInput }, ModelDefinition>(
    ({ projectId, data }) => createModel(projectId, data),
    options,
  );
}

export function useGetMaterializedDatasets(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useTelemetryStore((state) => (projectId ? state.materializedDatasetsByProject[projectId] : undefined));
  const isLoading = useTelemetryStore((state) => Boolean(projectId && state.loading[`telemetry-materialized-datasets:${projectId}`]));
  const loadDatasets = useTelemetryStore((state) => state.loadMaterializedDatasets);

  useQueryEffect(enabled, () => loadDatasets(projectId), [enabled, loadDatasets, projectId]);

  return { data, isLoading, refetch: () => loadDatasets(projectId) };
}

export function useListViewDefinitions(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useTelemetryStore((state) => (projectId ? state.viewsByProject[projectId] : undefined));
  const isLoading = useTelemetryStore((state) => Boolean(projectId && state.loading[`telemetry-views:${projectId}`]));
  const loadViews = useTelemetryStore((state) => state.loadViews);

  useQueryEffect(enabled, () => loadViews(projectId), [enabled, loadViews, projectId]);

  return { data, isLoading, refetch: () => loadViews(projectId) };
}

export function useCreateViewDefinition(options?: MutationOptions<ViewDefinition>) {
  const createView = useTelemetryStore((state) => state.createView);
  return useMutationBridge<{ projectId: string; data: CreateViewInput }, ViewDefinition>(
    ({ projectId, data }) => createView(projectId, data),
    options,
  );
}

export function useGetViewPreviews(projectId: string, options?: QueryOptions) {
  const enabled = options?.query?.enabled ?? Boolean(projectId);
  const data = useTelemetryStore((state) => (projectId ? state.viewPreviewsByProject[projectId] : undefined));
  const isLoading = useTelemetryStore((state) => Boolean(projectId && state.loading[`telemetry-view-previews:${projectId}`]));
  const loadPreviews = useTelemetryStore((state) => state.loadViewPreviews);

  useQueryEffect(enabled, () => loadPreviews(projectId), [enabled, loadPreviews, projectId]);

  return { data, isLoading, refetch: () => loadPreviews(projectId) };
}
