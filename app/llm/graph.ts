import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { pool } from "~/db/pool";
import { logger } from "~/util/log";
import { findPastResponse, generateEmbedding, saveResponse } from "./vector";
import { runInBackground } from "~/util/queue";
import { encodeMessage, encodeMessages } from "./message";

const NODE_MODEL = "model";
const SYSTEM_MESSAGE = new SystemMessage("You are a helpful assistant.");
const LLM_MODEL = "gpt-4o";

const llm = new ChatOpenAI({
  model: LLM_MODEL,
  temperature: 0,
});

const checkpointer = new PostgresSaver(pool);

await checkpointer.setup();

const workflow = new StateGraph(MessagesAnnotation)
  .addNode(NODE_MODEL, async (state) => {
    const vector = await generateEmbedding(state.messages);
    const pastResponse = await findPastResponse(vector);

    if (pastResponse) {
      return { messages: pastResponse };
    }

    const llmResponse = await llm.invoke([SYSTEM_MESSAGE, ...state.messages]);
    logger.debug({ response: llmResponse }, "Received LLM response");

    // Save response in background
    runInBackground(() =>
      saveResponse({
        input: encodeMessages(state.messages),
        vector,
        output: encodeMessage(llmResponse),
      }),
    );

    return { messages: llmResponse };
  })
  .addEdge(START, NODE_MODEL)
  .addEdge(NODE_MODEL, END);

export const graph = workflow.compile({ checkpointer });
