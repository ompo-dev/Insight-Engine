import { pgTable, text, timestamp, uuid, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionsTable = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id"),
  anonymousId: text("anonymous_id"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  duration: real("duration"),
  eventCount: integer("event_count").notNull().default(0),
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ip: text("ip"),
  country: text("country"),
  device: text("device"),
}, (t) => [
  index("sessions_project_id_idx").on(t.projectId),
  index("sessions_session_id_idx").on(t.sessionId),
  index("sessions_started_at_idx").on(t.startedAt),
]);

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type SessionRecord = typeof sessionsTable.$inferSelect;
