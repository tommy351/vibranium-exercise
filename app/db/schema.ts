import {
  pgTable,
  uuid,
  vector,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

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
