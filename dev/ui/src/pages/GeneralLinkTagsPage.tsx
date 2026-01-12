import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Badge from "../components/ui/badge";
import Button from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import Checkbox from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import Input from "../components/ui/input";
import Label from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { apiGet, apiPost } from "../lib/api";

type SettingsResponse = {
  canonicalOrigin: string;
};

type AlternateLinkItem = {
  hreflang: string;
  hrefBaseUrl: string;
  preserveDefaultPath: boolean;
  pathPrefix: string;
};

type AlternateLinksResponse = {
  items: AlternateLinkItem[];
};

type AlternateFormState = {
  hreflang: string;
  hrefBaseUrl: string;
  preserveDefaultPath: boolean;
  pathPrefix: string;
};

type AlternateFormErrors = {
  hreflang?: string;
  hrefBaseUrl?: string;
  pathPrefix?: string;
};

const defaultAlternateForm: AlternateFormState = {
  hreflang: "",
  hrefBaseUrl: "",
  preserveDefaultPath: true,
  pathPrefix: "",
};

const parseHrefBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { normalized: "", basePath: "", error: "Укажите URL." };
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { normalized: "", basePath: "", error: "Введите корректный URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      normalized: "",
      basePath: "",
      error: "Разрешены только http или https.",
    };
  }

  const host = url.hostname.toLowerCase();
  if (
    !/^[a-z0-9.-]+$/.test(host) ||
    host.includes("..") ||
    host.startsWith(".") ||
    host.endsWith(".")
  ) {
    return { normalized: "", basePath: "", error: "Некорректный домен." };
  }

  const isLocalhost = host === "localhost";
  const isLoc = host.endsWith(".loc");
  const hasTld = host.includes(".") && host.split(".").pop()!.length >= 2;

  if (!isLocalhost && !isLoc && !hasTld) {
    return {
      normalized: "",
      basePath: "",
      error: "Домен должен содержать корректный TLD, .loc или localhost.",
    };
  }

  let path = url.pathname || "/";
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (!path.endsWith("/")) {
    path = `${path}/`;
  }

  const normalized = `${url.protocol}//${host}${
    url.port ? `:${url.port}` : ""
  }${path}`;

  return { normalized, basePath: path, error: "" };
};

const normalizeHreflang = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return { normalized: "", error: "Укажите hreflang." };
  }

  if (trimmed === "x-default") {
    return { normalized: trimmed, error: "" };
  }

  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(trimmed)) {
    return { normalized: "", error: "Некорректный hreflang." };
  }

  return { normalized: trimmed, error: "" };
};

const normalizePathPrefix = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { normalized: "", error: "" };
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return { normalized: "", error: "Префикс не должен содержать схему." };
  }

  if (
    !trimmed.startsWith("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#")
  ) {
    return { normalized: "", error: "Префикс должен начинаться с /." };
  }

  const normalized = `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
  return { normalized: normalized === "//" ? "" : normalized, error: "" };
};

const canUsePathPrefix = (value: string, preserveDefaultPath: boolean) => {
  if (!preserveDefaultPath) {
    return false;
  }

  const { basePath, error } = parseHrefBaseUrl(value);
  if (error) {
    return false;
  }

  return basePath === "/";
};

export default function GeneralLinkTagsPage() {
  const [canonicalOrigin, setCanonicalOrigin] = useState("");
  const [originError, setOriginError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alternateItems, setAlternateItems] = useState<AlternateLinkItem[]>([]);
  const [alternateLoading, setAlternateLoading] = useState(true);
  const [alternateSaving, setAlternateSaving] = useState(false);
  const [formState, setFormState] = useState<AlternateFormState>(
    defaultAlternateForm
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
    null
  );
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const data = await apiGet<SettingsResponse>(
          "forge-admin-suite/v1/general-link-tags/settings"
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

    const loadAlternateLinks = async () => {
      setAlternateLoading(true);
      try {
        const data = await apiGet<AlternateLinksResponse>(
          "forge-admin-suite/v1/general-link-tags/alternate-links"
        );
        if (isActive) {
          setAlternateItems(data.items ?? []);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось загрузить alternate links";
        console.error(error);
        toast.error(message);
      } finally {
        if (isActive) {
          setAlternateLoading(false);
        }
      }
    };

    loadSettings();
    loadAlternateLinks();

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

  const alternateValidation = useMemo(() => {
    const hreflangResult = normalizeHreflang(formState.hreflang);
    const hrefResult = parseHrefBaseUrl(formState.hrefBaseUrl);
    const allowPathPrefix = canUsePathPrefix(
      formState.hrefBaseUrl,
      formState.preserveDefaultPath
    );
    const pathPrefixResult = allowPathPrefix
      ? normalizePathPrefix(formState.pathPrefix)
      : { normalized: "", error: "" };

    let duplicateError = "";
    if (!hreflangResult.error) {
      const existing = alternateItems.find(
        (item, index) =>
          item.hreflang.toLowerCase() === hreflangResult.normalized &&
          index !== editIndex
      );
      if (existing) {
        duplicateError = "Такой hreflang уже добавлен.";
      }
    }

    const errors: AlternateFormErrors = {
      hreflang: hreflangResult.error || duplicateError,
      hrefBaseUrl: hrefResult.error,
      pathPrefix: pathPrefixResult.error,
    };

    const isValid =
      !errors.hreflang &&
      !errors.hrefBaseUrl &&
      !errors.pathPrefix &&
      !!hreflangResult.normalized &&
      !!hrefResult.normalized;

    const normalized: AlternateLinkItem | null = isValid
      ? {
          hreflang: hreflangResult.normalized,
          hrefBaseUrl: hrefResult.normalized,
          preserveDefaultPath: formState.preserveDefaultPath,
          pathPrefix: allowPathPrefix ? pathPrefixResult.normalized : "",
        }
      : null;

    return {
      errors,
      isValid,
      normalized,
      allowPathPrefix,
    };
  }, [alternateItems, editIndex, formState]);

  useEffect(() => {
    if (!alternateValidation.allowPathPrefix && formState.pathPrefix) {
      setFormState((prev) => ({
        ...prev,
        pathPrefix: "",
      }));
    }
  }, [alternateValidation.allowPathPrefix, formState.pathPrefix]);

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
        "forge-admin-suite/v1/general-link-tags/settings",
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

  const handleAlternateDialogOpen = (index: number | null) => {
    setEditIndex(index);
    setFormState(index === null ? defaultAlternateForm : alternateItems[index]);
    setDialogOpen(true);
  };

  const handleAlternateSave = async () => {
    if (!alternateValidation.isValid || !alternateValidation.normalized) {
      toast.error("Проверьте заполнение формы.");
      return;
    }

    const nextItems = [...alternateItems];
    if (editIndex === null) {
      nextItems.push(alternateValidation.normalized);
    } else {
      nextItems[editIndex] = alternateValidation.normalized;
    }

    setAlternateSaving(true);
    try {
      const data = await apiPost<AlternateLinksResponse>(
        "forge-admin-suite/v1/general-link-tags/alternate-links",
        {
          items: nextItems,
        }
      );
      setAlternateItems(data.items ?? []);
      setDialogOpen(false);
      toast.success("Alternate links сохранены");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось сохранить";
      console.error(error);
      toast.error(message);
    } finally {
      setAlternateSaving(false);
    }
  };

  const handleAlternateDelete = async () => {
    if (pendingDeleteIndex === null) {
      return;
    }

    const nextItems = alternateItems.filter(
      (_, index) => index !== pendingDeleteIndex
    );

    setDeleteLoading(true);
    try {
      const data = await apiPost<AlternateLinksResponse>(
        "forge-admin-suite/v1/general-link-tags/alternate-links",
        {
          items: nextItems,
        }
      );
      setAlternateItems(data.items ?? []);
      setDeleteOpen(false);
      setPendingDeleteIndex(null);
      setDialogOpen(false);
      toast.success("Alternate link удалён");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось удалить";
      console.error(error);
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-[10vh] space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Canonical Rules</CardTitle>
          <CardDescription>
            Глобально заменяет домен в canonical URL на указанный. Путь и
            параметры страницы сохраняются.
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
              Сохраняется только схема и домен (опционально порт). Путь, query и
              fragment остаются без изменений. Уникальные правила имеют
              приоритет.
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

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Alternate (hreflang) links</CardTitle>
              <CardDescription>
                Настройте alternate ссылки для всех страниц. Значение hreflang
                должно быть уникальным.
              </CardDescription>
            </div>
            <Button
              type="button"
              className="gap-2"
              onClick={() => handleAlternateDialogOpen(null)}
              disabled={alternateLoading || alternateSaving}
            >
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Hreflang</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead className="w-32">Preserve</TableHead>
                <TableHead className="w-32">Path prefix</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alternateLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : alternateItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Нет данных
                  </TableCell>
                </TableRow>
              ) : (
                alternateItems.map((item, index) => (
                  <TableRow key={`${item.hreflang}-${index}`}>
                    <TableCell>
                      <Badge>{item.hreflang}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-foreground">
                        {item.hrefBaseUrl}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={item.preserveDefaultPath ? "" : "opacity-60"}>
                        {item.preserveDefaultPath ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {item.pathPrefix || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger>
                            <Button
                              type="button"
                              className="bg-muted text-foreground hover:bg-muted/70"
                              onClick={() => handleAlternateDialogOpen(index)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Редактировать</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger>
                            <Button
                              type="button"
                              className="bg-red-500 text-white hover:bg-red-600"
                              onClick={() => {
                                setPendingDeleteIndex(index);
                                setDeleteOpen(true);
                              }}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Удалить</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alternate (hreflang) link</DialogTitle>
            <DialogDescription>
              Укажите параметры alternate ссылки для глобального применения.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hreflang">Hreflang</Label>
              <Input
                id="hreflang"
                placeholder="en-US или x-default"
                value={formState.hreflang}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((prev) => ({ ...prev, hreflang: value }));
                }}
                disabled={alternateSaving || deleteLoading}
              />
              {alternateValidation.errors.hreflang ? (
                <p className="text-xs text-destructive">
                  {alternateValidation.errors.hreflang}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Пример: en, es, x-default. Hreflang должен быть уникальным.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrefBaseUrl">Base URL</Label>
              <Input
                id="hrefBaseUrl"
                placeholder="https://example.com/en/"
                value={formState.hrefBaseUrl}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((prev) => ({ ...prev, hrefBaseUrl: value }));
                }}
                disabled={alternateSaving || deleteLoading}
              />
              {alternateValidation.errors.hrefBaseUrl ? (
                <p className="text-xs text-destructive">
                  {alternateValidation.errors.hrefBaseUrl}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Всегда абсолютный URL. При preserve path добавляется путь текущей
                страницы.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="preserveDefaultPath"
                checked={formState.preserveDefaultPath}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setFormState((prev) => ({
                    ...prev,
                    preserveDefaultPath: checked,
                  }));
                }}
                disabled={alternateSaving || deleteLoading}
              />
              <Label htmlFor="preserveDefaultPath">
                Сохранять исходный путь страницы
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pathPrefix">Path prefix</Label>
              <Input
                id="pathPrefix"
                placeholder="/en/"
                value={formState.pathPrefix}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((prev) => ({ ...prev, pathPrefix: value }));
                }}
                disabled={
                  alternateSaving ||
                  deleteLoading ||
                  !alternateValidation.allowPathPrefix
                }
              />
              {alternateValidation.allowPathPrefix ? (
                alternateValidation.errors.pathPrefix ? (
                  <p className="text-xs text-destructive">
                    {alternateValidation.errors.pathPrefix}
                  </p>
                ) : null
              ) : (
                <p className="text-xs text-muted-foreground">
                  Доступно только при сохранении пути и Base URL без собственного
                  префикса.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              className="bg-muted text-foreground hover:bg-muted/70"
              onClick={() => setDialogOpen(false)}
              disabled={alternateSaving || deleteLoading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleAlternateSave}
              disabled={
                alternateSaving ||
                deleteLoading ||
                !alternateValidation.isValid
              }
            >
              {alternateSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setPendingDeleteIndex(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить alternate link?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <Button
              type="button"
              className="bg-muted text-foreground hover:bg-muted/70"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleAlternateDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Удаление..." : "Удалить"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
