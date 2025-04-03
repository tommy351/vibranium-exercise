import { pgTable, uuid, vector, timestamp, jsonb } from "drizzle-orm/pg-core";

export const responsesTable = pgTable("responses", {
  id: uuid().primaryKey().defaultRandom(),
  input: jsonb().notNull(),
  output: jsonb().notNull(),
  vector: vector({ dimensions: 512 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});
