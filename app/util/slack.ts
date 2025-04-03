import { ChatPostMessageArguments, WebClient } from "@slack/web-api";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { requireEnv } from "./env";

const APP_ID = requireEnv("SLACK_APP_ID");
const SIGNING_SECRET = requireEnv("SLACK_SIGNING_SECRET");

const client = new WebClient(requireEnv("SLACK_TOKEN"));

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
  ts: z.string(),
  user: z.string(),
  text: z.string(),
  bot_profile: z
    .object({
      app_id: z.string(),
    })
    .optional(),
  thread_ts: z.string().optional(),
});

export type MessageEvent = z.infer<typeof messageEventSchema>;

const eventCallbackEventSchema = z.object({
  type: z.literal("event_callback"),
  event: z.discriminatedUnion("type", [messageEventSchema]),
});

// https://api.slack.com/apis/events-api#callback-field
const outerEventSchema = z.discriminatedUnion("type", [
  urlVerificationEventSchema,
  eventCallbackEventSchema,
]);

export type OuterEvent = z.infer<typeof outerEventSchema>;

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
    createHmac("sha256", SIGNING_SECRET)
      .update(`v0:${timestamp}:${body}`, "utf8")
      .digest("hex");
  const valid = timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(signature, "utf8"),
  );

  if (!valid) throw new Error("Signature is invalid");
  return body;
}

export async function parseEventRequest(request: Request): Promise<OuterEvent> {
  const body = await verifyRequest(request);
  const json = JSON.parse(body);

  return outerEventSchema.parseAsync(json);
}

export function postMessage(message: ChatPostMessageArguments) {
  return client.chat.postMessage(message);
}

export function isBotMessage(event: MessageEvent) {
  return event.bot_profile?.app_id === APP_ID;
}
