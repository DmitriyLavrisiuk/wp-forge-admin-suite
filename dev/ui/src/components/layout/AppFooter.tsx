export default function AppFooter() {
  const version = window.forgeAdminSuite?.version ?? "0.1.5";

  return (
    <footer className="border-t border-slate-200 px-6">
      <div className="flex h-12 items-center text-xs text-slate-500">
        Forge Admin Suite v{version}
      </div>
    </footer>
  );
}
