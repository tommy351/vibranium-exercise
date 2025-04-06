import { Form, Link, useLocation } from "@remix-run/react";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageCirclePlus,
  MessagesSquare,
  Users,
} from "lucide-react";
import { type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
        {session.userId ? (
          <>
            <UserGroup />
            <AdminGroup />
          </>
        ) : (
          <GuestGroup />
        )}
      </SidebarContent>
      <Footer />
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

function Footer() {
  const session = useSession();
  if (!session.userId) return null;

  return (
    <SidebarFooter>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <LogOutButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarFooter>
  );
}

function LogOutButton() {
  return (
    <Form method="post" action="/logout" reloadDocument>
      <SidebarMenuButton className="cursor-pointer" type="submit">
        <LogOut />
        <span>Log out</span>
      </SidebarMenuButton>
    </Form>
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

function UserGroup() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-primary">
              <Link to="/">
                <MessageCirclePlus />
                <span>New chat</span>
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
