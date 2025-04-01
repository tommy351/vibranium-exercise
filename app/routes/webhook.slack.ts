import { ActionFunctionArgs } from "@remix-run/node";
import { z } from "zod";
import { WebClient } from "@slack/web-api";
import { createHmac, timingSafeEqual } from "crypto";
import { requireEnv } from "~/util/env";
import { logger } from "~/util/log";
import OpenAI from "openai";

const slackClient = new WebClient(requireEnv("SLACK_TOKEN"));
const slackAppId = requireEnv("SLACK_APP_ID");
const slackSigningSecret = requireEnv("SLACK_SIGNING_SECRET");
const openAiClient = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });

// https://api.slack.com/events/url_verification
const urlVerificationEventSchema = z.object({
  type: z.literal("url_verification"),
  token: z.string(),
  challenge: z.string(),
});

// https://api.slack.com/events/message
const messageEventSchema = z.object({
  type: z.literal("message"),
  channel: z.string(),
  user: z.string(),
  text: z.string(),
  bot_profile: z
    .object({
      app_id: z.string(),
    })
    .optional(),
});

const eventCallbackEventSchema = z.object({
  type: z.literal("event_callback"),
  event: z.discriminatedUnion("type", [messageEventSchema]),
});

// https://api.slack.com/apis/events-api#callback-field
const outerEventSchema = z.discriminatedUnion("type", [
  urlVerificationEventSchema,
  eventCallbackEventSchema,
]);

async function verifyRequest(request: Request): Promise<string> {
  const signature = request.headers.get("x-slack-signature");
  if (!signature) throw new Error("Signature is missing");

  const timestamp = request.headers.get("x-slack-request-timestamp");
  if (!timestamp) throw new Error("Timestamp is missing");

  const time = new Date(parseInt(timestamp, 10) * 1000);
  if (isNaN(time.valueOf())) throw new Error("Timestamp is invalid");
  if (Date.now() - time.valueOf() > 300000)
    throw new Error("Timestamp is expired");

  const body = await request.text();
  const expected =
    "v0=" +
    createHmac("sha256", slackSigningSecret)
      .update(`v0:${timestamp}:${body}`, "utf8")
      .digest("hex");
  const valid = timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(signature, "utf8"),
  );

  if (!valid) throw new Error("Signature is invalid");
  return body;
}

async function parseRequestBody(
  request: Request,
): Promise<z.infer<typeof outerEventSchema>> {
  const body = await verifyRequest(request);
  return outerEventSchema.parseAsync(JSON.parse(body));
}

export async function action({ request }: ActionFunctionArgs) {
  logger.debug({ req: request });

  let body: Awaited<ReturnType<typeof parseRequestBody>>;

  try {
    body = await parseRequestBody(request);
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
  if (body.event.bot_profile?.app_id === slackAppId) {
    return Response.json({ message: "OK" });
  }

  const openAiResponse = await openAiClient.responses.create({
    model: "gpt-4o",
    input: body.event.text,
    user: body.event.user,
  });

  const postMessageResult = await slackClient.chat.postMessage({
    text: openAiResponse.output_text,
    channel: body.event.channel,
  });

  if (!postMessageResult.ok) {
    logger.error({ result: postMessageResult }, "Failed to send Slack message");
    return new Response("Failed to send a Slack message", { status: 500 });
  }

  logger.debug({ result: postMessageResult }, "Message sent successfully");

  return new Response("OK");
}
