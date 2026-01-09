import { useLocation } from "react-router-dom";
import { routes } from "../../app/routes";

export default function AppHeader() {
  const location = useLocation();
  const currentRoute = routes.find((route) => route.path === location.pathname);
  const title = currentRoute?.pageTitle ?? "";

  return (
    <header className="p-0 m-0 border-b max-h-14 h-14 box-border flex items-center">
      <div className="flex items-center w-full px-4 gap-3">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </div>
    </header>
  );
}
