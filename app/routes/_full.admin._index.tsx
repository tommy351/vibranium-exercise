import { type MetaFunction } from "@remix-run/node";
import { Await, Link, useLoaderData } from "@remix-run/react";
import { asc, count, desc, sql } from "drizzle-orm";
import { PageContainer } from "~/components/base/page-container";
import { PageTitle } from "~/components/base/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
  return [{ title: "Dashboard" }];
};

export async function loader() {
  const popularTags = db
    .select({ tag: sql<string>`unnest(${threadsTable.tags})`, count: count() })
    .from(threadsTable)
    .groupBy((table) => table.tag)
    .orderBy((table) => [desc(table.count), asc(table.tag)])
    .limit(5)
    .execute();

  const topUsers = db
    .select({
      userId: threadsTable.userId,
      count: count(),
    })
    .from(threadsTable)
    .groupBy(threadsTable.userId)
    .orderBy((table) => [desc(table.count), asc(table.userId)])
    .limit(5)
    .execute();

  return { popularTags, topUsers };
}

export default function AdminIndexPage() {
  const { popularTags, topUsers } = useLoaderData<typeof loader>();

  return (
    <PageContainer>
      <PageTitle>Dashboard</PageTitle>
      <div className="grid gap-4 auto-rows-max grid-flow-col-dense auto-cols-fr">
        <PopularTags tags={popularTags} />
        <TopUsers users={topUsers} />
      </div>
    </PageContainer>
  );
}

function PopularTags({
  tags,
}: {
  tags: Promise<{ tag: string; count: number }[]>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular tags</CardTitle>
      </CardHeader>
      <CardContent>
        <Await resolve={tags}>
          {(tags) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.tag}>
                    <TableCell>{tag.tag}</TableCell>
                    <TableCell>{tag.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Await>
      </CardContent>
    </Card>
  );
}

function TopUsers({
  users,
}: {
  users: Promise<{ userId: string; count: number }[]>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Users</CardTitle>
      </CardHeader>
      <CardContent>
        <Await resolve={users}>
          {(users) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <Link to={`/admin/users/${user.userId}`}>
                        {user.userId}
                      </Link>
                    </TableCell>
                    <TableCell>{user.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Await>
      </CardContent>
    </Card>
  );
}
