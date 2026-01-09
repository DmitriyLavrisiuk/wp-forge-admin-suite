import { type ReactNode, useState } from "react";
import Button from "../ui/button";
import Sidebar from "./Sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNavigate = () => {
    setIsOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar isOpen={isOpen} onToggle={handleToggle} onNavigate={handleNavigate} />
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={handleToggle}
        />
      )}

      <div className="md:ml-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Универсальная Админ Панель
              </h1>
              <p className="text-xs text-slate-500">Администрирование плагина</p>
            </div>
            <div className="md:hidden">
              <Button onClick={handleToggle}>Меню</Button>
            </div>
          </div>
        </header>

        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
