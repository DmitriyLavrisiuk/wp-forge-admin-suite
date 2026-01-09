import { type ReactNode } from "react";
import AppFooter from "./AppFooter";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen grid-cols-[260px_1fr] grid-rows-[56px_1fr_48px]">
        <AppSidebar />
        <AppHeader />
        <main className="px-6 py-6">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}
