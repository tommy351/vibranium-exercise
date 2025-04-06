import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { OpenAIEmbeddings } from "@langchain/openai";
import { BaseMessage, getBufferString } from "@langchain/core/messages";
import { db } from "~/db.server/drizzle";
import { responsesTable } from "~/db.server/schema";
import { decodeMessage } from "./message";
import { logger } from "~/util.server/log";

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
        id: responsesTable.id,
        output: responsesTable.output,
        summary: responsesTable.summary,
        tags: responsesTable.tags,
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
      id: cte.id,
      output: cte.output,
      summary: cte.summary,
      tags: cte.tags,
    })
    .from(cte)
    .where(gt(cte.similarity, SIMILARITY_THRESHOLD));

  if (result.length) {
    logger.debug({ result }, "Found past response");

    return {
      ...result[0],
      output: decodeMessage(result[0].output),
    };
  }
}
