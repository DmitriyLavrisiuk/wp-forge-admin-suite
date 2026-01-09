import { appRoutes } from "../../app/routes";
import NavItem from "./NavItem";

export default function Nav() {
  const navRoutes = appRoutes.filter((route) => route.navLabel);

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
