import { pgTable, text, timestamp, uuid, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const integrationsTable = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  provider: text("provider").notNull(),
  apiKey: text("api_key"),
  webhookSecret: text("webhook_secret"),
  connected: boolean("connected").notNull().default(false),
  lastSyncAt: timestamp("last_sync_at"),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("integrations_project_id_idx").on(t.projectId),
]);

export const insertIntegrationSchema = createInsertSchema(integrationsTable).omit({ id: true, createdAt: true });
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type IntegrationRecord = typeof integrationsTable.$inferSelect;
