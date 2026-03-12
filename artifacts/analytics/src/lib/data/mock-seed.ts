import { addMinutes, addSeconds, subDays, subHours, subMonths } from "date-fns";
import type {
  Customer,
  Dashboard,
  DatastoreRecord,
  EventRecord,
  Experiment,
  ExperimentVariant,
  FeatureFlag,
  Funnel,
  LogEntry,
  ProjectSettings,
  ProjectSummary,
  RequestRecord,
  RevenueEvent,
  SessionRecord,
} from "./types";

export type ProjectRecord = Omit<
  ProjectSummary,
  "eventCount" | "sessionCount" | "customerCount" | "mrr"
>;

export interface ProjectDataset {
  project: ProjectRecord;
  events: EventRecord[];
  sessions: SessionRecord[];
  funnels: Funnel[];
  experiments: Experiment[];
  customers: Customer[];
  revenueEvents: RevenueEvent[];
  featureFlags: FeatureFlag[];
  logs: LogEntry[];
  requests: RequestRecord[];
  datastore: Record<string, DatastoreRecord[]>;
  dashboards: Dashboard[];
  settings: ProjectSettings;
}

interface ProjectSeed {
  id: string;
  name: string;
  slug: string;
  description: string;
  website: string;
  apiKey: string;
  environment: ProjectSettings["environment"];
  connected: boolean;
  seed: number;
}

export const NOW = new Date("2026-03-12T15:00:00.000Z");

const PAGE_POOL = ["/", "/overview", "/pricing", "/reports", "/settings", "/integrations"];
const EVENT_POOL = [
  "$pageview",
  "button_clicked",
  "feature_viewed",
  "report_generated",
  "checkout_started",
  "signup",
  "upgrade_clicked",
];
const COUNTRY_POOL = ["BR", "US", "PT", "MX"];
const LOG_SERVICES = ["api", "workers", "billing", "notifications", "auth"];
const REQUEST_PATHS = [
  "/api/overview",
  "/api/events",
  "/api/sessions",
  "/api/revenue",
  "/api/feature-flags/evaluate",
];
const PLANS = [
  { name: "Starter", price: 49 },
  { name: "Growth", price: 149 },
  { name: "Scale", price: 399 },
  { name: "Enterprise", price: 899 },
] as const;

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    id: "proj_atlas",
    name: "Atlas CRM",
    slug: "atlas-crm",
    description: "CRM focado em times de receita de SaaS B2B.",
    website: "https://atlascrm.app",
    apiKey: "lynx_live_atlas_crm",
    environment: "production",
    connected: true,
    seed: 1,
  },
  {
    id: "proj_pulse",
    name: "Pulse Finance",
    slug: "pulse-finance",
    description: "Painel financeiro para fundadores operarem crescimento com clareza.",
    website: "https://pulsefinance.app",
    apiKey: "lynx_live_pulse_finance",
    environment: "staging",
    connected: true,
    seed: 2,
  },
  {
    id: "proj_orbit",
    name: "Orbit Support",
    slug: "orbit-support",
    description: "Help desk com automações para customer success e suporte.",
    website: "https://orbitsupport.app",
    apiKey: "lynx_live_orbit_support",
    environment: "production",
    connected: false,
    seed: 3,
  },
];

function toIso(date: Date): string {
  return date.toISOString();
}

function normalizeVariants(variants: ExperimentVariant[]): ExperimentVariant[] {
  const total = variants.reduce((sum, item) => sum + item.weight, 0);
  const divisor = total > 1 ? (total <= 100 ? 100 : total) : 1;

  return variants.map((variant, index) => ({
    ...variant,
    id: variant.id || `variant-${index + 1}`,
    weight: Number((variant.weight / divisor).toFixed(2)),
  }));
}

function createProject(seed: ProjectSeed): ProjectRecord {
  const createdAt = subMonths(NOW, 6 - seed.seed);

  return {
    id: seed.id,
    name: seed.name,
    slug: seed.slug,
    description: seed.description,
    website: seed.website,
    apiKey: seed.apiKey,
    abacatePayConnected: seed.connected,
    createdAt: toIso(createdAt),
    updatedAt: toIso(subDays(NOW, seed.seed)),
  };
}

function createSessions(projectId: string, seed: number): SessionRecord[] {
  return Array.from({ length: 10 + seed }, (_, index) => {
    const startedAt = subHours(NOW, index * 6 + seed * 2);
    const userKnown = index % 3 !== 1;
    const pageIndex = (index + seed) % PAGE_POOL.length;
    const sessionId = `${projectId}-session-${index + 1}`;
    const duration = 240 + ((index + seed) % 6) * 75;

    return {
      id: `${sessionId}-row`,
      projectId,
      sessionId,
      userId: userKnown ? `${projectId}-user-${(index % 7) + 1}` : null,
      anonymousId: userKnown ? null : `${projectId}-anon-${index + 1}`,
      startedAt: toIso(startedAt),
      endedAt: toIso(addMinutes(startedAt, Math.max(2, Math.floor(duration / 60)))),
      duration,
      eventCount: 4 + ((index + seed) % 5),
      entryPage: PAGE_POOL[pageIndex],
      exitPage: PAGE_POOL[(pageIndex + 2) % PAGE_POOL.length],
      referrer: index % 2 === 0 ? "https://google.com" : "https://linkedin.com",
      userAgent: index % 2 === 0 ? "Chrome / Mac OS" : "Safari / iPhone",
      ip: `10.0.${seed}.${index + 10}`,
      country: COUNTRY_POOL[(index + seed) % COUNTRY_POOL.length],
      device: index % 3 === 0 ? "mobile" : "desktop",
    };
  });
}

function createEvents(projectId: string, sessions: SessionRecord[], seed: number): EventRecord[] {
  return sessions.flatMap((session, sessionIndex) =>
    Array.from({ length: session.eventCount }, (_, eventIndex) => {
      const page = PAGE_POOL[(sessionIndex + eventIndex + seed) % PAGE_POOL.length];
      const startedAt = new Date(session.startedAt);

      return {
        id: `${session.id}-event-${eventIndex + 1}`,
        projectId,
        name: EVENT_POOL[(sessionIndex + eventIndex + seed) % EVENT_POOL.length],
        sessionId: session.sessionId,
        userId: session.userId,
        anonymousId: session.anonymousId,
        properties: {
          page,
          component: `panel-${(eventIndex % 4) + 1}`,
          source: sessionIndex % 2 === 0 ? "dashboard" : "email",
        },
        timestamp: toIso(addSeconds(startedAt, 35 * (eventIndex + 1))),
        url: `https://${projectId.replace("proj_", "")}.app${page}`,
        referrer: session.referrer,
        userAgent: session.userAgent,
        ip: session.ip,
      };
    }),
  );
}

function createCustomers(projectId: string, seed: number): Customer[] {
  return Array.from({ length: 14 + seed }, (_, index) => {
    const plan = PLANS[(index + seed) % PLANS.length];
    const active = index < 10 + seed;
    const createdAt = subMonths(NOW, 11 - (index % 9));
    const churnedAt = active ? null : subDays(NOW, (index + 1) * 3);
    const firstNames = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fabio"];
    const lastNames = ["Silva", "Souza", "Lima", "Costa", "Moura", "Pinto"];
    const name = `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;

    return {
      id: `${projectId}-customer-${index + 1}`,
      projectId,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      name,
      externalId: `${projectId}-ext-${index + 1}`,
      status: active ? (index % 5 === 0 ? "trialing" : "active") : "churned",
      plan: plan.name,
      mrr: active ? plan.price : 0,
      ltv: plan.price * (4 + (index % 7)),
      country: COUNTRY_POOL[(index + seed) % COUNTRY_POOL.length],
      createdAt: toIso(createdAt),
      churnedAt: churnedAt ? toIso(churnedAt) : null,
      metadata: {
        owner: index % 2 === 0 ? "sales" : "founder",
        seats: 2 + (index % 6),
      },
    };
  });
}

function createRevenueEvents(projectId: string, customers: Customer[], seed: number): RevenueEvent[] {
  return Array.from({ length: 8 }, (_, index) => {
    const month = subMonths(NOW, 7 - index);
    const customer = customers[index % customers.length];
    const plan = PLANS[(index + seed) % PLANS.length];
    const source = index % 2 === 0 ? "abacatepay" : "manual";

    return [
      {
        id: `${projectId}-rev-new-${index + 1}`,
        projectId,
        type: "new_subscription",
        amount: plan.price,
        currency: "BRL",
        customerId: customer.id,
        customerEmail: customer.email,
        plan: plan.name,
        description: `Novo plano ${plan.name}`,
        source,
        timestamp: toIso(subDays(month, 4)),
        metadata: { cohort: `2025-${index + 1}` },
      },
      ...(index % 2 === 0
        ? [
            {
              id: `${projectId}-rev-upgrade-${index + 1}`,
              projectId,
              type: "upgrade",
              amount: 60 + seed * 15,
              currency: "BRL",
              customerId: customer.id,
              customerEmail: customer.email,
              plan: "Scale",
              description: "Expansão por add-ons",
              source: "manual",
              timestamp: toIso(subDays(month, 1)),
              metadata: { seatsAdded: 3 + seed },
            } satisfies RevenueEvent,
          ]
        : []),
      ...(index % 3 === 0
        ? [
            {
              id: `${projectId}-rev-cancel-${index + 1}`,
              projectId,
              type: "cancellation",
              amount: 49 + seed * 10,
              currency: "BRL",
              customerId: customer.id,
              customerEmail: customer.email,
              plan: "Starter",
              description: "Cancelamento solicitado pelo cliente",
              source: "manual",
              timestamp: toIso(addMinutes(month, 180)),
              metadata: { reason: "budget" },
            } satisfies RevenueEvent,
          ]
        : []),
    ];
  }).flat().sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

function createFunnels(projectId: string, seed: number): Funnel[] {
  return [
    {
      id: `${projectId}-funnel-signup`,
      projectId,
      name: "Signup Funnel",
      description: "Da visita inicial até a criação de conta.",
      steps: [
        { order: 1, eventName: "$pageview", label: "Visitou landing" },
        { order: 2, eventName: "button_clicked", label: "Clicou CTA" },
        { order: 3, eventName: "signup", label: "Criou conta" },
      ],
      createdAt: toIso(subMonths(NOW, 3 + seed)),
    },
    {
      id: `${projectId}-funnel-expansion`,
      projectId,
      name: "Expansion Funnel",
      description: "Acompanhamento de ativação até expansão.",
      steps: [
        { order: 1, eventName: "feature_viewed", label: "Entrou no recurso" },
        { order: 2, eventName: "report_generated", label: "Gerou relatório" },
        { order: 3, eventName: "upgrade_clicked", label: "Solicitou upgrade" },
      ],
      createdAt: toIso(subMonths(NOW, 2 + seed)),
    },
  ];
}

function createExperiments(projectId: string): Experiment[] {
  return [
    {
      id: `${projectId}-exp-checkout`,
      projectId,
      name: "Checkout layout refresh",
      description: "Reduzir atrito na etapa de pagamento.",
      status: "running",
      hypothesis: "Um checkout mais curto aumenta conversão em pelo menos 8%.",
      variants: normalizeVariants([
        { id: "control", name: "Control", weight: 0.5, isControl: true },
        { id: "variant-a", name: "Variant A", weight: 0.5, isControl: false },
      ]),
      metric: "checkout_started",
      targetSampleSize: 1500,
      createdAt: toIso(subMonths(NOW, 2)),
      updatedAt: toIso(subDays(NOW, 2)),
      startedAt: toIso(subDays(NOW, 18)),
      endedAt: null,
    },
    {
      id: `${projectId}-exp-onboarding`,
      projectId,
      name: "Guided onboarding",
      description: "Comparar onboarding livre vs guiado.",
      status: "paused",
      hypothesis: "Orientação mais clara reduz abandono na primeira sessão.",
      variants: normalizeVariants([
        { id: "control", name: "Livre", weight: 0.52, isControl: true },
        { id: "variant-a", name: "Guiado", weight: 0.48, isControl: false },
      ]),
      metric: "report_generated",
      targetSampleSize: 800,
      createdAt: toIso(subMonths(NOW, 3)),
      updatedAt: toIso(subDays(NOW, 7)),
      startedAt: toIso(subDays(NOW, 30)),
      endedAt: null,
    },
  ];
}

function createFeatureFlags(projectId: string, seed: number): FeatureFlag[] {
  return [
    {
      id: `${projectId}-flag-command-center`,
      projectId,
      key: "command-center-v2",
      name: "Command Center V2",
      description: "Nova experiência da visão geral executiva.",
      enabled: true,
      rolloutPercentage: 100,
      targetingRules: [{ type: "plan", operator: "in", values: ["Growth", "Scale", "Enterprise"] }],
      variants: [{ key: "layout", value: "v2" }],
      createdAt: toIso(subMonths(NOW, 1)),
      updatedAt: toIso(subDays(NOW, seed)),
    },
    {
      id: `${projectId}-flag-ai-assistant`,
      projectId,
      key: "ai-assistant-beta",
      name: "AI Assistant Beta",
      description: "Assistente contextual dentro dos dashboards.",
      enabled: true,
      rolloutPercentage: 35 + seed * 10,
      targetingRules: [{ type: "country", operator: "in", values: ["BR", "US"] }],
      variants: [{ key: "tone", value: "pro" }],
      createdAt: toIso(subMonths(NOW, 2)),
      updatedAt: toIso(subDays(NOW, 3 + seed)),
    },
    {
      id: `${projectId}-flag-billing-alerts`,
      projectId,
      key: "billing-alerts-inline",
      name: "Billing alerts inline",
      description: "Alertas de cobrança diretamente no fluxo principal.",
      enabled: false,
      rolloutPercentage: 0,
      targetingRules: [],
      variants: [],
      createdAt: toIso(subMonths(NOW, 3)),
      updatedAt: toIso(subDays(NOW, 6 + seed)),
    },
  ];
}

function createLogs(projectId: string, seed: number): LogEntry[] {
  return Array.from({ length: 26 }, (_, index) => {
    const level = (["info", "info", "warn", "error", "debug"] as const)[(index + seed) % 5];

    return {
      id: `${projectId}-log-${index + 1}`,
      projectId,
      level,
      message:
        level === "error"
          ? `Webhook retry failed for invoice ${(index % 5) + 1}`
          : level === "warn"
            ? `Latency spike detected on query ${(index % 4) + 1}`
            : level === "debug"
              ? `Cache warmed for project ${projectId}`
              : `Job ${index + 1} completed successfully`,
      service: LOG_SERVICES[(index + seed) % LOG_SERVICES.length],
      timestamp: toIso(subHours(NOW, index * 2)),
      meta: { region: index % 2 === 0 ? "sa-east-1" : "us-east-1", duration: 90 + index * 6 },
      traceId: `${projectId}-trace-${index + 1}`,
    };
  });
}

function createRequests(projectId: string, seed: number): RequestRecord[] {
  return Array.from({ length: 22 }, (_, index) => {
    const statusCode = index % 7 === 0 ? 500 : index % 5 === 0 ? 401 : index % 3 === 0 ? 201 : 200;

    return {
      id: `${projectId}-req-${index + 1}`,
      projectId,
      method: ["GET", "POST", "PATCH", "DELETE"][index % 4],
      url: `https://api.${projectId.replace("proj_", "")}.app${REQUEST_PATHS[index % REQUEST_PATHS.length]}`,
      statusCode,
      duration: 110 + index * 17 + seed * 9,
      requestSize: 400 + index * 10,
      responseSize: 1100 + index * 35,
      timestamp: toIso(subHours(NOW, index * 3)),
      ip: `172.16.${seed}.${index + 20}`,
      userAgent: index % 2 === 0 ? "Chrome / Mac OS" : "Safari / iPhone",
      traceId: `${projectId}-req-trace-${index + 1}`,
      error: statusCode >= 500 ? "Unexpected upstream timeout" : null,
    };
  });
}

function createDatastore(projectId: string, seed: number): Record<string, DatastoreRecord[]> {
  return {
    users: [
      {
        id: `${projectId}-data-user-1`,
        projectId,
        collection: "users",
        data: { name: "Ana Lima", plan: "Growth", seats: 4, source: "sales-led" },
        createdAt: toIso(subMonths(NOW, 2)),
      },
      {
        id: `${projectId}-data-user-2`,
        projectId,
        collection: "users",
        data: { name: "Bruno Costa", plan: "Starter", seats: 2, source: "self-serve" },
        createdAt: toIso(subMonths(NOW, 1)),
      },
    ],
    billing: [
      {
        id: `${projectId}-data-billing-1`,
        projectId,
        collection: "billing",
        data: { delinquentAccounts: seed, retriesToday: 3 + seed, recoveredMrr: 320 + seed * 40 },
        createdAt: toIso(subDays(NOW, 8)),
      },
    ],
  };
}

function createDashboards(projectId: string): Dashboard[] {
  return [
    {
      id: `${projectId}-dash-revenue`,
      projectId,
      name: "Revenue cockpit",
      description: "Receita, churn e planos em um quadro executivo.",
      widgets: [
        { id: "mrr", type: "metric", title: "MRR", position: { x: 0, y: 0, w: 3, h: 2 } },
        { id: "growth", type: "line_chart", title: "Growth", position: { x: 3, y: 0, w: 9, h: 4 } },
      ],
      createdAt: toIso(subMonths(NOW, 2)),
    },
    {
      id: `${projectId}-dash-product`,
      projectId,
      name: "Product pulse",
      description: "Eventos, sessões e funis com foco em ativação.",
      widgets: [
        { id: "events", type: "metric", title: "Eventos", position: { x: 0, y: 0, w: 3, h: 2 } },
        { id: "funnel", type: "funnel", title: "Signup funnel", position: { x: 3, y: 0, w: 9, h: 5 } },
      ],
      createdAt: toIso(subMonths(NOW, 1)),
    },
  ];
}

function createSettings(project: ProjectRecord, seed: ProjectSeed): ProjectSettings {
  return {
    projectId: project.id,
    environment: seed.environment,
    website: project.website ?? "",
    apiBaseUrl: `https://api.${project.slug}.app`,
    webhookUrl: `https://api.${project.slug}.app/webhooks/lynx`,
    timezone: "America/Sao_Paulo",
    locale: "pt-BR",
    retentionDays: 180,
    enableAnonymizedTracking: true,
    enableSessionReplay: seed.seed !== 2,
    enableProductEmails: seed.seed === 1,
    enableErrorAlerts: true,
    sdkSnippet: `<script>\n  window.lynx.init({ apiKey: "${project.apiKey}", projectId: "${project.id}" })\n</script>`,
  };
}

export function createInitialDatabase(): Record<string, ProjectDataset> {
  return Object.fromEntries(
    PROJECT_SEEDS.map((seed) => {
      const project = createProject(seed);
      const sessions = createSessions(seed.id, seed.seed);
      const customers = createCustomers(seed.id, seed.seed);

      return [
        seed.id,
        {
          project,
          events: createEvents(seed.id, sessions, seed.seed),
          sessions,
          funnels: createFunnels(seed.id, seed.seed),
          experiments: createExperiments(seed.id),
          customers,
          revenueEvents: createRevenueEvents(seed.id, customers, seed.seed),
          featureFlags: createFeatureFlags(seed.id, seed.seed),
          logs: createLogs(seed.id, seed.seed),
          requests: createRequests(seed.id, seed.seed),
          datastore: createDatastore(seed.id, seed.seed),
          dashboards: createDashboards(seed.id),
          settings: createSettings(project, seed),
        } satisfies ProjectDataset,
      ];
    }),
  );
}

export function createEmptyDataset(project: ProjectRecord): ProjectDataset {
  return {
    project,
    events: [],
    sessions: [],
    funnels: [],
    experiments: [],
    customers: [],
    revenueEvents: [],
    featureFlags: [],
    logs: [],
    requests: [],
    datastore: {},
    dashboards: [],
    settings: {
      projectId: project.id,
      environment: "development",
      website: project.website ?? "",
      apiBaseUrl: `https://api.${project.slug}.app`,
      webhookUrl: `https://api.${project.slug}.app/webhooks/lynx`,
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
      retentionDays: 90,
      enableAnonymizedTracking: true,
      enableSessionReplay: false,
      enableProductEmails: false,
      enableErrorAlerts: true,
      sdkSnippet: `<script>\n  window.lynx.init({ apiKey: "${project.apiKey}", projectId: "${project.id}" })\n</script>`,
    },
  };
}
