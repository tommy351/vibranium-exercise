import {
  mapChatMessagesToStoredMessages,
  mapStoredMessageToChatMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { z } from "zod";

const encodedMessageSchema = z.object({
  type: z.string(),
  data: z.object({
    content: z.string(),
    role: z.string().optional(),
    name: z.string().optional(),
    additional_kwargs: z.record(z.any()).optional(),
  }),
});

type EncodedMessage = z.infer<typeof encodedMessageSchema>;

export function encodeMessage(message: BaseMessage): EncodedMessage {
  return encodeMessages([message])[0];
}

export function encodeMessages(messages: BaseMessage[]): EncodedMessage[] {
  return mapChatMessagesToStoredMessages(messages).map((msg) => ({
    type: msg.type,
    data: {
      content: msg.data.content,
      role: msg.data.role,
      name: msg.data.name,
      additional_kwargs: msg.data.additional_kwargs,
    },
  }));
}

export function decodeMessage(input: unknown) {
  const result = encodedMessageSchema.safeParse(input);
  if (!result.success) return;

  return mapStoredMessageToChatMessage({
    type: result.data.type,
    data: {
      content: result.data.data.content,
      role: result.data.data.role,
      name: result.data.data.name,
      additional_kwargs: result.data.data.additional_kwargs,
      tool_call_id: undefined,
    },
  });
}
