import { pgTable, text, timestamp, uuid, real, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const featureFlagsTable = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  rolloutPercentage: real("rollout_percentage").notNull().default(0),
  targetingRules: jsonb("targeting_rules").default([]),
  variants: jsonb("variants").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("feature_flags_project_id_idx").on(t.projectId),
  index("feature_flags_key_idx").on(t.key),
]);

export const insertFeatureFlagSchema = createInsertSchema(featureFlagsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlagRecord = typeof featureFlagsTable.$inferSelect;
