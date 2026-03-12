import { pgTable, text, timestamp, uuid, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const revenueEventsTable = pgTable("revenue_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("BRL"),
  customerId: text("customer_id"),
  customerEmail: text("customer_email"),
  plan: text("plan"),
  description: text("description"),
  externalId: text("external_id"),
  source: text("source").notNull().default("manual"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metadata: jsonb("metadata"),
}, (t) => [
  index("revenue_events_project_id_idx").on(t.projectId),
  index("revenue_events_timestamp_idx").on(t.timestamp),
  index("revenue_events_type_idx").on(t.type),
]);

export const insertRevenueEventSchema = createInsertSchema(revenueEventsTable).omit({ id: true });
export type InsertRevenueEvent = z.infer<typeof insertRevenueEventSchema>;
export type RevenueEventRecord = typeof revenueEventsTable.$inferSelect;
