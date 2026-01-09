export default function AppFooter() {
  const version = window.forgeAdminSuite?.version ?? "0.1.6";

  return (
    <footer className="border-t border-border px-4">
      <div className="flex h-12 items-center justify-end text-xs text-muted-foreground">
        Forge Admin Suite v{version}
      </div>
    </footer>
  );
}
