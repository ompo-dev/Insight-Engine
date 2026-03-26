import { addMinutes, addSeconds, subDays, subHours, subMonths } from "date-fns";
import type {
  Customer,
  Dashboard,
  DeliveryBoardItem,
  DatastoreRecord,
  EventRecord,
  Experiment,
  ExperimentVariant,
  FeatureFlag,
  Funnel,
  GitHubDeployment,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRelease,
  GitHubRepository,
  LogEntry,
  ProjectSettings,
  ProjectSummary,
  RequestRecord,
  RevenueEvent,
  SessionRecord,
} from "./types";
import type {
  CollectionDefinition,
  MetricDefinition,
  ModelDefinition,
  ViewDefinition,
} from "@/lib/telemetry/types";
import { createTelemetrySeed } from "@/lib/telemetry-seed";

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
  telemetry: {
    collections: CollectionDefinition[];
    metrics: MetricDefinition[];
    models: ModelDefinition[];
    views: ViewDefinition[];
  };
  engineering: {
    repositories: GitHubRepository[];
    pullRequests: GitHubPullRequest[];
    issues: GitHubIssue[];
    releases: GitHubRelease[];
    deployments: GitHubDeployment[];
    boardItems: DeliveryBoardItem[];
  };
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
const ENGINEERING_OWNERS = ["Ana", "Bruno", "Carla", "Diego", "Elisa"];
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

function sha(seed: number, index: number): string {
  return `${seed.toString(16)}${index.toString(16)}a${(seed + index).toString(16)}b${(seed * 3 + index).toString(16)}c`.slice(0, 7);
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

function createEngineeringData(project: ProjectRecord, seed: number) {
  const slug = project.slug;
  const webRepo = `${slug}-web`;
  const apiRepo = `${slug}-api`;

  const repositories: GitHubRepository[] = [
    {
      id: `${project.id}-repo-web`,
      name: webRepo,
      fullName: `lynx-labs/${webRepo}`,
      provider: "github",
      visibility: "private",
      defaultBranch: "main",
      openPullRequests: 2,
      openIssues: 4,
      activeBranches: 3,
      healthScore: 84 - seed,
      lastDeployAt: toIso(subDays(NOW, 1 + seed)),
      branches: [
        {
          name: "main",
          status: "deployed",
          lastCommitSha: sha(seed, 10),
          lastCommitAt: toIso(subDays(NOW, 1)),
          ahead: 0,
          behind: 0,
          linkedPullRequestNumber: null,
        },
        {
          name: "feat/onboarding-v2",
          status: "review",
          lastCommitSha: sha(seed, 11),
          lastCommitAt: toIso(subDays(NOW, 2)),
          ahead: 6,
          behind: 1,
          linkedPullRequestNumber: 245 + seed,
        },
        {
          name: "fix/checkout-guardrails",
          status: "active",
          lastCommitSha: sha(seed, 12),
          lastCommitAt: toIso(subDays(NOW, 3)),
          ahead: 3,
          behind: 0,
          linkedPullRequestNumber: null,
        },
        {
          name: "chore/design-tokens",
          status: "stale",
          lastCommitSha: sha(seed, 13),
          lastCommitAt: toIso(subDays(NOW, 14)),
          ahead: 2,
          behind: 5,
          linkedPullRequestNumber: null,
        },
      ],
      commits: [
        {
          id: `${project.id}-commit-web-1`,
          sha: sha(seed, 10),
          repository: webRepo,
          branch: "main",
          message: "ship: release onboarding insights banner",
          author: ENGINEERING_OWNERS[seed % ENGINEERING_OWNERS.length],
          timestamp: toIso(subDays(NOW, 1)),
          additions: 142,
          deletions: 48,
          linkedPullRequestNumber: 245 + seed,
          impactSummary: "Ativacao subiu 11,4% apos o deploy.",
        },
        {
          id: `${project.id}-commit-web-2`,
          sha: sha(seed, 11),
          repository: webRepo,
          branch: "feat/onboarding-v2",
          message: "feat: simplify trial onboarding checklist",
          author: ENGINEERING_OWNERS[(seed + 1) % ENGINEERING_OWNERS.length],
          timestamp: toIso(subDays(NOW, 2)),
          additions: 214,
          deletions: 63,
          linkedPullRequestNumber: 245 + seed,
          impactSummary: "Hipotese ligada a ativacao de trial.",
        },
        {
          id: `${project.id}-commit-web-3`,
          sha: sha(seed, 12),
          repository: webRepo,
          branch: "fix/checkout-guardrails",
          message: "fix: block empty purchase payload on checkout",
          author: ENGINEERING_OWNERS[(seed + 2) % ENGINEERING_OWNERS.length],
          timestamp: toIso(subDays(NOW, 3)),
          additions: 68,
          deletions: 19,
          linkedPullRequestNumber: null,
          impactSummary: "Reducao imediata dos erros 500 no fluxo de compra.",
        },
      ],
    },
    {
      id: `${project.id}-repo-api`,
      name: apiRepo,
      fullName: `lynx-labs/${apiRepo}`,
      provider: "github",
      visibility: "private",
      defaultBranch: "main",
      openPullRequests: 1,
      openIssues: 3,
      activeBranches: 2,
      healthScore: 79 + seed,
      lastDeployAt: toIso(subDays(NOW, seed)),
      branches: [
        {
          name: "main",
          status: "deployed",
          lastCommitSha: sha(seed, 20),
          lastCommitAt: toIso(subDays(NOW, seed)),
          ahead: 0,
          behind: 0,
          linkedPullRequestNumber: null,
        },
        {
          name: "fix/webhook-idempotency",
          status: "review",
          lastCommitSha: sha(seed, 21),
          lastCommitAt: toIso(subDays(NOW, 4)),
          ahead: 4,
          behind: 0,
          linkedPullRequestNumber: 251 + seed,
        },
        {
          name: "release/2026-03-hotfix",
          status: "active",
          lastCommitSha: sha(seed, 22),
          lastCommitAt: toIso(subDays(NOW, 5)),
          ahead: 1,
          behind: 0,
          linkedPullRequestNumber: null,
        },
      ],
      commits: [
        {
          id: `${project.id}-commit-api-1`,
          sha: sha(seed, 20),
          repository: apiRepo,
          branch: "main",
          message: "perf: cache subscription health queries",
          author: ENGINEERING_OWNERS[(seed + 3) % ENGINEERING_OWNERS.length],
          timestamp: toIso(subDays(NOW, seed)),
          additions: 88,
          deletions: 27,
          linkedPullRequestNumber: 251 + seed,
          impactSummary: "Latencia media caiu 23ms depois do merge.",
        },
        {
          id: `${project.id}-commit-api-2`,
          sha: sha(seed, 21),
          repository: apiRepo,
          branch: "fix/webhook-idempotency",
          message: "fix: guarantee idempotent invoice webhooks",
          author: ENGINEERING_OWNERS[(seed + 4) % ENGINEERING_OWNERS.length],
          timestamp: toIso(subDays(NOW, 4)),
          additions: 131,
          deletions: 40,
          linkedPullRequestNumber: 251 + seed,
          impactSummary: "Falhas de cobranca reduziram logo apos o patch.",
        },
      ],
    },
  ];

  const issues: GitHubIssue[] = [
    {
      id: `${project.id}-issue-1`,
      number: 118 + seed,
      repository: webRepo,
      title: "Melhorar onboarding para aumentar trial-to-paid",
      status: "review",
      kind: "feature",
      priority: "high",
      createdAt: toIso(subDays(NOW, 10)),
      updatedAt: toIso(subDays(NOW, 2)),
      linkedBranch: "feat/onboarding-v2",
      linkedPullRequestNumber: 245 + seed,
      impactMetric: "Ativacao",
    },
    {
      id: `${project.id}-issue-2`,
      number: 119 + seed,
      repository: apiRepo,
      title: "Evitar cobranca duplicada em retries de webhook",
      status: "review",
      kind: "bug",
      priority: "high",
      createdAt: toIso(subDays(NOW, 8)),
      updatedAt: toIso(subDays(NOW, 4)),
      linkedBranch: "fix/webhook-idempotency",
      linkedPullRequestNumber: 251 + seed,
      impactMetric: "Erros de cobranca",
    },
    {
      id: `${project.id}-issue-3`,
      number: 120 + seed,
      repository: webRepo,
      title: "Documentar deploy flags por release",
      status: "backlog",
      kind: "chore",
      priority: "medium",
      createdAt: toIso(subDays(NOW, 6)),
      updatedAt: toIso(subDays(NOW, 6)),
      linkedBranch: null,
      linkedPullRequestNumber: null,
      impactMetric: "Confianca operacional",
    },
    {
      id: `${project.id}-issue-4`,
      number: 121 + seed,
      repository: apiRepo,
      title: "Investigar pico de 500 apos release passada",
      status: "in_progress",
      kind: "bug",
      priority: "high",
      createdAt: toIso(subDays(NOW, 3)),
      updatedAt: toIso(subDays(NOW, 1)),
      linkedBranch: "release/2026-03-hotfix",
      linkedPullRequestNumber: null,
      impactMetric: "Erros",
    },
    {
      id: `${project.id}-issue-5`,
      number: 122 + seed,
      repository: webRepo,
      title: "Criar comparativo de impacto por release",
      status: "done",
      kind: "feature",
      priority: "medium",
      createdAt: toIso(subDays(NOW, 15)),
      updatedAt: toIso(subDays(NOW, 5)),
      linkedBranch: "main",
      linkedPullRequestNumber: 238 + seed,
      impactMetric: "Conversao",
    },
  ];

  const pullRequests: GitHubPullRequest[] = [
    {
      id: `${project.id}-pr-1`,
      number: 245 + seed,
      repository: webRepo,
      title: "feat: onboarding com checklist guiado",
      status: "merged",
      branch: "feat/onboarding-v2",
      baseBranch: "main",
      author: ENGINEERING_OWNERS[(seed + 1) % ENGINEERING_OWNERS.length],
      labels: ["feature", "growth"],
      createdAt: toIso(subDays(NOW, 6)),
      mergedAt: toIso(subDays(NOW, 1)),
      leadTimeHours: 36 + seed * 3,
      linkedIssueIds: [`${project.id}-issue-1`],
      linkedReleaseTag: `v2026.03.${seed + 4}`,
      risk: "medium",
      impactSummary: "Depois do merge, ativacao subiu e o bounce caiu.",
    },
    {
      id: `${project.id}-pr-2`,
      number: 251 + seed,
      repository: apiRepo,
      title: "fix: idempotencia de webhooks de cobranca",
      status: "open",
      branch: "fix/webhook-idempotency",
      baseBranch: "main",
      author: ENGINEERING_OWNERS[(seed + 4) % ENGINEERING_OWNERS.length],
      labels: ["bugfix", "billing"],
      createdAt: toIso(subDays(NOW, 4)),
      mergedAt: null,
      leadTimeHours: 18 + seed,
      linkedIssueIds: [`${project.id}-issue-2`],
      linkedReleaseTag: null,
      risk: "high",
      impactSummary: "Pode reduzir cancelamentos por falha de cobranca.",
    },
    {
      id: `${project.id}-pr-3`,
      number: 238 + seed,
      repository: webRepo,
      title: "feat: score de impacto por release",
      status: "merged",
      branch: "feat/release-impact-score",
      baseBranch: "main",
      author: ENGINEERING_OWNERS[seed % ENGINEERING_OWNERS.length],
      labels: ["feature", "analytics"],
      createdAt: toIso(subDays(NOW, 16)),
      mergedAt: toIso(subDays(NOW, 5)),
      leadTimeHours: 52 + seed * 4,
      linkedIssueIds: [`${project.id}-issue-5`],
      linkedReleaseTag: `v2026.03.${seed + 3}`,
      risk: "low",
      impactSummary: "Liberou a leitura de impacto por release no dashboard.",
    },
    {
      id: `${project.id}-pr-4`,
      number: 254 + seed,
      repository: webRepo,
      title: "chore: reorganizar tokens de interface",
      status: "draft",
      branch: "chore/design-tokens",
      baseBranch: "main",
      author: ENGINEERING_OWNERS[(seed + 2) % ENGINEERING_OWNERS.length],
      labels: ["chore", "design-system"],
      createdAt: toIso(subDays(NOW, 14)),
      mergedAt: null,
      leadTimeHours: 0,
      linkedIssueIds: [`${project.id}-issue-3`],
      linkedReleaseTag: null,
      risk: "low",
      impactSummary: "Melhora consistencia visual sem afetar negocio diretamente.",
    },
  ];

  const releases: GitHubRelease[] = [
    {
      id: `${project.id}-release-1`,
      repository: webRepo,
      tagName: `v2026.03.${seed + 4}`,
      title: "Guided onboarding rollout",
      status: "healthy",
      createdAt: toIso(subDays(NOW, 1)),
      deployedAt: toIso(subDays(NOW, 1)),
      linkedPullRequestNumbers: [245 + seed],
      linkedIssueIds: [`${project.id}-issue-1`],
      notes: "Novo onboarding guiado com checklist e CTA contextual.",
      impact: {
        activationDelta: 0.114 + seed * 0.01,
        conversionDelta: 0.062 + seed * 0.004,
        mrrDelta: 0.038 + seed * 0.003,
        errorDelta: -0.12,
      },
    },
    {
      id: `${project.id}-release-2`,
      repository: webRepo,
      tagName: `v2026.03.${seed + 3}`,
      title: "Release impact analytics",
      status: "healthy",
      createdAt: toIso(subDays(NOW, 5)),
      deployedAt: toIso(subDays(NOW, 5)),
      linkedPullRequestNumbers: [238 + seed],
      linkedIssueIds: [`${project.id}-issue-5`],
      notes: "Painel de correlacao por release entrou em producao.",
      impact: {
        activationDelta: 0.021,
        conversionDelta: 0.034,
        mrrDelta: 0.012,
        errorDelta: -0.06,
      },
    },
    {
      id: `${project.id}-release-3`,
      repository: apiRepo,
      tagName: `v2026.03.${seed + 2}`,
      title: "Hotfix de webhook",
      status: "degraded",
      createdAt: toIso(subDays(NOW, 9)),
      deployedAt: toIso(subDays(NOW, 9)),
      linkedPullRequestNumbers: [],
      linkedIssueIds: [`${project.id}-issue-4`],
      notes: "Patch apressado aumentou 500s antes do rollback parcial.",
      impact: {
        activationDelta: -0.01,
        conversionDelta: -0.018,
        mrrDelta: -0.009,
        errorDelta: 0.27,
      },
    },
  ];

  const deployments: GitHubDeployment[] = [
    {
      id: `${project.id}-deploy-1`,
      repository: webRepo,
      environment: "production",
      branch: "main",
      releaseTag: `v2026.03.${seed + 4}`,
      status: "success",
      deployedAt: toIso(subDays(NOW, 1)),
      durationMinutes: 9 + seed,
      commitSha: sha(seed, 10),
      incidentCount: 0,
    },
    {
      id: `${project.id}-deploy-2`,
      repository: apiRepo,
      environment: "production",
      branch: "release/2026-03-hotfix",
      releaseTag: `v2026.03.${seed + 2}`,
      status: "warning",
      deployedAt: toIso(subDays(NOW, 9)),
      durationMinutes: 14 + seed,
      commitSha: sha(seed, 20),
      incidentCount: 2,
    },
    {
      id: `${project.id}-deploy-3`,
      repository: apiRepo,
      environment: "staging",
      branch: "fix/webhook-idempotency",
      releaseTag: `candidate-${seed + 1}`,
      status: "success",
      deployedAt: toIso(subDays(NOW, 3)),
      durationMinutes: 7 + seed,
      commitSha: sha(seed, 21),
      incidentCount: 0,
    },
  ];

  const boardItems: DeliveryBoardItem[] = [
    {
      id: `${project.id}-board-1`,
      projectId: project.id,
      title: "Novo onboarding guiado",
      summary: "Conectar checklist, tours e CTA de ativacao no trial.",
      type: "feature",
      status: "review",
      priority: "high",
      owner: ENGINEERING_OWNERS[(seed + 1) % ENGINEERING_OWNERS.length],
      linkedIssueNumber: 118 + seed,
      linkedPullRequestNumber: 245 + seed,
      linkedBranch: "feat/onboarding-v2",
      linkedReleaseTag: null,
      impact: {
        product: "Ativacao de trial melhorando.",
        revenue: "Trial-to-paid tende a subir.",
        engineering: "PR em review final.",
        tone: "positive",
      },
      etaLabel: "Hoje",
      updatedAt: toIso(subDays(NOW, 1)),
    },
    {
      id: `${project.id}-board-2`,
      projectId: project.id,
      title: "Idempotencia de webhook",
      summary: "Evitar cobranca duplicada e retries inconsistentes.",
      type: "bug",
      status: "in_progress",
      priority: "high",
      owner: ENGINEERING_OWNERS[(seed + 4) % ENGINEERING_OWNERS.length],
      linkedIssueNumber: 119 + seed,
      linkedPullRequestNumber: null,
      linkedBranch: "fix/webhook-idempotency",
      linkedReleaseTag: null,
      impact: {
        product: "Menos falhas visiveis no billing.",
        revenue: "Protege MRR de cancelamentos involuntarios.",
        engineering: "Aguardando validacao em staging.",
        tone: "warning",
      },
      etaLabel: "2 dias",
      updatedAt: toIso(subDays(NOW, 2)),
    },
    {
      id: `${project.id}-board-3`,
      projectId: project.id,
      title: "Painel de impacto por release",
      summary: "Mostrar o que mudou no codigo e no negocio por versao.",
      type: "feature",
      status: "released",
      priority: "medium",
      owner: ENGINEERING_OWNERS[seed % ENGINEERING_OWNERS.length],
      linkedIssueNumber: 122 + seed,
      linkedPullRequestNumber: 238 + seed,
      linkedBranch: "main",
      linkedReleaseTag: `v2026.03.${seed + 3}`,
      impact: {
        product: "Leitura de releases ficou clara.",
        revenue: "Ajudou a priorizar melhorias com impacto.",
        engineering: "Release saudavel em producao.",
        tone: "positive",
      },
      etaLabel: "Publicado",
      updatedAt: toIso(subDays(NOW, 5)),
    },
    {
      id: `${project.id}-board-4`,
      projectId: project.id,
      title: "Investigar pico de 500",
      summary: "Correlacionar erros com hotfix de API.",
      type: "ops",
      status: "done",
      priority: "high",
      owner: ENGINEERING_OWNERS[(seed + 3) % ENGINEERING_OWNERS.length],
      linkedIssueNumber: 121 + seed,
      linkedPullRequestNumber: null,
      linkedBranch: "release/2026-03-hotfix",
      linkedReleaseTag: `v2026.03.${seed + 2}`,
      impact: {
        product: "Fluxo de compra estabilizado.",
        revenue: "Perda de conversao foi contida.",
        engineering: "Analise concluida com plano de rollback.",
        tone: "warning",
      },
      etaLabel: "Concluido",
      updatedAt: toIso(subDays(NOW, 1)),
    },
    {
      id: `${project.id}-board-5`,
      projectId: project.id,
      title: "Board conectado a PRs e releases",
      summary: "Dar contexto de branch, issue e impacto por card.",
      type: "experiment",
      status: "backlog",
      priority: "medium",
      owner: ENGINEERING_OWNERS[(seed + 2) % ENGINEERING_OWNERS.length],
      linkedIssueNumber: null,
      linkedPullRequestNumber: null,
      linkedBranch: null,
      linkedReleaseTag: null,
      impact: {
        product: "Mais clareza entre times.",
        revenue: "Prioriza trabalho com resultado real.",
        engineering: "Ainda sem branch aberta.",
        tone: "neutral",
      },
      etaLabel: "Planejado",
      updatedAt: toIso(subDays(NOW, 6)),
    },
  ];

  return {
    repositories,
    pullRequests,
    issues,
    releases,
    deployments,
    boardItems,
  };
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
      const telemetry = createTelemetrySeed(seed.id, seed.seed, NOW);

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
          datastore: { ...createDatastore(seed.id, seed.seed), ...telemetry.datastore },
          dashboards: createDashboards(seed.id),
          settings: createSettings(project, seed),
          telemetry: {
            collections: telemetry.collections,
            metrics: telemetry.metrics,
            models: telemetry.models,
            views: telemetry.views,
          },
          engineering: createEngineeringData(project, seed.seed),
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
    telemetry: {
      collections: [],
      metrics: [],
      models: [],
      views: [],
    },
    engineering: {
      repositories: [],
      pullRequests: [],
      issues: [],
      releases: [],
      deployments: [],
      boardItems: [],
    },
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
