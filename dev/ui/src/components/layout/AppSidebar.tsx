import { NavLink, useLocation } from "react-router-dom";
import { routes } from "@/app/routes";
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
} from "@/components/ui/sidebar";

export default function AppSidebar() {
  const location = useLocation();
  const navRoutes = routes.filter((route) => route.showInNav !== false);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="text-sm font-semibold text-foreground">
          Forge Admin Suite
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navRoutes.map((route) => {
                const isActive = location.pathname === route.path;
                const Icon = route.icon;

                return (
                  <SidebarMenuItem key={route.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={route.path}
                        className="flex w-full items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">
                          {route.navLabel ?? route.pageTitle}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t px-4 py-3 text-xs text-muted-foreground">
        Forge Admin Suite
      </SidebarFooter>
    </Sidebar>
  );
}
