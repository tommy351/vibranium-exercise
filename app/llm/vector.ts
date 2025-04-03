import { cosineDistance, desc, gt, InferInsertModel, sql } from "drizzle-orm";
import { OpenAIEmbeddings } from "@langchain/openai";
import { db } from "~/db/drizzle";
import { responsesTable } from "~/db/schema";
import { decodeMessage, type EncodedMessage } from "./message";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  dimensions: 512,
});

export async function generateEmbedding(text: EncodedMessage[]) {
  return (
    (await embeddings.embedQuery(JSON.stringify(text)))
      // Transform nulls to 0
      .map((v) => v || 0)
      // Remove excess values
      .slice(0, embeddings.dimensions)
  );
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
      .orderBy(desc(sql`similarity`), desc(responsesTable.createdAt))
      .limit(1),
  );

  const result = await db
    .with(cte)
    .select({
      output: cte.output,
      similarity: cte.similarity,
    })
    .from(cte)
    .where(gt(cte.similarity, 0.8));

  return result.length ? decodeMessage(result[0].output) : undefined;
}

export async function saveResponse(
  data: InferInsertModel<typeof responsesTable>,
) {
  await db.insert(responsesTable).values(data);
}
