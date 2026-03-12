export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  apiKey: string;
  abacatePayConnected: boolean;
  eventCount: number;
  sessionCount: number;
  customerCount: number;
  mrr: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyStat {
  date: string;
  events: number;
  sessions: number;
  users: number;
}

export interface EventCount {
  name: string;
  count: number;
}

export interface PageCount {
  url: string;
  count: number;
  avgDuration: number;
}

export interface AnalyticsOverview {
  totalEvents: number;
  totalSessions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
  topEvents: EventCount[];
  topPages: PageCount[];
  dailyStats: DailyStat[];
  period: {
    from: string;
    to: string;
  };
}

export interface EventRecord {
  id: string;
  projectId: string;
  name: string;
  sessionId?: string | null;
  userId?: string | null;
  anonymousId?: string | null;
  properties?: Record<string, unknown> | null;
  timestamp: string;
  url?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
}

export interface EventListResponse {
  events: EventRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionRecord {
  id: string;
  projectId: string;
  sessionId: string;
  userId?: string | null;
  anonymousId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  duration?: number | null;
  eventCount: number;
  entryPage?: string | null;
  exitPage?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  country?: string | null;
  device?: string | null;
}

export interface SessionListResponse {
  sessions: SessionRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionDetail {
  session: SessionRecord;
  events: EventRecord[];
}

export interface FunnelStep {
  order: number;
  eventName: string;
  label: string;
}

export interface Funnel {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  steps: FunnelStep[];
  createdAt: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  isControl: boolean;
}

export interface Experiment {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  status: "draft" | "running" | "paused" | "completed";
  hypothesis?: string | null;
  variants: ExperimentVariant[];
  metric?: string | null;
  targetSampleSize?: number | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface ExperimentVariantResult {
  variantId: string;
  variantName: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  uplift: number;
  isSignificant: boolean;
}

export interface ExperimentDetail {
  experiment: Experiment;
  results: ExperimentVariantResult[];
  totalParticipants: number;
  confidence: number;
  winner: string | null;
}

export interface LogEntry {
  id: string;
  projectId: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  service?: string | null;
  timestamp: string;
  meta?: Record<string, unknown> | null;
  traceId?: string | null;
}

export interface LogListResponse {
  entries: LogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface RequestRecord {
  id: string;
  projectId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestSize?: number | null;
  responseSize?: number | null;
  timestamp: string;
  ip?: string | null;
  userAgent?: string | null;
  traceId?: string | null;
  error?: string | null;
}

export interface RequestListResponse {
  requests: RequestRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface DatastoreRecord {
  id: string;
  projectId: string;
  collection: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface DatastoreCollection {
  name: string;
  recordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatastoreQueryResponse {
  collection: string;
  records: DatastoreRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface Dashboard {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  widgets: DashboardWidget[];
  createdAt: string;
}

export interface Customer {
  id: string;
  projectId: string;
  email: string;
  name?: string | null;
  externalId?: string | null;
  status: "active" | "trialing" | "churned";
  plan?: string | null;
  mrr: number;
  ltv: number;
  country?: string | null;
  createdAt: string;
  churnedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  limit: number;
  offset: number;
}

export interface RevenueEvent {
  id: string;
  projectId: string;
  type: string;
  amount: number;
  currency: string;
  customerId?: string | null;
  customerEmail?: string | null;
  plan?: string | null;
  description?: string | null;
  externalId?: string | null;
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}

export interface RevenueEventListResponse {
  events: RevenueEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  ltv: number;
  arpu: number;
  cac: number;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  expansionRevenue: number;
  mrrGrowth: number;
  netRevenueRetention: number;
  benchmarks: {
    avgChurnRate: number;
    avgArpu: number;
    avgMrrGrowth: number;
  };
  period: {
    from: string;
    to: string;
  };
}

export interface RevenueTimelinePoint {
  date: string;
  mrr: number;
  arr: number;
  newMrr: number;
  churnedMrr: number;
  expansionMrr: number;
}

export interface RevenueTimeline {
  data: RevenueTimelinePoint[];
}

export interface PlanRevenue {
  plan: string;
  customers: number;
  mrr: number;
  percentage: number;
}

export interface FeatureFlag {
  id: string;
  projectId: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  targetingRules: Array<{
    type: string;
    operator: string;
    values: string[];
  }>;
  variants: Array<{
    key: string;
    value: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Insight {
  id: string;
  type: string;
  severity: "positive" | "warning" | "critical" | "neutral";
  title: string;
  description: string;
  metric: string;
  value: number;
  recommendation?: string | null;
}

export interface Alert {
  id: string;
  type: string;
  severity: "warning" | "critical";
  title: string;
  description: string;
  value: number;
  threshold: number;
  createdAt: string;
}

export interface InsightsResponse {
  insights: Insight[];
  generatedAt: string;
}

export interface ProjectSettings {
  projectId: string;
  environment: "production" | "staging" | "development";
  website: string;
  apiBaseUrl: string;
  webhookUrl: string;
  timezone: string;
  locale: string;
  retentionDays: number;
  enableAnonymizedTracking: boolean;
  enableSessionReplay: boolean;
  enableProductEmails: boolean;
  enableErrorAlerts: boolean;
  sdkSnippet: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  website?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  website?: string;
}

export interface CreateFunnelInput {
  name: string;
  description?: string;
  steps: FunnelStep[];
}

export interface CreateExperimentInput {
  name: string;
  description?: string;
  hypothesis?: string;
  metric?: string;
  targetSampleSize?: number;
  variants: ExperimentVariant[];
}

export interface UpdateExperimentInput {
  status?: Experiment["status"];
  name?: string;
  description?: string;
}

export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  targetingRules?: FeatureFlag["targetingRules"];
  variants?: FeatureFlag["variants"];
}

export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  targetingRules?: FeatureFlag["targetingRules"];
}

export interface ListOptions {
  limit?: number;
  offset?: number;
}
