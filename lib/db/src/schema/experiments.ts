import { pgTable, text, timestamp, uuid, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const experimentsTable = pgTable("experiments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  hypothesis: text("hypothesis"),
  variants: jsonb("variants").notNull().default([]),
  metric: text("metric"),
  targetSampleSize: integer("target_sample_size"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
}, (t) => [
  index("experiments_project_id_idx").on(t.projectId),
]);

export const insertExperimentSchema = createInsertSchema(experimentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type ExperimentRecord = typeof experimentsTable.$inferSelect;
