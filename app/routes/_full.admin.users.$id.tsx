import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useParams } from "@remix-run/react";
import { asc, desc, eq } from "drizzle-orm";
import { PageTitle } from "~/components/base/page-title";
import { SectionTitle } from "~/components/base/section-title";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { db } from "~/db.server/drizzle";
import { logsTable } from "~/db.server/schema";

export const meta: MetaFunction = ({ params }) => {
  return [{ title: `User: ${params.id}` }];
};

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.id) {
    throw new Response("Not found", { status: 404 });
  }

  const cte = db.$with("first_threads").as(
    db
      .selectDistinctOn([logsTable.threadId], {
        id: logsTable.threadId,
        createdAt: logsTable.createdAt,
      })
      .from(logsTable)
      .where(eq(logsTable.userId, params.id))
      .orderBy(logsTable.threadId, asc(logsTable.createdAt)),
  );

  const result = await db
    .with(cte)
    .select()
    .from(cte)
    .orderBy(desc(cte.createdAt));

  return result;
}

export default function AdminUserPage() {
  const { id } = useParams();
  const threads = useLoaderData<typeof loader>();

  return (
    <>
      <PageTitle>User: {id}</PageTitle>
      <SectionTitle>Threads</SectionTitle>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {threads.map((thread) => (
            <TableRow key={thread.id}>
              <TableCell>
                <Link to={`/admin/threads/${thread.id}`}>{thread.id}</Link>
              </TableCell>
              <TableCell>{thread.createdAt.toISOString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
