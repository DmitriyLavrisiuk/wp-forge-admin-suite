import Button from "../components/ui/button";

export default function SettingsPage() {
  return (
    <div className="min-h-[60vh] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Настройки</h2>
        <p className="mt-2 text-sm text-slate-600">
          Скоро здесь будут настройки плагина.
        </p>
      </div>

      <Button disabled>Скоро</Button>
    </div>
  );
}
