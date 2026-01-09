import Button from "../components/ui/button";

export default function SettingsPage() {
  return (
    <div className="min-h-[60vh] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm text-slate-600">
          Скоро здесь будут настройки плагина.
        </p>
      </div>

      <Button disabled>Скоро</Button>
    </div>
  );
}
