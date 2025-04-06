import {
  Annotation,
  Command,
  END,
  messagesStateReducer,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { pool } from "~/db.server/pool";
import { logger } from "~/util.server/log";
import { findPastResponse, generateEmbedding } from "./vector";
import { encodeMessage, encodeMessages } from "./message";
import { z } from "zod";
import { responsesTable } from "~/db.server/schema";
import { db } from "~/db.server/drizzle";
import { v4 as uuidV4 } from "uuid";
import { eq } from "drizzle-orm";

const NODE_GENERATE_VECTOR = "generate_vector";
const NODE_REUSE_HISTORY = "reuse_history";
const NODE_CALL_MODEL = "call_model";
const NODE_SUMMARIZE = "summarize";

const SYSTEM_MESSAGE_CALL =
  new SystemMessage(`You are a helpful assistant with access to uploaded documents.

When users upload files, the content will be provided to you wrapped in XML <file> tags like this:
<file name="example.csv" type="text/csv">
File content goes here...
</file>

When answering questions:
1. Parse content within <file> tags to access document information
2. Pay attention to the file name attribute to understand what type of file you're working with
3. Reference specific information from the documents when appropriate
4. If a user asks about a document that hasn't been uploaded or you don't have access to, politely let them know
5. For data or code files, explain your interpretation of the content
6. If the user asks you to analyze a document, always refer to the actual content provided

Remember to maintain context about what documents have been uploaded throughout the conversation.`);

const SYSTEM_MESSAGE_SUMMARIZE =
  new SystemMessage(`Please analyze the following conversation between a human and an AI assistant. Based on the content of their interaction:

1. Generate an ultra-concise summary using FEWER THAN 5 WORDS that captures the absolute core essence of the conversation. DO NOT include a period at the end of the summary.
2. Create 5 OR FEWER relevant tags that accurately represent the core themes, topics, and subject areas covered in the conversation.

The conversation transcript is provided in a structured format with role-based message tags:

<message role="human">Human message content here</message>
<message role="ai">AI assistant response here</message>
[...and so on for the full conversation...]`);

const LLM_MODEL = "gpt-4o";

const llm = new ChatOpenAI({
  model: LLM_MODEL,
  temperature: 0,
});

const checkpointer = new PostgresSaver(pool);

await checkpointer.setup();

export interface File {
  name: string;
  type: string;
  url: string;
}

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  vector: Annotation<number[]>,
  summary: Annotation<string>,
  tags: Annotation<string[]>,
  responseId: Annotation<string>,
});

async function generateVector(state: typeof StateAnnotation.State) {
  const vector = await generateEmbedding(state.messages);
  return { vector };
}

async function reuseHistory(state: typeof StateAnnotation.State) {
  const response = await findPastResponse(state.vector);

  if (!response) {
    return new Command({ goto: NODE_CALL_MODEL });
  }

  logger.debug({ response }, "Found past response");

  return new Command({
    goto: NODE_SUMMARIZE,
    update: {
      messages: response.output,
      summary: state.summary || response.summary,
      tags: state.tags || response.tags,
      responseId: response.id,
    },
  });
}

async function callModel(state: typeof StateAnnotation.State) {
  const response = await llm.invoke([SYSTEM_MESSAGE_CALL, ...state.messages]);

  logger.debug({ response }, "Received LLM response");

  const id = uuidV4();

  await db.insert(responsesTable).values({
    id,
    input: encodeMessages(state.messages),
    output: encodeMessage(response),
    vector: state.vector,
  });

  logger.debug("Inserted response into database");

  return { messages: response, responseId: id };
}

const summarizeOutputSchema = z.object({
  summary: z.string().describe("The summary of the input messages"),
  tags: z
    .array(z.string())
    .describe("The tags associated with the input messages"),
});

const summarizeLlm = llm.withStructuredOutput(summarizeOutputSchema);

async function summarize(state: typeof StateAnnotation.State) {
  if (state.summary || !state.responseId) return {};

  const response = await summarizeLlm.invoke([
    SYSTEM_MESSAGE_SUMMARIZE,
    new HumanMessage({
      content: state.messages.map((msg) => ({
        type: "text",
        text: `<message role="${msg.getType()}">${msg.text}</message>`,
      })),
    }),
  ]);

  logger.debug(response, "Received summary");

  await db
    .update(responsesTable)
    .set({
      summary: response.summary,
      tags: response.tags,
    })
    .where(eq(responsesTable.id, state.responseId));

  logger.debug("Updated response summary");

  return { summary: response.summary, tags: response.tags };
}

const workflow = new StateGraph(StateAnnotation)
  .addNode(NODE_GENERATE_VECTOR, generateVector)
  .addNode(NODE_REUSE_HISTORY, reuseHistory, {
    ends: [NODE_CALL_MODEL, NODE_SUMMARIZE],
  })
  .addNode(NODE_CALL_MODEL, callModel)
  .addNode(NODE_SUMMARIZE, summarize)
  .addEdge(START, NODE_GENERATE_VECTOR)
  .addEdge(NODE_GENERATE_VECTOR, NODE_REUSE_HISTORY)
  .addEdge(NODE_CALL_MODEL, NODE_SUMMARIZE)
  .addEdge(NODE_SUMMARIZE, END);

export const graph = workflow.compile({ checkpointer });
