import Nav from "../nav/Nav";

export default function AppSidebar() {
  return (
    <aside className="row-span-3 border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 flex h-14 items-center justify-start">
          <h2 className="text-base font-medium text-gray-600"></h2>
      </div>
      <Nav />
    </aside>
  );
}
