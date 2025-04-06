import type { ActionFunctionArgs } from "@remix-run/node";
import { logger } from "~/util.server/log";
import { graph } from "~/llm.server/graph";
import { HumanMessage } from "@langchain/core/messages";
import {
  EventCallbackEvent,
  isBotMessage,
  type MessageEvent,
  type OuterEvent,
  parseEventRequest,
  postMessage,
} from "~/util.server/slack/event";
import { runInBackground } from "~/util.server/queue";
import { db } from "~/db.server/drizzle";
import { messagesTable, threadsTable, usersTable } from "~/db.server/schema";
import { generateBlocksFromMarkdown } from "~/util.server/slack/markdown";
import { slackClient } from "~/util.server/slack/client";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { encodeMessageContent } from "~/llm.server/message";
import { getFileContent } from "~/util.server/slack/file";
import { MessageChunkFile } from "~/db/message";
import { escapeXml } from "~/util/xml";
import { insertUser } from "~/db.server/user";

// MIME types started with `text/` are automatically supported.
const SUPPORTED_FILE_TYPES = new Set([
  "application/javascript",
  "application/json",
  "application/xml",
]);

function isSupportedFileType(mimeType: string) {
  return mimeType.startsWith("text/") || SUPPORTED_FILE_TYPES.has(mimeType);
}

async function getSlackUser(id: string) {
  const res = await slackClient.users.info({ user: id });

  if (!res.ok) {
    throw new Error("Failed to fetch Slack user info", { cause: res });
  }

  return res.user!;
}

async function getUser({
  userId,
  teamId,
}: {
  userId: string;
  teamId: string;
}): Promise<{ id: string }> {
  const users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.slackTeamId, teamId),
        eq(usersTable.slackUserId, userId),
      ),
    );

  if (users.length) {
    return users[0];
  }

  const slackUser = await getSlackUser(userId);

  return insertUser({
    name: slackUser.name,
    firstName: slackUser.profile?.first_name,
    lastName: slackUser.profile?.last_name,
    realName: slackUser.profile?.real_name,
    email: slackUser.profile?.email,
    slackUserId: userId,
    slackTeamId: teamId,
  });
}

async function insertThread({
  userId,
  threadTs,
}: {
  userId: string;
  threadTs: string;
}) {
  const result = await db
    .insert(threadsTable)
    .values({
      userId,
      slackThreadTs: threadTs,
    })
    .onConflictDoUpdate({
      target: [threadsTable.userId, threadsTable.slackThreadTs],
      targetWhere: isNotNull(threadsTable.slackThreadTs),
      set: {
        updatedAt: sql`NOW()`,
      },
    })
    .returning({
      id: threadsTable.id,
      summary: threadsTable.summary,
      tags: threadsTable.tags,
    });

  return result[0];
}

async function prepareFiles(event: MessageEvent): Promise<MessageChunkFile[]> {
  if (!event.files?.length) return [];

  return Promise.all(
    event.files
      .filter((file) => isSupportedFileType(file.mimetype))
      .map(async (file) => ({
        type: "file",
        name: file.title,
        mimeType: file.mimetype,
        content: await getFileContent(file.url_private),
      })),
  );
}

async function handleMessage(context: EventCallbackEvent, event: MessageEvent) {
  const user = await getUser({
    userId: event.user,
    teamId: context.team_id,
  });
  const threadTs = event.thread_ts || event.ts;
  const thread = await insertThread({
    userId: user.id,
    threadTs,
  });

  const files = await prepareFiles(event);
  let inputContent = event.text;

  for (const file of files) {
    inputContent += `\n<file name="${escapeXml(file.name)}" type="${escapeXml(file.mimeType)}">${escapeXml(file.content)}</file>`;
  }

  await db.insert(messagesTable).values({
    threadId: thread.id,
    type: "human",
    content: [{ type: "text", text: event.text }, ...files],
  });

  logger.debug("Input message inserted");

  const output = await graph.invoke(
    {
      messages: [new HumanMessage(inputContent)],
      ...(thread.summary && { summary: thread.summary }),
      ...(thread.tags && { tags: thread.tags }),
    },
    { configurable: { thread_id: thread.id } },
  );

  logger.debug("Graph invoked");

  const lastMessage = output.messages[output.messages.length - 1];
  const text = lastMessage.text;
  const postMessageResult = await postMessage({
    channel: event.channel,
    thread_ts: threadTs,
    text,
    blocks: generateBlocksFromMarkdown(text),
  });

  if (!postMessageResult.ok) {
    logger.error({ result: postMessageResult }, "Failed to send message");
    return;
  }

  logger.debug("Message sent");

  await db.transaction(async (tx) => {
    // Update thread summary and tags if they don't exist yet
    if (!thread.summary || !thread.tags) {
      await tx
        .update(threadsTable)
        .set({
          summary: output.summary,
          tags: output.tags,
        })
        .where(eq(threadsTable.id, thread.id));

      logger.debug("Thread summary updated");
    }

    await tx.insert(messagesTable).values({
      threadId: thread.id,
      type: lastMessage.getType(),
      content: encodeMessageContent(lastMessage.content),
    });

    logger.debug("Response message inserted");
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
  runInBackground(() => handleMessage(body, body.event));

  return new Response("Received", { status: 202 });
}
