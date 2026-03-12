import { subDays, subHours, subMonths } from "date-fns";
import type {
  Alert,
  AnalyticsOverview,
  DatastoreCollection,
  Experiment,
  ExperimentDetail,
  Funnel,
  FunnelDetail,
  FunnelSessionPreview,
  FunnelStepAnalytics,
  Insight,
  InsightsResponse,
  PageCount,
  PlanRevenue,
  ProjectSummary,
  RevenueMetrics,
  RevenueTimeline,
  RevenueTimelinePoint,
} from "./types";
import { NOW, type ProjectDataset } from "./mock-seed";

function toIso(date: Date): string {
  return date.toISOString();
}

function dateKey(input: string | Date): string {
  const value = typeof input === "string" ? new Date(input) : input;
  return value.toISOString().slice(0, 10);
}

function monthKey(input: string | Date): string {
  const value = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)).toISOString();
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function buildProjectSummary(dataset: ProjectDataset): ProjectSummary {
  const activeCustomers = dataset.customers.filter((customer) => customer.status !== "churned");

  return {
    ...dataset.project,
    eventCount: dataset.events.length,
    sessionCount: dataset.sessions.length,
    customerCount: dataset.customers.length,
    mrr: sum(activeCustomers.map((customer) => customer.mrr)),
  };
}

export function buildOverview(dataset: ProjectDataset): AnalyticsOverview {
  const from = subDays(NOW, 13);
  const filteredEvents = dataset.events.filter((event) => new Date(event.timestamp) >= from);
  const filteredSessions = dataset.sessions.filter((session) => new Date(session.startedAt) >= from);
  const topEventsMap = new Map<string, number>();
  const topPagesMap = new Map<string, number>();

  filteredEvents.forEach((event) => {
    topEventsMap.set(event.name, (topEventsMap.get(event.name) ?? 0) + 1);
    if (event.url) {
      topPagesMap.set(event.url, (topPagesMap.get(event.url) ?? 0) + 1);
    }
  });

  const topPages: PageCount[] = [...topPagesMap.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([url, count]) => ({ url, count, avgDuration: 0 }));

  return {
    totalEvents: filteredEvents.length,
    totalSessions: filteredSessions.length,
    uniqueUsers: new Set(
      filteredEvents.map((event) => event.userId ?? event.anonymousId).filter(Boolean),
    ).size,
    avgSessionDuration: Number(
      average(
        filteredSessions
          .map((session) => session.duration ?? 0)
          .filter((duration) => duration > 0),
      ).toFixed(2),
    ),
    bounceRate:
      filteredSessions.length === 0
        ? 0
        : filteredSessions.filter((session) => session.eventCount <= 2).length / filteredSessions.length,
    topEvents: [...topEventsMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count })),
    topPages,
    dailyStats: Array.from({ length: 14 }, (_, index) => {
      const day = subDays(NOW, 13 - index);
      const key = dateKey(day);
      const events = filteredEvents.filter((event) => dateKey(event.timestamp) === key);
      const sessions = filteredSessions.filter((session) => dateKey(session.startedAt) === key);

      return {
        date: key,
        events: events.length,
        sessions: sessions.length,
        users: new Set(
          [...events, ...sessions].map((item) => item.userId ?? item.anonymousId).filter(Boolean),
        ).size,
      };
    }),
    period: {
      from: toIso(from),
      to: toIso(NOW),
    },
  };
}

export function buildExperimentDetail(experiment: Experiment, offset: number): ExperimentDetail {
  const totalParticipants = 780 + offset * 90;
  const controlRate = 0.118 + offset * 0.003;

  const results = experiment.variants.map((variant, index) => {
    const participants = Math.round(totalParticipants * variant.weight);
    const conversionRate = variant.isControl ? controlRate : controlRate + 0.024 - index * 0.004;
    const conversions = Math.round(participants * conversionRate);
    const uplift = variant.isControl
      ? 0
      : Number((((conversionRate - controlRate) / controlRate) * 100).toFixed(2));

    return {
      variantId: variant.id,
      variantName: variant.name,
      participants,
      conversions,
      conversionRate: Number(conversionRate.toFixed(4)),
      uplift,
      isSignificant: !variant.isControl && uplift >= 8,
    };
  });

  return {
    experiment,
    results,
    totalParticipants,
    confidence: experiment.status === "completed" ? 0.97 : 0.93,
    winner: results.find((result) => result.isSignificant && result.uplift > 0)?.variantId ?? null,
  };
}

export function buildFunnelDetail(dataset: ProjectDataset, funnel: Funnel): FunnelDetail {
  const eventsBySession = new Map(
    dataset.sessions.map((session) => [
      session.sessionId,
      dataset.events
        .filter((event) => event.sessionId === session.sessionId)
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()),
    ]),
  );

  const progression = dataset.sessions
    .map((session) => {
      const events = eventsBySession.get(session.sessionId) ?? [];
      const matchedSteps: Array<{ index: number; timestamp: string }> = [];
      let lastMatchIndex = -1;

      for (const [stepIndex, step] of funnel.steps.entries()) {
        const eventIndex = events.findIndex(
          (event, index) => index > lastMatchIndex && event.name === step.eventName,
        );

        if (eventIndex === -1) {
          break;
        }

        lastMatchIndex = eventIndex;
        matchedSteps.push({ index: stepIndex, timestamp: events[eventIndex].timestamp });
      }

      return { session, matchedSteps };
    })
    .filter((entry) => entry.matchedSteps.length > 0);

  const totalEntrants = progression.length;
  const completed = progression.filter((entry) => entry.matchedSteps.length === funnel.steps.length);

  const steps: FunnelStepAnalytics[] = funnel.steps.map((step, index) => {
    const reachedSessions = progression.filter((entry) => entry.matchedSteps.length > index);
    const nextSessions = progression.filter((entry) => entry.matchedSteps.length > index + 1);
    const avgTimeToNextStep =
      index < funnel.steps.length - 1
        ? average(
            progression
              .filter((entry) => entry.matchedSteps.length > index + 1)
              .map((entry) => {
                const current = new Date(entry.matchedSteps[index].timestamp).getTime();
                const next = new Date(entry.matchedSteps[index + 1].timestamp).getTime();
                return (next - current) / 1000;
              }),
          )
        : null;

    return {
      step,
      reachedSessions: reachedSessions.length,
      conversionRate: totalEntrants === 0 ? 0 : Number((reachedSessions.length / totalEntrants).toFixed(4)),
      dropOffRate:
        index === funnel.steps.length - 1 || reachedSessions.length === 0
          ? 0
          : Number((1 - nextSessions.length / reachedSessions.length).toFixed(4)),
      avgTimeToNextStep:
        avgTimeToNextStep === null ? null : Number(avgTimeToNextStep.toFixed(1)),
    };
  });

  const recentSessions: FunnelSessionPreview[] = progression
    .slice()
    .sort(
      (left, right) =>
        new Date(right.session.startedAt).getTime() - new Date(left.session.startedAt).getTime(),
    )
    .slice(0, 8)
    .map((entry) => ({
      sessionId: entry.session.sessionId,
      startedAt: entry.session.startedAt,
      userId: entry.session.userId,
      anonymousId: entry.session.anonymousId,
      entryPage: entry.session.entryPage,
      completed: entry.matchedSteps.length === funnel.steps.length,
      completedAt:
        entry.matchedSteps.length === funnel.steps.length
          ? entry.matchedSteps[entry.matchedSteps.length - 1].timestamp
          : null,
    }));

  const avgCompletionTime =
    completed.length === 0
      ? null
      : Number(
          average(
            completed.map((entry) => {
              const start = new Date(entry.matchedSteps[0].timestamp).getTime();
              const end = new Date(entry.matchedSteps[entry.matchedSteps.length - 1].timestamp).getTime();
              return (end - start) / 1000;
            }),
          ).toFixed(1),
        );

  return {
    funnel,
    totalEntrants,
    completedSessions: completed.length,
    overallConversionRate:
      totalEntrants === 0 ? 0 : Number((completed.length / totalEntrants).toFixed(4)),
    avgCompletionTime,
    steps,
    recentSessions,
  };
}

export function buildRevenueTimeline(dataset: ProjectDataset): RevenueTimeline {
  const buckets = new Map<string, RevenueTimelinePoint>();

  Array.from({ length: 6 }, (_, index) => monthKey(subMonths(NOW, 5 - index))).forEach((key) => {
    buckets.set(key, { date: key, mrr: 0, arr: 0, newMrr: 0, churnedMrr: 0, expansionMrr: 0 });
  });

  dataset.revenueEvents.forEach((event) => {
    const bucket = buckets.get(monthKey(event.timestamp));
    if (!bucket) return;

    if (event.type === "new_subscription" || event.type === "payment") {
      bucket.newMrr += event.amount;
    } else if (event.type === "upgrade") {
      bucket.expansionMrr += event.amount;
    } else if (event.type === "cancellation") {
      bucket.churnedMrr += event.amount;
    }
  });

  let runningMrr = 0;
  return {
    data: [...buckets.values()].map((bucket) => {
      runningMrr += bucket.newMrr + bucket.expansionMrr - bucket.churnedMrr;
      return {
        ...bucket,
        mrr: Math.max(0, Number(runningMrr.toFixed(2))),
        arr: Math.max(0, Number((runningMrr * 12).toFixed(2))),
      };
    }),
  };
}

export function buildRevenueMetrics(dataset: ProjectDataset): RevenueMetrics {
  const activeCustomers = dataset.customers.filter((customer) => customer.status === "active");
  const trialingCustomers = dataset.customers.filter((customer) => customer.status === "trialing");
  const churnedCustomers = dataset.customers.filter((customer) => customer.status === "churned");
  const currentMrr = sum(activeCustomers.map((customer) => customer.mrr));
  const timeline = buildRevenueTimeline(dataset).data;
  const previousMrr = timeline.length > 1 ? timeline[timeline.length - 2]?.mrr ?? currentMrr : currentMrr;
  const expansionRevenue = sum(
    dataset.revenueEvents
      .filter((event) => event.type === "upgrade" && new Date(event.timestamp) >= subDays(NOW, 30))
      .map((event) => event.amount),
  );
  const churnedRevenue = sum(
    dataset.revenueEvents
      .filter((event) => event.type === "cancellation" && new Date(event.timestamp) >= subDays(NOW, 30))
      .map((event) => event.amount),
  );

  return {
    mrr: Number(currentMrr.toFixed(2)),
    arr: Number((currentMrr * 12).toFixed(2)),
    churnRate: Number(
      (
        churnedCustomers.length /
        Math.max(1, activeCustomers.length + trialingCustomers.length)
      ).toFixed(4),
    ),
    ltv: Number(average(dataset.customers.map((customer) => customer.ltv)).toFixed(2)),
    arpu: Number((currentMrr / Math.max(1, activeCustomers.length)).toFixed(2)),
    cac: 0,
    activeCustomers: activeCustomers.length,
    newCustomers: dataset.customers.filter((customer) => new Date(customer.createdAt) >= subDays(NOW, 30)).length,
    churnedCustomers: churnedCustomers.length,
    expansionRevenue: Number(expansionRevenue.toFixed(2)),
    mrrGrowth: Number(((currentMrr - previousMrr) / Math.max(1, previousMrr)).toFixed(4)),
    netRevenueRetention: Number(((previousMrr + expansionRevenue - churnedRevenue) / Math.max(1, previousMrr)).toFixed(4)),
    benchmarks: {
      avgChurnRate: 0.035,
      avgArpu: 129,
      avgMrrGrowth: 0.065,
    },
    period: {
      from: toIso(subDays(NOW, 30)),
      to: toIso(NOW),
    },
  };
}

export function buildRevenuePlans(dataset: ProjectDataset): PlanRevenue[] {
  const grouped = new Map<string, { customers: number; mrr: number }>();

  dataset.customers
    .filter((customer) => customer.status === "active")
    .forEach((customer) => {
      const key = customer.plan ?? "No plan";
      const current = grouped.get(key) ?? { customers: 0, mrr: 0 };
      current.customers += 1;
      current.mrr += customer.mrr;
      grouped.set(key, current);
    });

  const totalMrr = sum([...grouped.values()].map((entry) => entry.mrr));

  return [...grouped.entries()]
    .map(([plan, values]) => ({
      plan,
      customers: values.customers,
      mrr: Number(values.mrr.toFixed(2)),
      percentage: totalMrr === 0 ? 0 : Number(((values.mrr / totalMrr) * 100).toFixed(1)),
    }))
    .sort((left, right) => right.mrr - left.mrr);
}

export function buildInsights(dataset: ProjectDataset): InsightsResponse {
  const metrics = buildRevenueMetrics(dataset);
  const overview = buildOverview(dataset);
  const insights: Insight[] = [
    {
      id: `${dataset.project.id}-insight-1`,
      type: "revenue",
      severity: metrics.mrrGrowth >= 0.06 ? "positive" : "warning",
      title: metrics.mrrGrowth >= 0.06 ? "MRR crescendo no ritmo certo" : "MRR abaixo da meta",
      description: `Seu MRR atual é R$ ${metrics.mrr.toFixed(2)} com crescimento de ${(metrics.mrrGrowth * 100).toFixed(1)}% no período.`,
      metric: "mrrGrowth",
      value: metrics.mrrGrowth,
      recommendation: "Priorize expansão nos clientes ativos com playbooks de upgrade baseados em uso.",
    },
    {
      id: `${dataset.project.id}-insight-2`,
      type: "product",
      severity: overview.bounceRate > 0.3 ? "warning" : "positive",
      title: overview.bounceRate > 0.3 ? "Bounce alto nas sessões novas" : "Engajamento consistente",
      description: `Bounce em ${(overview.bounceRate * 100).toFixed(1)}% e média de sessão em ${overview.avgSessionDuration.toFixed(0)}s.`,
      metric: "bounceRate",
      value: overview.bounceRate,
      recommendation: "Vale testar onboarding contextual na primeira visita e reduzir o tempo até o primeiro valor.",
    },
    {
      id: `${dataset.project.id}-insight-3`,
      type: "benchmark",
      severity: "neutral",
      title: "Benchmark de SaaS nacional",
      description: "Você já tem base para comparar churn, ARPU e crescimento de MRR com peers brasileiros.",
      metric: "benchmark",
      value: 0,
      recommendation: "Use isso para alinhar metas trimestrais e priorizar crescimento saudável, não só volume.",
    },
  ];

  return { insights, generatedAt: toIso(NOW) };
}

export function buildAlerts(dataset: ProjectDataset): Alert[] {
  const recentErrors = dataset.logs.filter(
    (entry) => entry.level === "error" && new Date(entry.timestamp) >= subHours(NOW, 24),
  );
  const recentChurn = dataset.customers.filter(
    (customer) => customer.status === "churned" && customer.churnedAt && new Date(customer.churnedAt) >= subHours(NOW, 24),
  );
  const alerts: Alert[] = [];

  if (recentErrors.length >= 4) {
    alerts.push({
      id: `${dataset.project.id}-alert-errors`,
      type: "error_spike",
      severity: "critical",
      title: "Pico de erros em produção",
      description: `${recentErrors.length} erros críticos foram registrados nas últimas 24 horas.`,
      value: recentErrors.length,
      threshold: 4,
      createdAt: toIso(NOW),
    });
  }

  if (recentChurn.length >= 2) {
    alerts.push({
      id: `${dataset.project.id}-alert-churn`,
      type: "churn_spike",
      severity: "warning",
      title: "Cancelamentos acima do normal",
      description: `${recentChurn.length} contas cancelaram em menos de 24 horas.`,
      value: recentChurn.length,
      threshold: 2,
      createdAt: toIso(NOW),
    });
  }

  return alerts;
}

export function deriveCollections(dataset: ProjectDataset): DatastoreCollection[] {
  return Object.entries(dataset.datastore)
    .map(([name, records]) => {
      const createdAt = records.reduce((earliest, record) => {
        return new Date(record.createdAt) < new Date(earliest) ? record.createdAt : earliest;
      }, records[0]?.createdAt ?? toIso(NOW));
      const updatedAt = records.reduce((latest, record) => {
        return new Date(record.createdAt) > new Date(latest) ? record.createdAt : latest;
      }, records[0]?.createdAt ?? toIso(NOW));

      return { name, recordCount: records.length, createdAt, updatedAt };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}
