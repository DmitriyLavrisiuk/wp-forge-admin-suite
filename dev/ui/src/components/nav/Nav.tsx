import { routes } from "../../app/routes";
import NavItem from "./NavItem";

export default function Nav() {
  const navRoutes = routes.filter((route) => route.showInNav !== false);

  return (
    <nav>
      <ul className="space-y-1">
        {navRoutes.map((route) => (
          <li key={route.path}>
            <NavItem to={route.path} label={route.navLabel ?? route.pageTitle} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
