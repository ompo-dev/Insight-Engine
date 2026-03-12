import { pgTable, text, timestamp, uuid, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const requestsTable = pgTable("requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  method: text("method").notNull(),
  url: text("url").notNull(),
  statusCode: integer("status_code").notNull(),
  duration: real("duration").notNull(),
  requestSize: integer("request_size"),
  responseSize: integer("response_size"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  traceId: text("trace_id"),
  error: text("error"),
}, (t) => [
  index("requests_project_id_idx").on(t.projectId),
  index("requests_timestamp_idx").on(t.timestamp),
]);

export const insertRequestSchema = createInsertSchema(requestsTable).omit({ id: true });
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type RequestRecord = typeof requestsTable.$inferSelect;
