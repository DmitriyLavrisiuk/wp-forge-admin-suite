import { useState } from "react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import { apiGet } from "../lib/api";

export default function DashboardPage() {
  const [response, setResponse] = useState<Record<string, unknown> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleCheck = async () => {
    if (!window.forgeAdminSuite) {
      toast.error("Конфигурация не найдена");
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiGet<Record<string, unknown>>(
        "forge-admin-suite/v1/status"
      );
      setResponse(data);
      toast.success("Статус получен");
    } catch (error) {
      console.error(error);
      setResponse(null);
      toast.error("Не удалось получить статус");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh]">
      <div className="mb-6">
        <p className="text-sm text-slate-600">
          Версия плагина: {window.forgeAdminSuite?.version ?? "—"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleCheck} disabled={isLoading}>
          {isLoading ? "Проверка..." : "Check status"}
        </Button>
      </div>

      <div className="mt-6 rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
        <pre className="whitespace-pre-wrap">
          {response ? JSON.stringify(response, null, 2) : "Нет данных"}
        </pre>
      </div>
    </div>
  );
}
