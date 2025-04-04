import { Link, useLocation } from "@remix-run/react";
import { LayoutDashboard, LogIn, MessagesSquare, Users } from "lucide-react";
import { type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useSession } from "~/session";

interface MenuItem {
  icon: ReactNode;
  link: string;
  label: ReactNode;
  matchPrefix?: boolean;
}

const ADMIN_MENU_ITEMS: MenuItem[] = [
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

export function AppSidebar() {
  const session = useSession();

  return (
    <Sidebar>
      <Header />
      <SidebarContent>
        {session.slackUserId ? <AdminGroup /> : <GuestGroup />}
      </SidebarContent>
    </Sidebar>
  );
}

function Header() {
  return (
    <SidebarHeader>
      <Link to="/" className="p-2 font-bold">
        Vibranium
      </Link>
    </SidebarHeader>
  );
}

function GuestGroup() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/login">
                <LogIn />
                <span>Log in</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function AdminGroup() {
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Admin</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {ADMIN_MENU_ITEMS.map((item) => (
            <SidebarMenuItem key={item.link}>
              <SidebarMenuButton
                asChild
                isActive={
                  location.pathname === item.link ||
                  (item.matchPrefix &&
                    location.pathname.startsWith(item.link + "/"))
                }
              >
                <Link to={item.link}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
