import { MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { desc } from "drizzle-orm";
import { PageContainer } from "~/components/base/page-container";
import { PageTitle } from "~/components/base/page-title";
import { ThreadList } from "~/components/thread/list";

import { db } from "~/db.server/drizzle";
import { threadsTable } from "~/db.server/schema";

export const meta: MetaFunction = () => {
  return [{ title: "Threads" }];
};

export async function loader() {
  const threads = await db
    .select({
      id: threadsTable.id,
      userId: threadsTable.userId,
      summary: threadsTable.summary,
      tags: threadsTable.tags,
      createdAt: threadsTable.createdAt,
    })
    .from(threadsTable)
    .orderBy(desc(threadsTable.id));

  return { threads };
}

export default function AdminThreadsPage() {
  const { threads } = useLoaderData<typeof loader>();

  return (
    <PageContainer>
      <PageTitle>Threads</PageTitle>
      <ThreadList threads={threads} showUserId />
    </PageContainer>
  );
}
