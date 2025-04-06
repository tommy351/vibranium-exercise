import { Link } from "@remix-run/react";
import { DateTime } from "~/components/base/time";
import { ThreadTags } from "~/components/thread/tags";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export interface Thread {
  id: string;
  summary?: string | null;
  tags?: string[] | null;
  userId?: string;
  createdAt: Date;
}

export function ThreadList({
  threads,
  showUserId,
}: {
  threads: Thread[];
  showUserId?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          {showUserId && <TableHead>User</TableHead>}
          <TableHead>Summary</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {threads.map((thread) => (
          <TableRow key={thread.id}>
            <TableCell>
              <Link
                to={`/admin/threads/${thread.id}`}
                className="hover:underline"
              >
                {thread.id}
              </Link>
            </TableCell>
            {showUserId && (
              <TableCell>
                <Link
                  to={`/admin/users/${thread.userId}`}
                  className="hover:underline"
                >
                  {thread.userId}
                </Link>
              </TableCell>
            )}
            <TableCell>{thread.summary}</TableCell>
            <TableCell>
              <ThreadTags tags={thread.tags} />
            </TableCell>
            <TableCell>
              <DateTime value={thread.createdAt} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
