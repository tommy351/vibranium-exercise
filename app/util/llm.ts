import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";
import { trimMessages } from "@langchain/core/messages";
import { pool } from "./db";

const NODE_MODEL = "model";
const SYSTEM_MESSAGE = {
  role: "system",
  content: "You are a helpful assistant.",
};

const llm = new ChatOpenAI({
  model: "gpt-4o",
});

const checkpointer = new PostgresSaver(pool);

await checkpointer.setup();

const trimmer = trimMessages({
  strategy: "last",
  maxTokens: 100,
  tokenCounter: (msgs) => msgs.length,
});

const workflow = new StateGraph(MessagesAnnotation)
  .addNode(NODE_MODEL, async (state) => {
    const trimmed = await trimmer.invoke(state.messages);
    const response = await llm.invoke([SYSTEM_MESSAGE, ...trimmed]);

    return { messages: response };
  })
  .addEdge(START, NODE_MODEL)
  .addEdge(NODE_MODEL, END);

export const app = workflow.compile({ checkpointer });
