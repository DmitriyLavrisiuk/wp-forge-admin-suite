import { type ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import AppFooter from "./AppFooter";
import AppHeader from "./AppHeader";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 px-6 py-6">{children}</main>
          <AppFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
