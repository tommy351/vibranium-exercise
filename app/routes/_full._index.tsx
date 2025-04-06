import {
  redirect,
  type ActionFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { db } from "~/db.server/drizzle";
import { messagesTable, threadsTable } from "~/db.server/schema";
import { useSession } from "~/session";
import { requireLogin } from "~/session.server";
import { v7 as uuidV7 } from "uuid";
import { graph } from "~/llm.server/graph";
import { HumanMessage } from "@langchain/core/messages";
import { logger } from "~/util.server/log";
import { encodeMessageContent } from "~/llm.server/message";
import { eq } from "drizzle-orm";
import { ChatForm, chatFormSchema } from "~/components/chat/form";

export const meta: MetaFunction = () => {
  return [{ title: "Home" }];
};

export async function action({ request }: ActionFunctionArgs) {
  const session = await requireLogin(request);
  const body = await request.formData();
  const form = chatFormSchema.safeParse(body);

  if (!form.success) {
    return new Response("Invalid form", { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    const threadId = uuidV7();

    await tx
      .insert(threadsTable)
      .values({ id: threadId, userId: session.userId });

    logger.debug("Thread created");

    await tx.insert(messagesTable).values({
      threadId,
      type: "human",
      content: [{ type: "text", text: form.data.text }],
    });

    logger.debug("Input message inserted");

    const output = await graph.invoke(
      { messages: [new HumanMessage(form.data.text)] },
      { configurable: { thread_id: threadId } },
    );

    logger.debug("Graph invoked");

    const lastMessage = output.messages[output.messages.length - 1];

    await tx
      .update(threadsTable)
      .set({
        summary: output.summary,
        tags: output.tags,
      })
      .where(eq(threadsTable.id, threadId));

    logger.debug("Thread summary updated");

    await tx.insert(messagesTable).values({
      threadId,
      type: lastMessage.getType(),
      content: encodeMessageContent(lastMessage.content),
    });

    logger.debug("Response message inserted");

    return { threadId };
  });

  return redirect(`/chat/${result.threadId}`);
}

export default function Index() {
  const session = useSession();
  if (!session.userId) return null;

  return (
    <div className="flex min-h-svh w-full items-center justify-center">
      <ChatForm />
    </div>
  );
}
