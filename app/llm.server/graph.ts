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
import { findPastResponse, generateEmbedding, saveResponse } from "./vector";
import { runInBackground } from "~/util.server/queue";
import { encodeMessage, encodeMessages } from "./message";
import { getFileContent } from "~/util.server/slack/file";

const NODE_GENERATE_VECTOR = "generate_vector";
const NODE_FETCH_FILE = "fetch_file";
const NODE_REUSE_HISTORY = "reuse_history";
const NODE_CALL_MODEL = "call_model";
const SYSTEM_MESSAGE =
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

export interface User {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  realName?: string;
  displayName?: string;
}

function escapeXml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  vector: Annotation<number[]>,
  files: Annotation<File[]>,
  user: Annotation<User>,
});

async function fetchFile(state: typeof StateAnnotation.State) {
  const messages: BaseMessage[] = [];

  for (const file of state.files) {
    const content = await getFileContent(file.url);

    messages.push(
      new HumanMessage(
        `<file name="${escapeXml(file.name)}" type="${escapeXml(file.type)}">${escapeXml(content)}</file>`,
      ),
    );
  }

  return {
    messages,
    // Reset to empty array after fetch
    files: [],
  };
}

async function generateVector(state: typeof StateAnnotation.State) {
  const vector = await generateEmbedding(state.messages);
  return { vector };
}

async function reuseHistory(state: typeof StateAnnotation.State) {
  const response = await findPastResponse(state.vector);

  if (response) {
    logger.debug({ response }, "Found past response");

    return new Command({
      goto: END,
      update: { messages: response },
    });
  }

  return new Command({ goto: NODE_CALL_MODEL });
}

async function callModel(state: typeof StateAnnotation.State) {
  const response = await llm.invoke([SYSTEM_MESSAGE, ...state.messages]);

  logger.debug({ response }, "Received LLM response");

  // Save response in background
  runInBackground(() =>
    saveResponse({
      input: encodeMessages(state.messages),
      vector: state.vector,
      output: encodeMessage(response),
    }),
  );

  return { messages: response };
}

const workflow = new StateGraph(StateAnnotation)
  .addNode(NODE_FETCH_FILE, fetchFile)
  .addNode(NODE_GENERATE_VECTOR, generateVector)
  .addNode(NODE_REUSE_HISTORY, reuseHistory, { ends: [NODE_CALL_MODEL, END] })
  .addNode(NODE_CALL_MODEL, callModel)
  .addEdge(START, NODE_FETCH_FILE)
  .addEdge(NODE_FETCH_FILE, NODE_GENERATE_VECTOR)
  .addEdge(NODE_GENERATE_VECTOR, NODE_REUSE_HISTORY);

export const graph = workflow.compile({ checkpointer });
