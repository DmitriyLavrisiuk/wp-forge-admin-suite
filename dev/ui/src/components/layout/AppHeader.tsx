import { useLocation } from "react-router-dom";
import { routes } from "../../app/routes";

export default function AppHeader() {
  const location = useLocation();
  const currentRoute = routes.find((route) => route.path === location.pathname);
  const title = currentRoute?.pageTitle ?? "";

  return (
    <header className="border-b border-slate-200 px-6">
      <div className="flex h-14 items-center justify-start">
        <h2 className="text-base font-normal text-gray-600">{title}</h2>
      </div>
    </header>
  );
}
