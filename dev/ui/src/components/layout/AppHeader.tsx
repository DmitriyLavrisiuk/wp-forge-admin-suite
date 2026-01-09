import { useLocation } from "react-router-dom";
import { routes } from "../../app/routes";
import { SidebarTrigger } from "../ui/sidebar";

export default function AppHeader() {
  const location = useLocation();
  const currentRoute = routes.find((route) => route.path === location.pathname);
  const title = currentRoute?.pageTitle ?? "";

  return (
    <header className="border-b border-border px-4">
      <div className="flex h-14 items-center gap-3">
        <SidebarTrigger />
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </div>
    </header>
  );
}
