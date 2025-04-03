import {
  cosineDistance,
  desc,
  gt,
  type InferInsertModel,
  sql,
} from "drizzle-orm";
import { OpenAIEmbeddings } from "@langchain/openai";
import { BaseMessage, getBufferString } from "@langchain/core/messages";
import { db } from "~/db/drizzle";
import { responsesTable } from "~/db/schema";
import { decodeMessage } from "./message";
import { logger } from "~/util/log";

// Range from 0 to 1
const SIMILARITY_THRESHOLD = 0.99;

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  dimensions: 1024,
});

export function generateEmbedding(messages: BaseMessage[]): Promise<number[]> {
  return embeddings.embedQuery(getBufferString(messages));
}

export async function findPastResponse(vector: number[]) {
  const cte = db.$with("similarities").as(
    db
      .select({
        output: responsesTable.output,
        similarity:
          sql<number>`1 - (${cosineDistance(responsesTable.vector, vector)})`.as(
            "similarity",
          ),
      })
      .from(responsesTable)
      .orderBy(desc(sql`similarity`))
      .limit(1),
  );

  const result = await db
    .with(cte)
    .select({
      output: cte.output,
      similarity: cte.similarity,
    })
    .from(cte)
    .where((table) => gt(table.similarity, SIMILARITY_THRESHOLD));

  if (result.length) {
    logger.debug({ result }, "Found past response");
    return decodeMessage(result[0].output);
  }
}

export async function saveResponse(
  data: InferInsertModel<typeof responsesTable>,
) {
  await db.insert(responsesTable).values(data);
}
