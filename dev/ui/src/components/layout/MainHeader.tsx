import { useLocation } from "react-router-dom";
import { appRoutes } from "../../app/routes";

export default function MainHeader() {
  const location = useLocation();
  const currentRoute = appRoutes.find((route) => route.path === location.pathname);
  const title = currentRoute?.pageTitle ?? "";

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
    </div>
  );
}
