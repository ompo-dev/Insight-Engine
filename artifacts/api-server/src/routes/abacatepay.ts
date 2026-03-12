import { Router } from "express";
import { db } from "@workspace/db";
import { integrationsTable, customersTable, revenueEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/status", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const [integration] = await db.select().from(integrationsTable)
    .where(and(eq(integrationsTable.projectId, projectId), eq(integrationsTable.provider, "abacatepay")));

  if (!integration) {
    res.json({ connected: false });
    return;
  }

  res.json({
    connected: integration.connected,
    lastSyncAt: integration.lastSyncAt,
    totalSynced: (integration.config as any)?.totalSynced ?? 0,
  });
});

router.post("/connect", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const { apiKey, webhookSecret } = req.body as { apiKey: string; webhookSecret?: string };

  const existing = await db.select().from(integrationsTable)
    .where(and(eq(integrationsTable.projectId, projectId), eq(integrationsTable.provider, "abacatepay")));

  if (existing.length > 0) {
    const [updated] = await db.update(integrationsTable).set({
      apiKey,
      webhookSecret: webhookSecret ?? null,
      connected: true,
      config: { totalSynced: 0 },
    }).where(and(eq(integrationsTable.projectId, projectId), eq(integrationsTable.provider, "abacatepay"))).returning();
    res.json({ connected: true, lastSyncAt: updated.lastSyncAt });
    return;
  }

  await db.insert(integrationsTable).values({
    projectId,
    provider: "abacatepay",
    apiKey,
    webhookSecret: webhookSecret ?? null,
    connected: true,
    config: { totalSynced: 0 },
  });

  res.json({ connected: true, lastSyncAt: null, totalSynced: 0 });
});

router.post("/webhook", async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const payload = req.body as any;

  const eventType = payload?.event ?? payload?.type ?? "unknown";

  try {
    if (eventType === "billing.subscription.created" || eventType === "payment.created") {
      const amount = payload?.data?.amount ?? payload?.amount ?? 0;
      const email = payload?.data?.customer?.email ?? payload?.customer_email;

      if (email) {
        const existing = await db.select().from(customersTable)
          .where(and(eq(customersTable.projectId, projectId), eq(customersTable.email, email)));

        if (existing.length === 0) {
          await db.insert(customersTable).values({
            projectId,
            email,
            name: payload?.data?.customer?.name ?? null,
            status: "active",
            plan: payload?.data?.plan?.name ?? null,
            mrr: amount / 100,
            ltv: amount / 100,
          });
        }

        await db.insert(revenueEventsTable).values({
          projectId,
          type: eventType.includes("subscription") ? "new_subscription" : "payment",
          amount: amount / 100,
          currency: "BRL",
          customerEmail: email,
          plan: payload?.data?.plan?.name ?? null,
          externalId: payload?.id ?? null,
          source: "abacatepay",
          metadata: payload,
        });
      }
    }

    if (eventType === "billing.subscription.canceled") {
      const email = payload?.data?.customer?.email;
      if (email) {
        await db.update(customersTable).set({ status: "churned", churnedAt: new Date() })
          .where(and(eq(customersTable.projectId, projectId), eq(customersTable.email, email)));

        await db.insert(revenueEventsTable).values({
          projectId,
          type: "cancellation",
          amount: payload?.data?.amount ?? 0,
          currency: "BRL",
          customerEmail: email,
          source: "abacatepay",
          metadata: payload,
        });
      }
    }
  } catch (err) {
    console.error("Abacate Pay webhook error:", err);
  }

  res.json({ ok: true });
});

router.post("/sync", async (req, res) => {
  const { projectId } = req.params as { projectId: string };

  const [integration] = await db.select().from(integrationsTable)
    .where(and(eq(integrationsTable.projectId, projectId), eq(integrationsTable.provider, "abacatepay")));

  if (!integration?.connected || !integration.apiKey) {
    res.status(400).json({ error: "Abacate Pay not connected" });
    return;
  }

  await db.update(integrationsTable).set({
    lastSyncAt: new Date(),
    config: { ...(integration.config as any), totalSynced: ((integration.config as any)?.totalSynced ?? 0) },
  }).where(eq(integrationsTable.id, integration.id));

  res.json({ customersImported: 0, paymentsImported: 0, errors: 0 });
});

export default router;
