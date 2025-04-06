import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Await, Link, useLoaderData, useParams } from "@remix-run/react";
import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { Info, InfoContent, InfoItem, InfoTitle } from "~/components/base/info";
import { PageContainer } from "~/components/base/page-container";
import { PageTitle } from "~/components/base/page-title";
import { SectionTitle } from "~/components/base/section-title";
import { DateTime } from "~/components/base/time";
import { MessageContent } from "~/components/message/content";
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
      createdAt: threadsTable.createdAt,
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
            <Link
              to={`/admin/users/${thread.userId}`}
              className="hover:underline"
            >
              {thread.userId}
            </Link>
          </InfoContent>
        </InfoItem>
        <InfoItem>
          <InfoTitle>Created Time</InfoTitle>
          <InfoContent>
            <DateTime value={thread.createdAt} />
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
              <MessageContent chunks={message.content} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
