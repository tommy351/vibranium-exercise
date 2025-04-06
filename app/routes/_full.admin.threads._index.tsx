import { MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { desc } from "drizzle-orm";
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
import { threadsTable } from "~/db.server/schema";

export const meta: MetaFunction = () => {
  return [{ title: "Threads" }];
};

export async function loader() {
  const threads = await db
    .select({
      id: threadsTable.id,
      userId: threadsTable.userId,
      createdAt: threadsTable.createdAt,
    })
    .from(threadsTable)
    .orderBy(desc(threadsTable.id));

  return { threads };
}

export default function AdminThreadsPage() {
  const { threads } = useLoaderData<typeof loader>();

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
              <TableCell>
                <DateTime value={thread.createdAt} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
