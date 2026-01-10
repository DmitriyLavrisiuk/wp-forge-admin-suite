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
  const [originError, setOriginError] = useState("");
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
          setOriginError("");
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

  const validateOrigin = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { normalized: "", error: "" };
    }

    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      return { normalized: "", error: "Введите корректный домен." };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { normalized: "", error: "Разрешены только http или https." };
    }

    const host = url.hostname.toLowerCase();
    if (
      !/^[a-z0-9.-]+$/.test(host) ||
      host.includes("..") ||
      host.startsWith(".") ||
      host.endsWith(".")
    ) {
      return { normalized: "", error: "Некорректный домен." };
    }

    const isLocalhost = host === "localhost";
    const isLoc = host.endsWith(".loc");
    const hasTld = host.includes(".") && host.split(".").pop()!.length >= 2;

    if (!isLocalhost && !isLoc && !hasTld) {
      return {
        normalized: "",
        error: "Домен должен содержать корректный TLD, .loc или localhost.",
      };
    }

    const normalized = `${url.protocol}//${host}${
      url.port ? `:${url.port}` : ""
    }`;

    return { normalized, error: "" };
  };

  const handleSave = async () => {
    const { error } = validateOrigin(canonicalOrigin);
    if (error) {
      setOriginError(error);
      toast.error(error);
      return;
    }

    setIsSaving(true);
    try {
      const data = await apiPost<SettingsResponse>(
        "forge-admin-suite/v1/settings",
        {
          canonicalOrigin,
        }
      );
      setCanonicalOrigin(data.canonicalOrigin ?? "");
      setOriginError("");
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
              onChange={(event) => {
                const value = event.target.value;
                setCanonicalOrigin(value);
                setOriginError(validateOrigin(value).error);
              }}
              disabled={isLoading || isSaving}
            />
            {originError ? (
              <p className="text-xs text-destructive">{originError}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Сохраняется только схема и домен (опционально порт). Путь,
              параметры и фрагмент остаются неизменными.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading || isSaving || Boolean(originError)}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
