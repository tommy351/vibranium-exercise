import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";
import { pool } from "./db";

const NODE_MODEL = "model";

const llm = new ChatOpenAI({
  model: "gpt-4o",
});

const checkpointer = new PostgresSaver(pool);

await checkpointer.setup();

const workflow = new StateGraph(MessagesAnnotation)
  .addNode(NODE_MODEL, async (state) => {
    const response = await llm.invoke(state.messages);
    return { messages: response };
  })
  .addEdge(START, NODE_MODEL)
  .addEdge(NODE_MODEL, END);

export const app = workflow.compile({ checkpointer });
