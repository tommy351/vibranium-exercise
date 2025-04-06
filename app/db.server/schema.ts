import { isNotNull } from "drizzle-orm";
import {
  pgTable,
  uuid,
  vector,
  timestamp,
  jsonb,
  index,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { v7 as genUuidV7 } from "uuid";
import type { MessageChunk } from "~/db/message";

const uuidV7 = uuid().$defaultFn(() => genUuidV7());

export const responsesTable = pgTable(
  "responses",
  {
    id: uuid().primaryKey().defaultRandom(),
    input: jsonb().notNull(),
    output: jsonb().notNull(),
    vector: vector({ dimensions: 1024 }).notNull(),
    summary: text(),
    tags: text().array(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index("responses_vector_cosine_idx").using(
      "hnsw",
      table.vector.op("vector_cosine_ops"),
    ),
  ],
);

export const usersTable = pgTable(
  "users",
  {
    id: uuidV7.primaryKey(),
    name: text(),
    email: text(),
    firstName: text(),
    lastName: text(),
    realName: text(),
    displayName: text(),
    slackUserId: text().notNull(),
    slackTeamId: text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => [unique().on(table.slackTeamId, table.slackUserId)],
);

export const threadsTable = pgTable(
  "threads",
  {
    id: uuidV7.primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => usersTable.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      }),
    slackThreadTs: text(),
    summary: text(),
    tags: text().array(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index().on(table.userId),
    uniqueIndex()
      .onOnly(table.userId, table.slackThreadTs)
      .where(isNotNull(table.slackThreadTs)),
  ],
);

export const messagesTable = pgTable(
  "messages",
  {
    id: uuidV7.primaryKey(),
    threadId: uuid()
      .notNull()
      .references(() => threadsTable.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      }),
    type: text().notNull(),
    content: jsonb().notNull().$type<MessageChunk[]>(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [index().on(table.threadId)],
);
