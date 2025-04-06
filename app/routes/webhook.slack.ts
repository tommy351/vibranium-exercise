import type { ActionFunctionArgs } from "@remix-run/node";
import { logger } from "~/util.server/log";
import { graph, type User } from "~/llm.server/graph";
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
import { logsTable, usersTable } from "~/db.server/schema";
import { generateBlocksFromMarkdown } from "~/util.server/slack/markdown";
import { slackClient } from "~/util.server/slack/client";
import { and, eq, sql } from "drizzle-orm";

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

  if (!res.user) {
    logger.error(
      { userId: id, response: res },
      "Failed to fetch Slack user info",
    );
    return;
  }

  return res.user;
}

async function getUser({
  userId,
  teamId,
}: {
  userId: string;
  teamId: string;
}): Promise<User | undefined> {
  const users = await db
    .select({
      name: usersTable.name,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      realName: usersTable.realName,
      displayName: usersTable.displayName,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.slackTeamId, teamId),
        eq(usersTable.slackUserId, userId),
      ),
    );

  if (users.length) {
    const user = users[0];

    return {
      name: user.name || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      realName: user.realName || undefined,
      displayName: user.displayName || undefined,
    };
  }

  const slackUser = await getSlackUser(userId);
  if (!slackUser) return;

  const user: User = {
    name: slackUser.name,
    firstName: slackUser.profile?.first_name,
    lastName: slackUser.profile?.last_name,
    realName: slackUser.profile?.real_name,
    displayName: slackUser.profile?.display_name,
  };

  await db
    .insert(usersTable)
    .values({
      ...user,
      email: slackUser.profile?.email,
      slackUserId: userId,
      slackTeamId: teamId,
    })
    .onConflictDoUpdate({
      target: [usersTable.slackTeamId, usersTable.slackUserId],
      set: {
        name: sql`EXCLUDED.name`,
        firstName: sql`EXCLUDED.first_name`,
        lastName: sql`EXCLUDED.last_name`,
        realName: sql`EXCLUDED.real_name`,
        displayName: sql`EXCLUDED.display_name`,
        email: sql`EXCLUDED.email`,
        updatedAt: sql`NOW()`,
      },
    });

  return user;
}

function prepareFiles(event: MessageEvent) {
  return (
    event.files?.flatMap((file) => {
      if (!isSupportedFileType(file.mimetype)) return [];
      return [{ name: file.title, type: file.mimetype, url: file.url_private }];
    }) ?? []
  );
}

async function handleMessage(context: EventCallbackEvent, event: MessageEvent) {
  const user = await getUser({
    userId: event.user,
    teamId: context.team_id,
  });
  const threadTs = event.thread_ts || event.ts;
  const output = await graph.invoke(
    {
      messages: [new HumanMessage(event.text)],
      files: prepareFiles(event),
      user,
    },
    {
      configurable: {
        thread_id: `${event.channel}-${threadTs}`,
      },
    },
  );

  logger.debug("Graph invoked successfully");

  if (!output.messages.length) {
    return;
  }

  const text = output.messages[output.messages.length - 1].text;
  const postMessageResult = await postMessage({
    channel: event.channel,
    thread_ts: threadTs,
    text,
    blocks: generateBlocksFromMarkdown(text),
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
  runInBackground(() => handleMessage(body, body.event));

  return new Response("Received", { status: 202 });
}
