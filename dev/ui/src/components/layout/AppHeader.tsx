export default function AppHeader() {
  const version = window.forgeAdminSuite?.version ?? "0.1.5";

  return (
    <header className="col-span-2 border-b border-slate-200 bg-white/90 px-6">
      <div className="flex h-14 items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Универсальная Админ Панель
          </p>
          <p className="text-xs text-slate-500">Администрирование плагина</p>
        </div>
        <span className="text-xs text-slate-500">v{version}</span>
      </div>
    </header>
  );
}
