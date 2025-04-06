import Markdown from "react-markdown";
import { MessageChunk } from "~/db/message";

export function MessageContent({ chunks }: { chunks: MessageChunk[] }) {
  return (
    <>
      {chunks.map((chunk, index) => (
        <Chunk chunk={chunk} key={index} />
      ))}
    </>
  );
}

function Chunk({ chunk }: { chunk: MessageChunk }) {
  if (chunk.type === "file") {
    return (
      <div className="text-slate-50 rounded-md overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 flex">
          <div className="flex-1">{chunk.name}</div>
          <div>{chunk.mimeType}</div>
        </div>
        <pre className="bg-slate-900 p-4">{chunk.content}</pre>
      </div>
    );
  }

  return (
    <div className="prose prose-sm">
      <Markdown>{chunk.text}</Markdown>
    </div>
  );
}
