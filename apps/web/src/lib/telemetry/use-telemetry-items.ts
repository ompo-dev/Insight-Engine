import type { CreateCollectionInput, CreateMetricInput, CreateModelInput, CreateViewInput } from "@/lib/telemetry/types";
import { useCreateCollectionDefinition, useCreateMetricDefinition, useCreateModelDefinition, useCreateViewDefinition } from "@/lib/data/hooks";
import { buildTelemetryItems, resolveTelemetryItem, type CreateTelemetryItemInput, type TelemetryItemDefinition } from "@/lib/telemetry/items";
import { useTelemetryStore } from "@/store/use-telemetry-store";

function resolveLegacySource(
  itemId: string | undefined,
  items: TelemetryItemDefinition[],
): { kind: "collection" | "metric"; ref: string } | null {
  if (!itemId) return null;
  const sourceItem = resolveTelemetryItem(items, itemId);
  if (!sourceItem) return null;

  if (sourceItem.mode === "capture") {
    return { kind: "collection", ref: sourceItem.slug };
  }

  if (sourceItem.mode === "value") {
    return { kind: "metric", ref: sourceItem.slug };
  }

  return null;
}

function resolveLegacyDisplaySource(
  itemId: string | undefined,
  items: TelemetryItemDefinition[],
): { kind: "collection" | "metric" | "model"; ref: string } | null {
  if (!itemId) return null;
  const sourceItem = resolveTelemetryItem(items, itemId);
  if (!sourceItem) return null;

  if (sourceItem.mode === "capture") {
    return { kind: "collection", ref: sourceItem.slug };
  }

  if (sourceItem.mode === "value") {
    return { kind: "metric", ref: sourceItem.slug };
  }

  if (sourceItem.mode === "list") {
    return { kind: "model", ref: sourceItem.slug };
  }

  return null;
}

function readItemsFromStore(projectId: string) {
  const state = useTelemetryStore.getState();
  return buildTelemetryItems({
    collections: state.collectionsByProject[projectId] ?? [],
    metrics: state.metricsByProject[projectId] ?? [],
    materializedMetrics: state.materializedMetricsByProject[projectId] ?? {},
    models: state.modelsByProject[projectId] ?? [],
    materializedDatasets: state.materializedDatasetsByProject[projectId] ?? {},
    views: state.viewsByProject[projectId] ?? [],
    viewPreviews: state.viewPreviewsByProject[projectId] ?? {},
  });
}

export function useCreateTelemetryItem(items: TelemetryItemDefinition[]) {
  const createCollection = useCreateCollectionDefinition();
  const createMetric = useCreateMetricDefinition();
  const createModel = useCreateModelDefinition();
  const createView = useCreateViewDefinition();

  const mutateAsync = async (args: { projectId: string; data: CreateTelemetryItemInput }) => {
    const { projectId, data } = args;

    if (data.shape === "capture") {
      const payload: CreateCollectionInput = {
        slug: data.slug,
        label: data.label,
        description: data.description,
        tags: data.tags,
        schema: data.input?.schema ?? { type: "object", properties: {} },
        identityKeys: data.input?.identityKeys,
        timestampField: data.input?.timestampField,
        samplePayload: data.input?.samplePayload,
      };
      await createCollection.mutateAsync({ projectId, data: payload });
    }

    if (data.shape === "value") {
      const source = resolveLegacySource(data.logic?.sourceItemId, items);
      const sources = source
        ? [{ kind: source.kind, ref: source.ref } as const]
        : data.logic?.sourceSystemMetric
          ? [{ kind: "system-metric" as const, ref: data.logic.sourceSystemMetric }]
          : [];

      if (!sources.length) {
        throw new Error("Selecione uma fonte de item ou uma metrica de sistema.");
      }

      const payload: CreateMetricInput = {
        slug: data.slug,
        label: data.label,
        description: data.description,
        tags: data.tags,
        format: data.logic?.format ?? "number",
        sources,
        dsl: data.logic?.dsl ?? { version: 1, steps: [], output: { ref: "source", shape: "metric" } },
      };
      await createMetric.mutateAsync({ projectId, data: payload });
    }

    if (data.shape === "list") {
      const source = resolveLegacySource(data.logic?.sourceItemId, items);
      if (!source) {
        throw new Error("Itens de lista precisam partir de outro item que gere dados ou valores.");
      }

      const payload: CreateModelInput = {
        slug: data.slug,
        label: data.label,
        description: data.description,
        tags: data.tags,
        sources: [{ kind: source.kind, ref: source.ref }],
        dsl: data.logic?.dsl ?? { version: 1, steps: [], output: { ref: "source", shape: "dataset" } },
      };
      await createModel.mutateAsync({ projectId, data: payload });
    }

    if (data.shape === "canvas") {
      const source = resolveLegacyDisplaySource(data.display?.sourceItemId, items);
      if (!source) {
        throw new Error("Itens de canvas precisam apontar para um item de dados, valor ou lista.");
      }

      const payload: CreateViewInput = {
        slug: data.slug,
        label: data.label,
        description: data.description,
        tags: data.tags,
        sourceKind: source.kind,
        sourceId: source.ref,
        presentation: data.display?.presentation ?? "stat",
      };
      await createView.mutateAsync({ projectId, data: payload });
    }

    const nextItems = readItemsFromStore(projectId);
    const createdItem = resolveTelemetryItem(nextItems, data.slug);
    if (!createdItem) {
      throw new Error("O item foi salvo, mas nao voltou para o workspace.");
    }

    return createdItem;
  };

  return {
    isPending:
      createCollection.isPending ||
      createMetric.isPending ||
      createModel.isPending ||
      createView.isPending,
    mutateAsync,
    mutate: (args: { projectId: string; data: CreateTelemetryItemInput }) => {
      void mutateAsync(args);
    },
  };
}
