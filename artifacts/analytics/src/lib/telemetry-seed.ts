import { subDays, subHours, subMinutes } from "date-fns";
import type { DatastoreRecord } from "@/lib/data/types";
import type {
  CollectionDefinition,
  CreateCollectionInput,
  CreateMetricInput,
  CreateModelInput,
  CreateViewInput,
  MetricDefinition,
  ModelDefinition,
  ViewDefinition,
} from "@/lib/telemetry/types";
import { buildDefaultCollectionDefinition } from "@/lib/telemetry/runtime";

function toIso(date: Date) {
  return date.toISOString();
}

function createMetric(projectId: string, input: CreateMetricInput, timestamp: string): MetricDefinition {
  return {
    id: `${projectId}_metric_${input.slug}`,
    projectId,
    slug: input.slug,
    label: input.label,
    description: input.description ?? null,
    format: input.format,
    tags: input.tags ?? [],
    sources: input.sources,
    dsl: input.dsl,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createModel(projectId: string, input: CreateModelInput, timestamp: string): ModelDefinition {
  return {
    id: `${projectId}_model_${input.slug}`,
    projectId,
    slug: input.slug,
    label: input.label,
    description: input.description ?? null,
    tags: input.tags ?? [],
    sources: input.sources,
    dsl: input.dsl,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createView(projectId: string, input: CreateViewInput, timestamp: string): ViewDefinition {
  return {
    id: `${projectId}_view_${input.slug}`,
    projectId,
    slug: input.slug,
    label: input.label,
    description: input.description ?? null,
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    presentation: input.presentation,
    tags: input.tags ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildCartCollection(projectId: string, now: Date): CreateCollectionInput {
  return {
    slug: "cart_sessions",
    label: "Carrinho",
    description: "Snapshots append-only do carrinho para medir abandono, valor perdido e recuperacao.",
    identityKeys: ["cartId"],
    timestampField: "updatedAt",
    tags: ["revenue", "checkout", "loss"],
    schema: {
      type: "object",
      properties: {
        cartId: { type: "string", required: true },
        userId: { type: "string", required: true },
        status: { type: "string", required: true, enum: ["active", "abandoned", "recovered"] },
        totalPrice: { type: "number", required: true },
        minutesInCart: { type: "number", required: true },
        currency: { type: "string", required: true, enum: ["BRL"] },
        updatedAt: { type: "date-time", required: true },
        items: {
          type: "array",
          required: true,
          items: {
            type: "object",
            properties: {
              id: { type: "string", required: true },
              title: { type: "string", required: true },
              price: { type: "number", required: true },
              quantity: { type: "integer", required: true },
            },
          },
        },
      },
    },
    samplePayload: {
      cartId: `${projectId}-cart-001`,
      userId: `${projectId}-user-11`,
      status: "abandoned",
      totalPrice: 612,
      minutesInCart: 38,
      currency: "BRL",
      updatedAt: toIso(now),
      items: [
        { id: "sku_starter", title: "Starter Annual", price: 299, quantity: 1 },
        { id: "sku_ai", title: "AI Copilot", price: 313, quantity: 1 },
      ],
    },
  };
}

function buildTicketCollection(projectId: string, now: Date): CreateCollectionInput {
  return {
    slug: "support_tickets",
    label: "Tickets",
    description: "Colecao operacional para incidentes e suporte ligados a receita.",
    identityKeys: ["ticketId"],
    timestampField: "updatedAt",
    tags: ["ops", "support"],
    schema: {
      type: "object",
      properties: {
        ticketId: { type: "string", required: true },
        customerId: { type: "string", required: true },
        severity: { type: "string", required: true, enum: ["low", "medium", "high"] },
        status: { type: "string", required: true, enum: ["open", "investigating", "resolved"] },
        updatedAt: { type: "date-time", required: true },
        topic: { type: "string", required: true },
      },
    },
    samplePayload: {
      ticketId: `${projectId}-ticket-014`,
      customerId: `${projectId}-customer-3`,
      severity: "high",
      status: "open",
      updatedAt: toIso(now),
      topic: "Erro no checkout apos trocar plano",
    },
  };
}

export function createTelemetrySeed(projectId: string, seed: number, now: Date) {
  const createdAt = toIso(subDays(now, 18 - seed));
  const cartCollection = buildDefaultCollectionDefinition(projectId, buildCartCollection(projectId, now), createdAt);
  const ticketCollection = buildDefaultCollectionDefinition(projectId, buildTicketCollection(projectId, now), createdAt);

  const cartRecords: DatastoreRecord[] = [
    {
      id: `${projectId}-cart-rec-1`,
      projectId,
      collection: cartCollection.slug,
      data: {
        cartId: `${projectId}-cart-001`,
        userId: `${projectId}-user-11`,
        status: "abandoned",
        totalPrice: 612 + seed * 20,
        minutesInCart: 38,
        currency: "BRL",
        updatedAt: toIso(subHours(now, 4)),
        items: [
          { id: "sku_starter", title: "Starter Annual", price: 299, quantity: 1 },
          { id: "sku_ai", title: "AI Copilot", price: 313 + seed * 20, quantity: 1 },
        ],
      },
      createdAt: toIso(subHours(now, 4)),
    },
    {
      id: `${projectId}-cart-rec-2`,
      projectId,
      collection: cartCollection.slug,
      data: {
        cartId: `${projectId}-cart-002`,
        userId: `${projectId}-user-4`,
        status: "recovered",
        totalPrice: 199 + seed * 10,
        minutesInCart: 16,
        currency: "BRL",
        updatedAt: toIso(subHours(now, 18)),
        items: [{ id: "sku_growth", title: "Growth Monthly", price: 199 + seed * 10, quantity: 1 }],
      },
      createdAt: toIso(subHours(now, 18)),
    },
    {
      id: `${projectId}-cart-rec-3`,
      projectId,
      collection: cartCollection.slug,
      data: {
        cartId: `${projectId}-cart-003`,
        userId: `${projectId}-user-7`,
        status: "abandoned",
        totalPrice: 884 + seed * 30,
        minutesInCart: 62,
        currency: "BRL",
        updatedAt: toIso(subMinutes(now, 95)),
        items: [
          { id: "sku_scale", title: "Scale Quarterly", price: 599 + seed * 30, quantity: 1 },
          { id: "sku_support", title: "Priority Support", price: 285, quantity: 1 },
        ],
      },
      createdAt: toIso(subMinutes(now, 95)),
    },
  ];

  const ticketRecords: DatastoreRecord[] = [
    {
      id: `${projectId}-ticket-rec-1`,
      projectId,
      collection: ticketCollection.slug,
      data: {
        ticketId: `${projectId}-ticket-014`,
        customerId: `${projectId}-customer-3`,
        severity: "high",
        status: "open",
        updatedAt: toIso(subHours(now, 2)),
        topic: "Erro no checkout apos trocar plano",
      },
      createdAt: toIso(subHours(now, 2)),
    },
    {
      id: `${projectId}-ticket-rec-2`,
      projectId,
      collection: ticketCollection.slug,
      data: {
        ticketId: `${projectId}-ticket-015`,
        customerId: `${projectId}-customer-9`,
        severity: "medium",
        status: "investigating",
        updatedAt: toIso(subHours(now, 7)),
        topic: "Webhook de pagamento sem confirmacao",
      },
      createdAt: toIso(subHours(now, 7)),
    },
  ];

  cartCollection.recordCount = cartRecords.length;
  cartCollection.lastIngestedAt = cartRecords[0]?.createdAt ?? null;
  ticketCollection.recordCount = ticketRecords.length;
  ticketCollection.lastIngestedAt = ticketRecords[0]?.createdAt ?? null;

  const metrics = [
    createMetric(projectId, {
      slug: "abandoned_cart_value",
      label: "Valor abandonado",
      description: "Soma do valor total dos carrinhos abandonados.",
      format: "currency",
      tags: ["revenue", "carts"],
      sources: [{ kind: "collection", ref: cartCollection.slug, label: cartCollection.label }],
      dsl: {
        version: 1,
        steps: [
          { id: "cart_source", op: "source", source: { kind: "collection", ref: cartCollection.slug } },
          { id: "cart_recent", op: "window", input: "cart_source", range: "30d", timestampField: "updatedAt" },
          {
            id: "cart_abandoned",
            op: "filter",
            input: "cart_recent",
            conditions: [{ field: "status", operator: "eq", value: "abandoned" }],
          },
          { id: "cart_value_sum", op: "aggregate", input: "cart_abandoned", mode: "sum", field: "totalPrice", as: "total" },
        ],
        output: { ref: "cart_value_sum", shape: "metric" },
      },
    }, createdAt),
    createMetric(projectId, {
      slug: "potential_mrr_if_recovered",
      label: "MRR potencial",
      description: "Quanto o MRR poderia subir recuperando o valor hoje abandonado no carrinho.",
      format: "currency",
      tags: ["forecast", "revenue"],
      sources: [
        { kind: "metric", ref: "abandoned_cart_value", label: "Valor abandonado" },
        { kind: "system-metric", ref: "mrr", label: "MRR atual" },
      ],
      dsl: {
        version: 1,
        steps: [
          { id: "lost_value", op: "source", source: { kind: "metric", ref: "abandoned_cart_value" } },
          { id: "current_mrr", op: "source", source: { kind: "system-metric", ref: "mrr" } },
          { id: "potential_mrr", op: "math", mode: "add", left: { ref: "lost_value" }, right: { ref: "current_mrr" }, as: "value" },
        ],
        output: { ref: "potential_mrr", shape: "metric" },
      },
    }, createdAt),
  ];

  const models = [
    createModel(projectId, {
      slug: "lost_sales_queue",
      label: "Vendas perdidas",
      description: "Fila dos carrinhos abandonados com maior potencial de recuperacao.",
      tags: ["ops", "recovery"],
      sources: [{ kind: "collection", ref: cartCollection.slug, label: cartCollection.label }],
      dsl: {
        version: 1,
        steps: [
          { id: "cart_source", op: "source", source: { kind: "collection", ref: cartCollection.slug } },
          {
            id: "cart_abandoned",
            op: "filter",
            input: "cart_source",
            conditions: [{ field: "status", operator: "eq", value: "abandoned" }],
          },
          {
            id: "cart_projection",
            op: "select",
            input: "cart_abandoned",
            limit: 12,
            fields: [
              { key: "cartId", from: "cartId" },
              { key: "userId", from: "userId" },
              { key: "totalPrice", from: "totalPrice" },
              { key: "minutesInCart", from: "minutesInCart" },
              { key: "updatedAt", from: "updatedAt" },
            ],
          },
        ],
        output: { ref: "cart_projection", shape: "dataset" },
      },
    }, createdAt),
  ];

  const views = [
    createView(projectId, {
      slug: "lost_sales_stat",
      label: "MRR se recuperasse tudo",
      description: "Comparacao executiva do MRR atual com a recuperacao imediata dos carrinhos.",
      sourceKind: "metric",
      sourceId: metrics[1].slug,
      presentation: "comparison",
      tags: ["executive", "revenue"],
    }, createdAt),
    createView(projectId, {
      slug: "lost_sales_table",
      label: "Fila de recuperacao",
      description: "Tabela operacional para acionar carrinhos abandonados.",
      sourceKind: "model",
      sourceId: models[0].slug,
      presentation: "table",
      tags: ["ops", "revenue"],
    }, createdAt),
  ];

  return {
    collections: [cartCollection, ticketCollection],
    metrics,
    models,
    views,
    datastore: {
      [cartCollection.slug]: cartRecords,
      [ticketCollection.slug]: ticketRecords,
    },
  };
}
