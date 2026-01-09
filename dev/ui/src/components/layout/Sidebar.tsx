import { NavLink } from "react-router-dom";
import Button from "../ui/button";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
};

export default function Sidebar({ isOpen, onToggle, onNavigate }: SidebarProps) {
  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "block rounded-lg px-3 py-2 text-sm font-medium transition",
      isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800",
    ].join(" ");

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transition-transform md:static md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-200">
          Универсальная Админ Панель
        </span>
        <div className="md:hidden">
          <Button onClick={onToggle} className="bg-slate-800 text-white">
            Закрыть
          </Button>
        </div>
      </div>

      <nav className="px-3 py-4">
        <ul className="space-y-2">
          <li>
            <NavLink to="/" className={getLinkClass} onClick={onNavigate}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={getLinkClass} onClick={onNavigate}>
              Settings
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
