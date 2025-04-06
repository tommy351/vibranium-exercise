import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { and, asc, eq } from "drizzle-orm";
import { PageContainer } from "~/components/base/page-container";
import { PageTitle } from "~/components/base/page-title";
import { MessageContent } from "~/components/message/content";
import { db } from "~/db.server/drizzle";
import { messagesTable, threadsTable } from "~/db.server/schema";
import { cn } from "~/lib/utils";
import { requireLogin } from "~/session.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (!params.id) {
    throw new Response("Thread not found", { status: 404 });
  }

  const session = await requireLogin(request);
  const threads = await db
    .select({ summary: threadsTable.summary })
    .from(threadsTable)
    .where(
      and(
        eq(threadsTable.id, params.id),
        eq(threadsTable.userId, session.userId),
      ),
    )
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

export default function ChatPage() {
  const { thread, messages } = useLoaderData<typeof loader>();

  return (
    <PageContainer>
      <PageTitle>{thread.summary}</PageTitle>
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn([
              "px-4",
              message.type === "human" && "bg-slate-200 rounded-md py-4",
            ])}
          >
            <MessageContent chunks={message.content} />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
