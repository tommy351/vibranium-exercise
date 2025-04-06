import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { asc, eq } from "drizzle-orm";
import Markdown from "react-markdown";
import { PageTitle } from "~/components/base/page-title";
import { DateTime } from "~/components/base/time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { db } from "~/db.server/drizzle";
import { messagesTable, threadsTable } from "~/db.server/schema";
import { MessageChunk } from "~/db/message";

export const meta: MetaFunction = ({ params }) => {
  return [{ title: `Thread: ${params.id}` }];
};

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.id) {
    throw new Response("Not found", { status: 404 });
  }

  const threads = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.id, params.id))
    .limit(1);

  if (!threads.length) {
    throw new Response("Thread not found", { status: 404 });
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.threadId, params.id))
    .orderBy(asc(messagesTable.id));

  return { thread: threads[0], messages };
}

export default function AdminThreadPage() {
  const { id } = useParams();
  const { messages } = useLoaderData<typeof loader>();

  return (
    <>
      <PageTitle>Thread: {id}</PageTitle>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Output</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((message) => (
            <TableRow key={message.id}>
              <TableCell className="align-top">
                <DateTime value={message.createdAt} />
              </TableCell>
              <TableCell className="align-top">{message.type}</TableCell>
              <TableCell className="whitespace-normal align-top">
                {message.content.map((chunk, index) => (
                  <Chunk key={index} chunk={chunk} />
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
