import { routes } from "../../app/routes";
import NavItem from "./NavItem";

export default function Nav() {
  const navRoutes = routes.filter((route) => route.showInNav !== false);

  return (
    <nav>
      <ul>
        {navRoutes.map((route) => (
          <li key={route.path} className="m-3">
            <NavItem to={route.path} label={route.navLabel ?? route.pageTitle} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
