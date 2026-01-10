import { useState } from "react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { apiGet } from "../lib/api";

export default function DashboardPage() {
  const [response, setResponse] = useState<Record<string, unknown> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [canonicalResponse, setCanonicalResponse] = useState<
    Record<string, unknown> | null
  >(null);
  const [isCanonicalLoading, setIsCanonicalLoading] = useState(false);

  const handleCheck = async () => {
    setIsLoading(true);

    try {
      const data = await apiGet<Record<string, unknown>>(
        "forge-admin-suite/v1/status"
      );
      setResponse(data);
      toast.success("Статус получен");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось получить статус";
      console.error(error);
      setResponse(null);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetCanonicalSettings = async () => {
    setIsCanonicalLoading(true);

    try {
      const data = await apiGet<Record<string, unknown>>(
        "forge-admin-suite/v1/canonical/settings"
      );
      setCanonicalResponse(data);
      toast.success("Настройки каноникала получены");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось получить настройки каноникала";
      console.error(error);
      setCanonicalResponse(null);
      toast.error(message);
    } finally {
      setIsCanonicalLoading(false);
    }
  };

  return (
    <div className="min-h-[10vh]">
      <Card>
        <CardHeader>
          <CardTitle>Статус</CardTitle>
          <CardDescription>Проверка состояния REST API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleCheck} disabled={isLoading}>
              {isLoading ? "Checking..." : "Check status"}
            </Button>
            <Button
              onClick={handleGetCanonicalSettings}
              disabled={isCanonicalLoading}
            >
              {isCanonicalLoading ? "Checking..." : "Get canonical settings"}
            </Button>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-foreground">
              <pre className="whitespace-pre-wrap">
                {response ? JSON.stringify(response, null, 2) : "Нет данных"}
              </pre>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-foreground">
              <pre className="whitespace-pre-wrap">
                {canonicalResponse
                  ? JSON.stringify(canonicalResponse, null, 2)
                  : "Нет данных"}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
