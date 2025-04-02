import { ActionFunctionArgs } from "@remix-run/node";
import { logger } from "~/util/log";
import { app } from "~/util/llm";
import { type Messages } from "@langchain/langgraph";
import {
  isBotMessage,
  type MessageEvent,
  type OuterEvent,
  parseEventRequest,
  postMessage,
} from "~/util/slack";

async function handleMessage(event: MessageEvent) {
  const threadTs = event.thread_ts || event.ts;
  const input: Messages = [{ role: "user", content: event.text }];

  const output = await app.invoke(
    { messages: input },
    { configurable: { thread_id: `${event.channel}-${threadTs}` } },
  );

  logger.debug({ output }, "Workflow executed successfully");

  if (!output.messages.length) {
    return;
  }

  const postMessageResult = await postMessage({
    text: output.messages[output.messages.length - 1].text,
    channel: event.channel,
    thread_ts: threadTs,
  });

  logger.debug({ result: postMessageResult }, "Message sent successfully");
}

export async function action({ request }: ActionFunctionArgs) {
  let body: OuterEvent;

  try {
    body = await parseEventRequest(request);
  } catch (err) {
    logger.warn({ err }, "Failed to parse request body");
    return new Response("Invalid request", { status: 400 });
  }

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

  void handleMessage(body.event);

  return new Response("Received", { status: 202 });
}
