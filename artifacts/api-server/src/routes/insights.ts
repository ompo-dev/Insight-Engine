import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, customersTable, revenueEventsTable, logsTable } from "@workspace/db";
import { eq, and, gte, count, desc, sum, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [activeCustomers] = await db.select({ count: count() }).from(customersTable)
    .where(and(eq(customersTable.projectId, projectId), eq(customersTable.status, "active")));

  const [churnedRecently] = await db.select({ count: count() }).from(customersTable)
    .where(and(eq(customersTable.projectId, projectId), eq(customersTable.status, "churned"), gte(customersTable.churnedAt!, thirtyDaysAgo)));

  const [topEvent] = await db.select({ name: eventsTable.name, cnt: count() }).from(eventsTable)
    .where(and(eq(eventsTable.projectId, projectId), gte(eventsTable.timestamp, thirtyDaysAgo)))
    .groupBy(eventsTable.name).orderBy(desc(count())).limit(1);

  const mrrResult = await db.select({ mrr: sum(customersTable.mrr) }).from(customersTable)
    .where(and(eq(customersTable.projectId, projectId), eq(customersTable.status, "active")));
  const mrr = Number(mrrResult[0]?.mrr ?? 0);

  const activeCount = Number(activeCustomers?.count ?? 0);
  const churnedCount = Number(churnedRecently?.count ?? 0);
  const churnRate = activeCount > 0 ? churnedCount / activeCount : 0;

  const insights: any[] = [];

  if (mrr > 0) {
    insights.push({
      id: randomUUID(),
      type: "revenue",
      severity: "positive",
      title: "MRR Ativo",
      description: `Seu MRR atual é R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} com ${activeCount} clientes ativos.`,
      metric: "mrr",
      value: mrr,
      recommendation: "Continue monitorando o crescimento mensal e compare com o benchmark de 6-8% ao mês.",
    });
  }

  if (churnRate > 0.05) {
    insights.push({
      id: randomUUID(),
      type: "churn",
      severity: "warning",
      title: "Taxa de Churn Elevada",
      description: `Sua taxa de churn é ${(churnRate * 100).toFixed(1)}% — acima da média de micro-SaaS (3-4%).`,
      metric: "churnRate",
      value: churnRate,
      recommendation: "Implemente um fluxo de onboarding mais robusto nas primeiras 72 horas de uso para reduzir cancelamentos.",
    });
  } else if (churnRate > 0) {
    insights.push({
      id: randomUUID(),
      type: "churn",
      severity: "positive",
      title: "Churn Controlado",
      description: `Sua taxa de churn de ${(churnRate * 100).toFixed(1)}% está dentro da média saudável para micro-SaaS.`,
      metric: "churnRate",
      value: churnRate,
      recommendation: "Foque em expansion revenue: upsell para clientes ativos é mais barato que adquirir novos.",
    });
  }

  if (topEvent) {
    insights.push({
      id: randomUUID(),
      type: "product",
      severity: "neutral",
      title: "Evento Mais Popular",
      description: `"${topEvent.name}" é o evento mais frequente com ${Number(topEvent.cnt)} ocorrências nos últimos 30 dias.`,
      metric: "events",
      value: Number(topEvent.cnt),
      recommendation: `Usuários que disparam "${topEvent.name}" provavelmente são os mais engajados. Considere criar uma feature flag exclusiva para eles.`,
    });
  }

  if (activeCount > 0) {
    const arpu = mrr / activeCount;
    const benchmarkArpu = 89;
    if (arpu < benchmarkArpu * 0.5) {
      insights.push({
        id: randomUUID(),
        type: "revenue",
        severity: "warning",
        title: "ARPU Abaixo da Média",
        description: `Seu ARPU é R$ ${arpu.toFixed(2)}, abaixo da média de R$ ${benchmarkArpu} para micro-SaaS.`,
        metric: "arpu",
        value: arpu,
        recommendation: "Considere revisar sua estratégia de precificação ou adicionar um plano premium com features exclusivas.",
      });
    }
  }

  insights.push({
    id: randomUUID(),
    type: "benchmark",
    severity: "neutral",
    title: "Benchmark SaaS Brasileiro",
    description: "Compare suas métricas com a média de micro-SaaS no Brasil.",
    metric: "benchmark",
    value: 0,
    recommendation: "Churn médio: 3.5% | ARPU médio: R$ 89 | Crescimento MRR médio: 6%/mês",
  });

  res.json({ insights, generatedAt: new Date().toISOString() });
});

router.get("/alerts", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [errorCount] = await db.select({ count: count() }).from(logsTable)
    .where(and(eq(logsTable.projectId, projectId), eq(logsTable.level, "error"), gte(logsTable.timestamp, oneDayAgo)));

  const [churnedToday] = await db.select({ count: count() }).from(customersTable)
    .where(and(eq(customersTable.projectId, projectId), eq(customersTable.status, "churned"), gte(customersTable.churnedAt!, oneDayAgo)));

  const alerts: any[] = [];

  if (Number(errorCount?.count ?? 0) > 10) {
    alerts.push({
      id: randomUUID(),
      type: "error_spike",
      severity: "critical",
      title: "Pico de Erros Detectado",
      description: `${errorCount?.count} erros registrados nas últimas 24 horas — investigação recomendada.`,
      value: Number(errorCount?.count ?? 0),
      threshold: 10,
      createdAt: new Date().toISOString(),
    });
  }

  if (Number(churnedToday?.count ?? 0) > 2) {
    alerts.push({
      id: randomUUID(),
      type: "churn_spike",
      severity: "warning",
      title: "Cancelamentos Acima do Normal",
      description: `${churnedToday?.count} clientes cancelaram nas últimas 24 horas.`,
      value: Number(churnedToday?.count ?? 0),
      threshold: 2,
      createdAt: new Date().toISOString(),
    });
  }

  res.json(alerts);
});

export default router;
