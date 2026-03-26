import { useMemo } from "react";
import {
  useGetAlerts,
  useGetAnalyticsOverview,
  useGetDeliveryBoard,
  useGetEngineeringOverview,
  useGetInsights,
  useGetMaterializedDatasets,
  useGetMaterializedMetrics,
  useGetProjectSettings,
  useGetRevenueMetrics,
  useGetViewPreviews,
  useListCollectionDefinitions,
  useListCustomers,
  useListDatastoreCollections,
  useListExperiments,
  useListFeatureFlags,
  useListFunnels,
  useListLogs,
  useListMetricDefinitions,
  useListModelDefinitions,
  useListProjects,
  useListRequests,
  useListRevenueEvents,
  useListViewDefinitions,
} from "@/lib/data/hooks";
import { buildTelemetryItems, composeTelemetryItems, type CustomTelemetryItemDefinition, type TelemetrySystemMetric } from "@/lib/telemetry/items";
import { decorateTelemetryNodes } from "@/lib/workspace/node-runtime";
import { useCustomItemStore } from "@/store/use-custom-item-store";

const EMPTY_CUSTOM_ITEMS: CustomTelemetryItemDefinition[] = [];

export function useWorkspaceData(projectId: string) {
  const enabled = Boolean(projectId);
  const projectsQuery = useListProjects();
  const settingsQuery = useGetProjectSettings(projectId, { query: { enabled } });
  const overviewQuery = useGetAnalyticsOverview(projectId, undefined, { query: { enabled } });
  const funnelsQuery = useListFunnels(projectId, { query: { enabled } });
  const experimentsQuery = useListExperiments(projectId, { query: { enabled } });
  const featureFlagsQuery = useListFeatureFlags(projectId, { query: { enabled } });
  const revenueMetricsQuery = useGetRevenueMetrics(projectId, undefined, { query: { enabled } });
  const customersQuery = useListCustomers(projectId, { limit: 6 }, { query: { enabled } });
  const revenueEventsQuery = useListRevenueEvents(projectId, { limit: 6 }, { query: { enabled } });
  const collectionDefinitionsQuery = useListCollectionDefinitions(projectId, { query: { enabled } });
  const metricDefinitionsQuery = useListMetricDefinitions(projectId, { query: { enabled } });
  const materializedMetricsQuery = useGetMaterializedMetrics(projectId, { query: { enabled } });
  const modelDefinitionsQuery = useListModelDefinitions(projectId, { query: { enabled } });
  const materializedDatasetsQuery = useGetMaterializedDatasets(projectId, { query: { enabled } });
  const viewDefinitionsQuery = useListViewDefinitions(projectId, { query: { enabled } });
  const viewPreviewsQuery = useGetViewPreviews(projectId, { query: { enabled } });
  const engineeringQuery = useGetEngineeringOverview(projectId, { query: { enabled } });
  const boardQuery = useGetDeliveryBoard(projectId, { query: { enabled } });
  const logsQuery = useListLogs(projectId, { limit: 8 }, { query: { enabled } });
  const requestsQuery = useListRequests(projectId, { limit: 8 }, { query: { enabled } });
  const datastoreQuery = useListDatastoreCollections(projectId, { query: { enabled } });
  const insightsQuery = useGetInsights(projectId, { query: { enabled } });
  const alertsQuery = useGetAlerts(projectId, { query: { enabled } });
  const customItemsFromStore = useCustomItemStore((state) => (projectId ? state.itemsByProject[projectId] : undefined));
  const customItems = customItemsFromStore ?? EMPTY_CUSTOM_ITEMS;

  const legacyItems = useMemo(
    () =>
      buildTelemetryItems({
        collections: collectionDefinitionsQuery.data ?? [],
        metrics: metricDefinitionsQuery.data ?? [],
        materializedMetrics: materializedMetricsQuery.data ?? {},
        models: modelDefinitionsQuery.data ?? [],
        materializedDatasets: materializedDatasetsQuery.data ?? {},
        views: viewDefinitionsQuery.data ?? [],
        viewPreviews: viewPreviewsQuery.data ?? {},
      }),
    [
      collectionDefinitionsQuery.data,
      metricDefinitionsQuery.data,
      materializedMetricsQuery.data,
      modelDefinitionsQuery.data,
      materializedDatasetsQuery.data,
      viewDefinitionsQuery.data,
      viewPreviewsQuery.data,
    ],
  );

  const systemMetrics = useMemo<TelemetrySystemMetric[]>(() => {
    const metrics: TelemetrySystemMetric[] = [];
    const revenue = revenueMetricsQuery.data;
    const overview = overviewQuery.data;
    const requests = requestsQuery.data?.requests ?? [];

    if (revenue) {
      metrics.push(
        { key: "mrr", label: "MRR", value: revenue.mrr },
        { key: "arr", label: "ARR", value: revenue.arr },
        { key: "churn_rate", label: "Churn rate", value: revenue.churnRate },
        { key: "active_customers", label: "Clientes ativos", value: revenue.activeCustomers },
      );
    }

    if (overview) {
      metrics.push(
        { key: "total_events", label: "Eventos totais", value: overview.totalEvents },
        { key: "total_sessions", label: "Sessoes totais", value: overview.totalSessions },
        { key: "unique_users", label: "Usuarios ativos", value: overview.uniqueUsers },
        { key: "bounce_rate", label: "Bounce rate", value: overview.bounceRate },
      );
    }

    metrics.push({
      key: "request_errors",
      label: "Requests com erro",
      value: requests.filter((request) => request.statusCode >= 500).length,
    });

    return metrics;
  }, [overviewQuery.data, requestsQuery.data?.requests, revenueMetricsQuery.data]);

  const items = useMemo(
    () => decorateTelemetryNodes({
      items: composeTelemetryItems({ legacyItems, customItems, systemMetrics }),
      customItems,
      systemMetrics,
    }),
    [customItems, legacyItems, systemMetrics],
  );

  return {
    projectsQuery,
    settingsQuery,
    overviewQuery,
    funnelsQuery,
    experimentsQuery,
    featureFlagsQuery,
    revenueMetricsQuery,
    customersQuery,
    revenueEventsQuery,
    collectionDefinitionsQuery,
    metricDefinitionsQuery,
    materializedMetricsQuery,
    modelDefinitionsQuery,
    materializedDatasetsQuery,
    viewDefinitionsQuery,
    viewPreviewsQuery,
    engineeringQuery,
    boardQuery,
    logsQuery,
    requestsQuery,
    datastoreQuery,
    insightsQuery,
    alertsQuery,
    items,
    systemMetrics,
    isBootstrapping:
      overviewQuery.isLoading ||
      revenueMetricsQuery.isLoading ||
      engineeringQuery.isLoading ||
      settingsQuery.isLoading ||
      collectionDefinitionsQuery.isLoading ||
      metricDefinitionsQuery.isLoading ||
      modelDefinitionsQuery.isLoading ||
      viewDefinitionsQuery.isLoading,
  };
}



