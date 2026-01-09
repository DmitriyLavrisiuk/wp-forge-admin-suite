import { NavLink } from "react-router-dom";

type NavItemProps = {
  to: string;
  label: string;
};

export default function NavItem({ to, label }: NavItemProps) {
  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "m-0 py-3 block w-full px-3 py-2 text-left text-sm font-medium transition",
      "rounded focus:outline-hidden focus:shadow-none",
      isActive
        ? "bg-gray-100 text-slate-900 border-r-4 border-gray-800"
        : "bg-transparent text-slate-600 border-r-0 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ");

  return (
    <NavLink to={to} className={getLinkClass}>
      {label}
    </NavLink>
  );
}
