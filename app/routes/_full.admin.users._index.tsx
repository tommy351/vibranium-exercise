import type { MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
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
  return [{ title: "Users" }];
};

export async function loader() {
  const result = await db
    .select({
      id: logsTable.userId,
    })
    .from(logsTable)
    .groupBy(logsTable.userId);

  return result;
}

export default function AdminUsersPage() {
  const users = useLoaderData<typeof loader>();

  return (
    <>
      <PageTitle>Users</PageTitle>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Link to={`/admin/users/${user.id}`}>{user.id}</Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
