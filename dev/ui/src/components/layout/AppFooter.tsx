export default function AppFooter() {
  const version = window.forgeAdminSuite?.version ?? "0.1.6";

  return (
    <footer className="border-t max-h-14 h-14 box-border flex items-center">
      <div className="flex items-center w-full px-4 gap-3 justify-end text-xs text-muted-foreground">
        Forge Admin Suite v.{version}
      </div>
    </footer>
  );
}
