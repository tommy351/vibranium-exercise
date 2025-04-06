import { HumanMessage } from "@langchain/core/messages";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { and, asc, eq } from "drizzle-orm";
import { PageContainer } from "~/components/base/page-container";
import { PageTitle } from "~/components/base/page-title";
import { ChatForm, chatFormSchema } from "~/components/chat/form";
import { MessageContent } from "~/components/message/content";
import { db } from "~/db.server/drizzle";
import { messagesTable, threadsTable } from "~/db.server/schema";
import { MessageChunk } from "~/db/message";
import { cn } from "~/lib/utils";
import { graph } from "~/llm.server/graph";
import { encodeMessageContent } from "~/llm.server/message";
import { requireLogin } from "~/session.server";
import { logger } from "~/util.server/log";

export const meta: MetaFunction = () => {
  return [{ title: "Chat" }];
};

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
    .select({
      id: messagesTable.id,
      type: messagesTable.type,
      content: messagesTable.content,
    })
    .from(messagesTable)
    .where(eq(messagesTable.threadId, params.id))
    .orderBy(asc(messagesTable.id));

  return { thread: threads[0], messages };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const threadId = params.id;

  if (!threadId) {
    throw new Response("Thread not found", { status: 404 });
  }

  const session = await requireLogin(request);
  const body = await request.formData();
  const form = chatFormSchema.safeParse(body);

  if (!form.success) {
    throw new Response("Invalid form", { status: 400 });
  }

  const messages = await db.transaction(async (tx) => {
    const threads = await tx
      .select({
        id: threadsTable.id,
        summary: threadsTable.summary,
        tags: threadsTable.tags,
      })
      .from(threadsTable)
      .where(
        and(
          eq(threadsTable.id, threadId),
          eq(threadsTable.userId, session.userId),
        ),
      )
      .limit(1);

    if (!threads.length) {
      throw new Response("Thread not found", { status: 404 });
    }

    const thread = threads[0];

    const humanMessages = await tx
      .insert(messagesTable)
      .values({
        threadId,
        type: "human",
        content: [{ type: "text", text: form.data.text }],
      })
      .returning();

    logger.debug("Input message inserted");

    const output = await graph.invoke(
      {
        messages: [new HumanMessage(form.data.text)],
        ...(thread.summary && { summary: thread.summary }),
        ...(thread.tags && { tags: thread.tags }),
      },
      { configurable: { thread_id: threadId } },
    );

    logger.debug("Graph invoked");

    const lastMessage = output.messages[output.messages.length - 1];

    // Update thread summary and tags if they don't exist yet
    if (!thread.summary || !thread.tags) {
      await tx
        .update(threadsTable)
        .set({
          summary: output.summary,
          tags: output.tags,
        })
        .where(eq(threadsTable.id, threadId));

      logger.debug("Thread summary updated");
    }

    const aiMessages = await tx
      .insert(messagesTable)
      .values({
        threadId: thread.id,
        type: lastMessage.getType(),
        content: encodeMessageContent(lastMessage.content),
      })
      .returning();

    logger.debug("Response message inserted");

    return [...humanMessages, ...aiMessages];
  });

  return { messages };
}

export default function ChatPage() {
  const { thread, messages } = useLoaderData<typeof loader>();

  return (
    <PageContainer className="min-h-svh">
      <PageTitle>{thread.summary}</PageTitle>
      <div className="relative flex-1 flex flex-col">
        <MessageList messages={messages} />
        <FetcherChatForm />
      </div>
    </PageContainer>
  );
}

function MessageList({
  messages,
}: {
  messages: {
    id: string;
    type: string;
    content: MessageChunk[];
  }[];
}) {
  return (
    <div className="flex flex-col gap-4 flex-1">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn([
            "p-4 rounded-md",
            message.type === "human" && "bg-slate-200",
            message.type === "ai" && "border border-slate-200",
          ])}
        >
          <MessageContent chunks={message.content} />
        </div>
      ))}
    </div>
  );
}

function FetcherChatForm() {
  const fetcher = useFetcher();

  return (
    <div className="bottom-0 sticky pt-6 pb-4 bg-background flex justify-center">
      <ChatForm navigate={false} submitting={fetcher.state === "loading"} />
    </div>
  );
}
