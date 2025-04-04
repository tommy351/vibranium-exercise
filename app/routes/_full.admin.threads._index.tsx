import { MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { asc, desc } from "drizzle-orm";
import { PageTitle } from "~/components/base/page-title";
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

export const meta: MetaFunction = () => {
  return [{ title: "Threads" }];
};

export async function loader() {
  const cte = db.$with("first_threads").as(
    db
      .selectDistinctOn([logsTable.threadId], {
        id: logsTable.threadId,
        userId: logsTable.userId,
        createdAt: logsTable.createdAt,
      })
      .from(logsTable)
      .orderBy(logsTable.threadId, asc(logsTable.createdAt)),
  );

  const result = await db
    .with(cte)
    .select()
    .from(cte)
    .orderBy(desc(cte.createdAt));

  return result;
}

export default function AdminThreadsPage() {
  const threads = useLoaderData<typeof loader>();

  return (
    <>
      <PageTitle>Threads</PageTitle>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {threads.map((thread) => (
            <TableRow key={thread.id}>
              <TableCell>
                <Link to={`/admin/threads/${thread.id}`}>{thread.id}</Link>
              </TableCell>
              <TableCell>
                <Link to={`/admin/users/${thread.userId}`}>
                  {thread.userId}
                </Link>
              </TableCell>
              <TableCell>{thread.createdAt.toISOString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
