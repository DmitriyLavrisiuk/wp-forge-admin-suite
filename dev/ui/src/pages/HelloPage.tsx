import { useState } from "react";
import { toast } from "sonner";
import Button from "../components/ui/button";

export default function HelloPage() {
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
      const res = await fetch(
        `${window.forgeAdminSuite.restUrl}forge-admin-suite/v1/status`,
        {
          headers: {
            "X-WP-Nonce": window.forgeAdminSuite.nonce,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Status request failed");
      }

      const data = (await res.json()) as Record<string, unknown>;
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
    <div className="min-h-[60vh] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">
          Универсальная Админ Панель
        </h2>
        <p className="mt-2 text-sm text-slate-600">
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
