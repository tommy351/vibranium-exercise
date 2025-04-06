import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Await, Link, useLoaderData, useParams } from "@remix-run/react";
import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";
import Markdown from "react-markdown";
import { Info, InfoContent, InfoItem, InfoTitle } from "~/components/base/info";
import { PageContainer } from "~/components/base/page-container";
import { PageTitle } from "~/components/base/page-title";
import { SectionTitle } from "~/components/base/section-title";
import { DateTime } from "~/components/base/time";
import { ThreadTags } from "~/components/thread/tags";
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
    .select({
      id: threadsTable.id,
      summary: threadsTable.summary,
      tags: threadsTable.tags,
      userId: threadsTable.userId,
    })
    .from(threadsTable)
    .where(eq(threadsTable.id, params.id))
    .limit(1);

  if (!threads.length) {
    throw new Response("Thread not found", { status: 404 });
  }

  const messages = db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.threadId, params.id))
    .orderBy(asc(messagesTable.id))
    .execute();

  return { thread: threads[0], messages };
}

export default function AdminThreadPage() {
  const { id } = useParams();
  const { thread, messages } = useLoaderData<typeof loader>();

  return (
    <PageContainer>
      <PageTitle>Thread: {id}</PageTitle>
      <Info>
        <InfoItem>
          <InfoTitle>Summary</InfoTitle>
          <InfoContent>{thread.summary}</InfoContent>
        </InfoItem>
        <InfoItem>
          <InfoTitle>Tags</InfoTitle>
          <InfoContent>
            <ThreadTags tags={thread.tags} />
          </InfoContent>
        </InfoItem>
        <InfoItem>
          <InfoTitle>User</InfoTitle>
          <InfoContent>
            <Link to={`/admin/users/${thread.userId}`}>{thread.userId}</Link>
          </InfoContent>
        </InfoItem>
      </Info>
      <SectionTitle>Messages</SectionTitle>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={messages}>
          {(messages) => <MessageList messages={messages} />}
        </Await>
      </Suspense>
    </PageContainer>
  );
}

function MessageList({
  messages,
}: {
  messages: {
    id: string;
    createdAt: Date;
    type: string;
    content: MessageChunk[];
  }[];
}) {
  return (
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
