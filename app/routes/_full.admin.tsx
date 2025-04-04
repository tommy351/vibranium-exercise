import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { requireLogin } from "~/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireLogin(request);
  return null;
}

export default function AdminPage() {
  return <Outlet />;
}
