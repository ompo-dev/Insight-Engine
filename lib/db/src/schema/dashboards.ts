import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dashboardsTable = pgTable("dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  widgets: jsonb("widgets").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("dashboards_project_id_idx").on(t.projectId),
]);

export const insertDashboardSchema = createInsertSchema(dashboardsTable).omit({ id: true, createdAt: true });
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;
export type DashboardRecord = typeof dashboardsTable.$inferSelect;
