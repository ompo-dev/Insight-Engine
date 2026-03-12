import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  name: text("name").notNull(),
  sessionId: text("session_id"),
  userId: text("user_id"),
  anonymousId: text("anonymous_id"),
  properties: jsonb("properties"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  url: text("url"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ip: text("ip"),
}, (t) => [
  index("events_project_id_idx").on(t.projectId),
  index("events_timestamp_idx").on(t.timestamp),
  index("events_session_id_idx").on(t.sessionId),
]);

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRecord = typeof eventsTable.$inferSelect;
