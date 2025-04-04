import { Outlet } from "@remix-run/react";
import { LayoutDashboard, MessagesSquare, Users } from "lucide-react";
import { AdminSidebar, MenuItem } from "~/components/admin/sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

const MENU_ITEMS: MenuItem[] = [
  { icon: <LayoutDashboard />, link: "/admin", label: "Dashboard" },
  {
    icon: <Users />,
    link: "/admin/users",
    label: "Users",
    matchPrefix: true,
  },
  {
    icon: <MessagesSquare />,
    link: "/admin/threads",
    label: "Threads",
    matchPrefix: true,
  },
];

export default function AdminPage() {
  return (
    <SidebarProvider>
      <AdminSidebar items={MENU_ITEMS} />
      <SidebarInset>
        <header className="px-4 py-2">
          <SidebarTrigger className="cursor-pointer" />
        </header>
        <div className="p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
