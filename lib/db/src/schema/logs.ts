import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logsTable = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  service: text("service"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  meta: jsonb("meta"),
  traceId: text("trace_id"),
  spanId: text("span_id"),
}, (t) => [
  index("logs_project_id_idx").on(t.projectId),
  index("logs_timestamp_idx").on(t.timestamp),
  index("logs_level_idx").on(t.level),
]);

export const insertLogSchema = createInsertSchema(logsTable).omit({ id: true });
export type InsertLog = z.infer<typeof insertLogSchema>;
export type LogRecord = typeof logsTable.$inferSelect;
