import { NavLink } from "react-router-dom";

type NavItemProps = {
  to: string;
  label: string;
};

export default function NavItem({ to, label }: NavItemProps) {
  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "block rounded-md px-3 py-2 text-sm font-medium transition",
      isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900",
    ].join(" ");

  return (
    <NavLink to={to} className={getLinkClass}>
      {label}
    </NavLink>
  );
}
