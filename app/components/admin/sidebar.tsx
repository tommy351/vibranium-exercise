import { Link, useLocation } from "@remix-run/react";
import { type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

export interface MenuItem {
  icon: ReactNode;
  link: string;
  label: ReactNode;
  matchPrefix?: boolean;
}

export function AdminSidebar({ items }: { items: MenuItem[] }) {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
      </SidebarContent>
    </Sidebar>
  );
}
