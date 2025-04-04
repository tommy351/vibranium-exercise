import { ActionFunctionArgs } from "@remix-run/node";
import { logger } from "~/util.server/log";
import { graph } from "~/llm.server/graph";
import { HumanMessage } from "@langchain/core/messages";
import {
  isBotMessage,
  type MessageEvent,
  type OuterEvent,
  parseEventRequest,
  postMessage,
} from "~/util.server/slack";
import { runInBackground } from "~/util.server/queue";
import { db } from "~/db.server/drizzle";
import { logsTable } from "~/db.server/schema";

async function handleMessage(event: MessageEvent) {
  const threadTs = event.thread_ts || event.ts;
  const output = await graph.invoke(
    {
      messages: [new HumanMessage(event.text)],
    },
    {
      configurable: {
        thread_id: `${event.channel}-${threadTs}`,
      },
      metadata: {
        user: event.user,
        channel: event.channel,
        thread: threadTs,
      },
    },
  );

  logger.debug({ output }, "Graph invoked successfully");

  if (!output.messages.length) {
    return;
  }

  const text = output.messages[output.messages.length - 1].text;
  const postMessageResult = await postMessage({
    channel: event.channel,
    thread_ts: threadTs,
    // TODO: Parse markdown
    text,
  });

  logger.debug({ result: postMessageResult }, "Message sent successfully");

  await db
    .insert(logsTable)
    .values({
      input: event.text,
      output: text,
      userId: event.user,
      threadId: threadTs,
    })
    .catch((err) => {
      logger.error({ err }, "Failed to insert log");
    });
}

export async function action({ request }: ActionFunctionArgs) {
  let body: OuterEvent;

  try {
    body = await parseEventRequest(request);
  } catch (err) {
    logger.warn({ err }, "Failed to parse request body");
    return new Response("Invalid request", { status: 400 });
  }

  logger.debug({ event: body }, "Received event");

  // Handle URL verification event
  if (body.type === "url_verification") {
    return Response.json({ challenge: body.challenge });
  }

  // Handle unexpected event type
  if (body.type !== "event_callback" || body.event.type !== "message") {
    return new Response("Unexpected event type", { status: 400 });
  }

  // Ignore events sent by the bot itself
  if (isBotMessage(body.event)) {
    return new Response("Ignored", { status: 202 });
  }

  // Run the handler in background
  runInBackground(() => handleMessage(body.event));

  return new Response("Received", { status: 202 });
}
