import {
  pgTable,
  uuid,
  vector,
  timestamp,
  jsonb,
  index,
  text,
} from "drizzle-orm/pg-core";
import { v7 as uuidV7 } from "uuid";

export const responsesTable = pgTable(
  "responses",
  {
    id: uuid().primaryKey().defaultRandom(),
    input: jsonb().notNull(),
    output: jsonb().notNull(),
    vector: vector({ dimensions: 1024 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index("responses_vector_cosine_idx").using(
      "hnsw",
      table.vector.op("vector_cosine_ops"),
    ),
  ],
);

export const logsTable = pgTable("logs", {
  id: uuid()
    .primaryKey()
    .$defaultFn(() => uuidV7()),
  userId: text().notNull(),
  threadId: text().notNull(),
  input: text().notNull(),
  output: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});
