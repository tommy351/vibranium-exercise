import {
  AIMessage,
  HumanMessage,
  type BaseMessage,
  type ChatMessage,
} from "@langchain/core/messages";
import { z } from "zod";

function getMessageRole(message: BaseMessage): string {
  if (typeof (message as ChatMessage).role === "string") {
    return (message as ChatMessage).role;
  }

  return message.getType() || "unknown";
}

const encodedMessageSchema = z.object({
  role: z.string(),
  name: z.string().optional(),
  content: z.string(),
});

export type EncodedMessage = z.infer<typeof encodedMessageSchema>;

export function encodeMessage(message: BaseMessage): EncodedMessage {
  return {
    role: getMessageRole(message),
    ...(message.name && { name: message.name }),
    content:
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content),
  };
}

export function encodeMessages(messages: BaseMessage[]): EncodedMessage[] {
  return messages.map((msg) => encodeMessage(msg));
}

export function decodeMessage(input: unknown) {
  const result = encodedMessageSchema.safeParse(input);
  if (!result.success) return;

  const message = result.data;

  switch (message.role) {
    case "ai":
      return new AIMessage(message.content);
    case "human":
      return new HumanMessage(message.content);
  }
}
