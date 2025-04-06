export interface MessageChunkText {
  type: "text";
  text: string;
}

export interface MessageChunkFile {
  type: "file";
  name: string;
  mimeType: string;
  content: string;
}

export type MessageChunk = MessageChunkText | MessageChunkFile;
