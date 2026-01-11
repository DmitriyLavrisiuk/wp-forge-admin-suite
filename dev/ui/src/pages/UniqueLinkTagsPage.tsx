import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import Checkbox from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import Input from "../components/ui/input";
import Label from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { apiDelete, apiGet, apiPost } from "../lib/api";

type UniqueCanonicalRule = {
  baseUrl: string;
  preserveDefaultPath: boolean;
};

type UniqueCanonicalEntity = {
  id: number;
  type: string;
  title: string;
  editLink: string;
  viewLink: string;
  rule: UniqueCanonicalRule | null;
};

type UniqueCanonicalResponse = {
  items: UniqueCanonicalEntity[];
  page: number;
  perPage: number;
  total: number;
};

const DEFAULT_PER_PAGE = 50;

export default function UniqueLinkTagsPage() {
  const [items, setItems] = useState<UniqueCanonicalEntity[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<UniqueCanonicalEntity | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<UniqueCanonicalEntity | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [preserveDefaultPath, setPreserveDefaultPath] = useState(true);
  const [baseUrlError, setBaseUrlError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const loadErrorRef = useRef<string>("");

  const perPage = DEFAULT_PER_PAGE;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / perPage));
  }, [total, perPage]);

  const validateBaseUrl = (value: string) => {
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
      return { normalized: "", error: "Введите корректный URL." };
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

    let path = url.pathname || "/";
    if (!path.endsWith("/")) {
      path = `${path}/`;
    }

    const normalized = `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}${path}`;

    return { normalized, error: "" };
  };

  const loadEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<UniqueCanonicalResponse>(
        `forge-admin-suite/v1/unique-link-tags/entities?page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}`
      );
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      loadErrorRef.current = "";
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось загрузить список";
      console.error(error);
      if (loadErrorRef.current !== message) {
        toast.error(message);
        loadErrorRef.current = message;
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, search]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const openDialog = (entity: UniqueCanonicalEntity) => {
    setSelected(entity);
    setBaseUrl(entity.rule?.baseUrl ?? "");
    setPreserveDefaultPath(entity.rule?.preserveDefaultPath ?? true);
    setBaseUrlError(validateBaseUrl(entity.rule?.baseUrl ?? "").error);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelected(null);
    setBaseUrl("");
    setPreserveDefaultPath(true);
    setBaseUrlError("");
  };

  const openDeleteConfirm = (entity: UniqueCanonicalEntity) => {
    setPendingDelete(entity);
    setIsConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!selected) {
      return;
    }

    const { error } = validateBaseUrl(baseUrl);
    if (error) {
      setBaseUrlError(error);
      toast.error(error);
      return;
    }

    setIsSaving(true);
    try {
      await apiPost<{ rule: UniqueCanonicalRule | null }>(
        `forge-admin-suite/v1/unique-link-tags/rule/${selected.id}`,
        {
          baseUrl,
          preserveDefaultPath,
        }
      );
      toast.success("Правило сохранено");
      closeDialog();
      loadEntities();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось сохранить";
      console.error(error);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await apiDelete(
        `forge-admin-suite/v1/unique-link-tags/rule/${pendingDelete.id}`
      );
      toast.success("Правило удалено");
      setIsConfirmOpen(false);
      setPendingDelete(null);
      closeDialog();
      loadEntities();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось удалить";
      console.error(error);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-[10vh] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Unique Link Tags</h3>
          <p className="text-sm text-muted-foreground">
            Уникальные правила для отдельных записей с приоритетом выше общих.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Поиск по заголовку"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="w-56"
          />
        </div>
      </div>

      <Table>
        <TableCaption>
          {isLoading
            ? "Загрузка..."
            : `Всего записей: ${total}. Страница ${page} из ${totalPages}.`}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 border-r text-center">ID</TableHead>
            <TableHead className="w-28">Тип</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Текущее правило</TableHead>
            <TableHead className="w-32 text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="border-b">
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Нет данных
              </TableCell>
            </TableRow>
          ) : (
            items.map((entity) => (
              <TableRow key={entity.id}>
                <TableCell className="border-r text-center">{entity.id}</TableCell>
                <TableCell>
                  <Badge>{entity.type}</Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <p className="line-clamp-2">{entity.title}</p>
                    {entity.editLink ? (
                      <a
                        className="text-xs text-muted-foreground underline"
                        href={entity.editLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Редактировать
                      </a>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {entity.rule?.baseUrl ? (
                    <div className="space-y-1 text-xs">
                      <p className="truncate">{entity.rule.baseUrl}</p>
                      <p className="text-muted-foreground">
                        {entity.rule.preserveDefaultPath
                          ? "Сохраняет путь"
                          : "Использует базовый путь"}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            type="button"
                            className="p-2"
                            onClick={() => openDialog(entity)}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Редактировать</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            type="button"
                            className="p-2 bg-primary text-secondary"
                            onClick={() =>
                              entity.viewLink &&
                              window.open(entity.viewLink, "_blank", "noopener")
                            }
                            disabled={!entity.viewLink}
                            aria-label="View"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Открыть</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {entity.rule ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Button
                              type="button"
                              className="p-2 bg-red-400 text-foreground hover:bg-red-600/80"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDeleteConfirm(entity);
                              }}
                              aria-label="Clear"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Очистить</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Показано {items.length} из {total}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="bg-muted text-foreground hover:bg-muted/70"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            Назад
          </Button>
          <Button
            type="button"
            className="bg-muted text-foreground hover:bg-muted/70"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
            Вперёд
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unique Link Tags</DialogTitle>
            <DialogDescription>
              Настройте уникальный link tag для выбранной записи.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unique-base-url">Base URL</Label>
              <Input
                id="unique-base-url"
                placeholder="https://newsite.com/en-in/"
                value={baseUrl}
                onChange={(event) => {
                  const value = event.target.value;
                  setBaseUrl(value);
                  setBaseUrlError(validateBaseUrl(value).error);
                }}
                disabled={isSaving || isDeleting}
              />
              {baseUrlError ? (
                <p className="text-xs text-destructive">{baseUrlError}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="preserve-default-path"
                checked={preserveDefaultPath}
                onChange={(event) =>
                  setPreserveDefaultPath(event.target.checked)
                }
                disabled={isSaving || isDeleting}
              />
              <Label htmlFor="preserve-default-path">
                Preserve default path
              </Label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            {selected?.rule ? (
              <Button
                type="button"
                className="bg-muted text-foreground hover:bg-muted/70"
                onClick={() => {
                  if (selected) {
                    openDeleteConfirm(selected);
                  }
                }}
                disabled={isSaving || isDeleting}
              >
                {isDeleting ? "Удаление..." : "Удалить"}
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={handleSave}
              disabled={Boolean(baseUrlError) || isSaving || isDeleting}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open: boolean) => {
          setIsConfirmOpen(open);
          if (!open) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить правило</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить уникальный link tag для этой записи?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <Button
              type="button"
              className="bg-muted text-foreground hover:bg-muted/70"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
