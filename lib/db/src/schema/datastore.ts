import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const datastoreTable = pgTable("datastore", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  collection: text("collection").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("datastore_project_id_idx").on(t.projectId),
  index("datastore_collection_idx").on(t.collection),
]);

export const insertDatastoreSchema = createInsertSchema(datastoreTable).omit({ id: true, createdAt: true });
export type InsertDatastore = z.infer<typeof insertDatastoreSchema>;
export type DatastoreRecord = typeof datastoreTable.$inferSelect;
