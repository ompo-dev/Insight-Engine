import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const funnelsTable = pgTable("funnels", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  steps: jsonb("steps").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("funnels_project_id_idx").on(t.projectId),
]);

export const insertFunnelSchema = createInsertSchema(funnelsTable).omit({ id: true, createdAt: true });
export type InsertFunnel = z.infer<typeof insertFunnelSchema>;
export type FunnelRecord = typeof funnelsTable.$inferSelect;
