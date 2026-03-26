import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createCustomTelemetryItemDraft,
  slugifyTelemetryItem,
  type CreateCustomTelemetryItemInput,
  type CustomTelemetryItemDefinition,
} from "@/lib/telemetry/items";

interface CustomTelemetryItemStore {
  itemsByProject: Record<string, CustomTelemetryItemDefinition[]>;
  createItem: (projectId: string, seed?: CreateCustomTelemetryItemInput) => CustomTelemetryItemDefinition;
  updateItem: (
    projectId: string,
    itemId: string,
    patch: Partial<CustomTelemetryItemDefinition>,
  ) => CustomTelemetryItemDefinition | null;
  removeItem: (projectId: string, itemId: string) => void;
  duplicateItem: (projectId: string, itemId: string) => CustomTelemetryItemDefinition | null;
}

function nextItems(projectId: string, itemsByProject: Record<string, CustomTelemetryItemDefinition[]>) {
  return itemsByProject[projectId] ?? [];
}

function ensureUniqueSlug(desiredSlug: string, items: CustomTelemetryItemDefinition[], itemId?: string) {
  const baseSlug = slugifyTelemetryItem(desiredSlug);
  const taken = new Set(items.filter((item) => item.id !== itemId).map((item) => item.slug));
  if (!taken.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (taken.has(`${baseSlug}_${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}_${counter}`;
}

export const useCustomItemStore = create<CustomTelemetryItemStore>()(
  persist(
    (set, get) => ({
      itemsByProject: {},
      createItem: (projectId, seed) => {
        const items = nextItems(projectId, get().itemsByProject);
        const created = createCustomTelemetryItemDraft({
          projectId,
          existingSlugs: items.map((item) => item.slug),
          seed,
        });

        set((state) => ({
          itemsByProject: {
            ...state.itemsByProject,
            [projectId]: [...nextItems(projectId, state.itemsByProject), created],
          },
        }));

        return created;
      },
      updateItem: (projectId, itemId, patch) => {
        const items = nextItems(projectId, get().itemsByProject);
        const current = items.find((item) => item.id === itemId || item.slug === itemId);
        if (!current) return null;

        const nextSlug = patch.slug
          ? ensureUniqueSlug(patch.slug, items, current.id)
          : current.slug;
        const now = new Date().toISOString();
        const nextItem: CustomTelemetryItemDefinition = {
          ...current,
          ...patch,
          id: current.id,
          slug: nextSlug,
          updatedAt: now,
        };

        set((state) => ({
          itemsByProject: {
            ...state.itemsByProject,
            [projectId]: nextItems(projectId, state.itemsByProject).map((item) =>
              item.id === current.id ? nextItem : item,
            ),
          },
        }));

        return nextItem;
      },
      removeItem: (projectId, itemId) => {
        set((state) => ({
          itemsByProject: {
            ...state.itemsByProject,
            [projectId]: nextItems(projectId, state.itemsByProject).filter(
              (item) => item.id !== itemId && item.slug !== itemId,
            ),
          },
        }));
      },
      duplicateItem: (projectId, itemId) => {
        const items = nextItems(projectId, get().itemsByProject);
        const current = items.find((item) => item.id === itemId || item.slug === itemId);
        if (!current) return null;

        const duplicated = createCustomTelemetryItemDraft({
          projectId,
          existingSlugs: items.map((item) => item.slug),
          seed: {
            label: `${current.label} copia`,
            slug: `${current.slug}_copy`,
            description: current.description ?? undefined,
            tags: [...current.tags],
            expression: current.expression,
            inputEnabled: current.inputEnabled,
            displayEnabled: current.displayEnabled,
            presentation: current.presentation,
            resultType: current.resultType,
            actionEnabled: current.actionEnabled,
            actionType: current.actionType,
            actionTarget: current.actionTarget ?? undefined,
            actionMethod: current.actionMethod,
            actionLive: current.actionLive,
            actionPayloadExpression: current.actionPayloadExpression,
            specialKind: current.specialKind ?? undefined,
            terminal: current.terminal,
            markdown: current.markdown,
            ai: current.ai,
            schema: current.schema,
            samplePayload: current.samplePayload ?? undefined,
            identityKeys: [...current.identityKeys],
            timestampField: current.timestampField ?? undefined,
          },
        });

        set((state) => ({
          itemsByProject: {
            ...state.itemsByProject,
            [projectId]: [...nextItems(projectId, state.itemsByProject), duplicated],
          },
        }));

        return duplicated;
      },
    }),
    {
      name: "lynx-custom-items-store",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = persistedState as { itemsByProject?: Record<string, CustomTelemetryItemDefinition[]> } | undefined;
        const itemsByProject = Object.fromEntries(
          Object.entries(state?.itemsByProject ?? {}).map(([projectId, items]) => [
            projectId,
            items.map((item) => ({
              ...item,
              presentation: item.presentation ?? "stat",
              actionEnabled: item.actionEnabled ?? false,
              actionType: item.actionType ?? "webhook",
              actionTarget: item.actionTarget ?? "https://api.exemplo.dev/hooks/lynx",
              actionMethod: item.actionMethod ?? "POST",
              actionLive: item.actionLive ?? false,
              actionPayloadExpression: item.actionPayloadExpression ?? "result",
              specialKind: item.specialKind ?? null,
              terminal: item.terminal,
              markdown: item.markdown,
              ai: item.ai,
              executionRuns: item.executionRuns ?? [],
              actionDeliveries: item.actionDeliveries ?? [],
            })),
          ]),
        );

        return { itemsByProject };
      },
    },
  ),
);




