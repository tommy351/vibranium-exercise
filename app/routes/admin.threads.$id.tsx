import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { asc, eq } from "drizzle-orm";
import Markdown from "react-markdown";
import { PageTitle } from "~/components/admin/page-title";
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
  return [{ title: `Thread: ${params.id}` }];
};

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.id) {
    throw new Response("Not found", { status: 404 });
  }

  const result = db
    .select({
      id: logsTable.id,
      input: logsTable.input,
      output: logsTable.output,
      createdAt: logsTable.createdAt,
    })
    .from(logsTable)
    .where(eq(logsTable.threadId, params.id))
    .orderBy(asc(logsTable.createdAt));

  return result;
}

export default function AdminThreadPage() {
  const { id } = useParams();
  const logs = useLoaderData<typeof loader>();

  return (
    <>
      <PageTitle>Thread: {id}</PageTitle>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Input</TableHead>
            <TableHead>Output</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="align-top">
                {log.createdAt.toLocaleString()}
              </TableCell>
              <RichTextCell>{log.input}</RichTextCell>
              <RichTextCell>{log.output}</RichTextCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function RichTextCell({ children }: { children: string }) {
  return (
    <TableCell className="whitespace-normal align-top prose prose-sm">
      <Markdown>{children}</Markdown>
    </TableCell>
  );
}
