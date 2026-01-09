import Nav from "../nav/Nav";

export default function AppSidebar() {
  return (
    <aside className="row-span-2 border-r border-slate-200 px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Навигация
        </p>
      </div>
      <Nav />
    </aside>
  );
}
