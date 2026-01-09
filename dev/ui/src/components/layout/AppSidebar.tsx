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
  const version = window.forgeAdminSuite?.version ?? "0.1.6";

  return (
    <Sidebar>
      <SidebarHeader className="border-b max-h-14 h-14 box-border flex items-center">
        <p className="flex items-center w-full px-4 gap-3 text-sm font-semibold text-foreground">
          Forge Admin Suite
        </p>
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
                        className="flex w-full items-center gap-2 focus:shadow-none"
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
      <SidebarFooter className="border-t max-h-14 h-14 box-border flex items-center">
        <div className="flex items-center w-full px-4 gap-3 text-xs text-muted-foreground">
          Forge Admin Suite v.{version}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
