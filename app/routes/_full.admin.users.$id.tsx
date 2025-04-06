import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { desc, eq } from "drizzle-orm";
import { PageContainer } from "~/components/base/page-container";
import { PageTitle } from "~/components/base/page-title";
import { SectionTitle } from "~/components/base/section-title";
import { ThreadList } from "~/components/thread/list";
import { db } from "~/db.server/drizzle";
import { threadsTable, usersTable } from "~/db.server/schema";

export const meta: MetaFunction = ({ params }) => {
  return [{ title: `User: ${params.id}` }];
};

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.id) {
    throw new Response("Not found", { status: 404 });
  }

  const users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, params.id))
    .limit(1);

  if (!users.length) {
    throw new Response("User not found", { status: 404 });
  }

  const threads = await db
    .select({
      id: threadsTable.id,
      summary: threadsTable.summary,
      tags: threadsTable.tags,
      createdAt: threadsTable.createdAt,
    })
    .from(threadsTable)
    .where(eq(threadsTable.userId, params.id))
    .orderBy(desc(threadsTable.id));

  return { threads };
}

export default function AdminUserPage() {
  const { id } = useParams();
  const { threads } = useLoaderData<typeof loader>();

  return (
    <PageContainer>
      <PageTitle>User: {id}</PageTitle>
      <SectionTitle>Threads</SectionTitle>
      <ThreadList threads={threads} />
    </PageContainer>
  );
}
