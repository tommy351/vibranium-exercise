import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { AppSidebar } from "~/components/base/sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { type ClientSessionData, SessionProvider } from "~/session";
import { getSession } from "~/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");
  const data: ClientSessionData = {
    ...(userId && { userId: userId }),
  };

  return data;
}

export default function FullPage() {
  const session = useLoaderData<typeof loader>();

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
