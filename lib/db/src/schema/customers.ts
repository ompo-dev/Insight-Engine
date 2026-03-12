import { pgTable, text, timestamp, uuid, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  externalId: text("external_id"),
  email: text("email").notNull(),
  name: text("name"),
  status: text("status").notNull().default("active"),
  plan: text("plan"),
  mrr: real("mrr").default(0),
  ltv: real("ltv").default(0),
  country: text("country"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  churnedAt: timestamp("churned_at"),
  metadata: jsonb("metadata"),
}, (t) => [
  index("customers_project_id_idx").on(t.projectId),
  index("customers_email_idx").on(t.email),
  index("customers_status_idx").on(t.status),
]);

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type CustomerRecord = typeof customersTable.$inferSelect;
