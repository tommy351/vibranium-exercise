export interface MessageChunkText {
  type: "text";
  text: string;
}

export type MessageChunk = MessageChunkText;
