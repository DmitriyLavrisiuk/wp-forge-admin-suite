import { useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import Input from "../components/ui/input";
import Label from "../components/ui/label";
import { apiGet, apiPost } from "../lib/api";

type SettingsResponse = {
  canonicalOrigin: string;
};

export default function CanonicalPage() {
  const [canonicalOrigin, setCanonicalOrigin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const data = await apiGet<SettingsResponse>(
          "forge-admin-suite/v1/settings"
        );
        if (isActive) {
          setCanonicalOrigin(data.canonicalOrigin ?? "");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось загрузить настройки";
        console.error(error);
        toast.error(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = await apiPost<SettingsResponse>(
        "forge-admin-suite/v1/settings",
        {
          canonicalOrigin,
        }
      );
      setCanonicalOrigin(data.canonicalOrigin ?? "");
      toast.success("Настройки сохранены");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось сохранить";
      console.error(error);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[10vh]">
      <Card>
        <CardHeader>
          <CardTitle>Canonical</CardTitle>
          <CardDescription>
            Заменяет схему и домен всех canonical URL на указанный домен.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="canonical-origin">Canonical domain</Label>
            <Input
              id="canonical-origin"
              placeholder="https://newdomain.com"
              value={canonicalOrigin}
              onChange={(event) => setCanonicalOrigin(event.target.value)}
              disabled={isLoading || isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Сохраняется только схема и домен (опционально порт). Путь,
              параметры и фрагмент остаются неизменными.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isLoading || isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
