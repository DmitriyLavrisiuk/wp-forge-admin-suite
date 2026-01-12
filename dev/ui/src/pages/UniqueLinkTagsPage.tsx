import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import Checkbox from "../components/ui/checkbox";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
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

type AlternateItem = {
  hreflang: string;
  hrefBaseUrl: string;
  preserveDefaultPath: boolean;
  pathPrefix: string;
};

type AlternateSummary = {
  count: number;
  hreflangs: string[];
};

type UniqueCanonicalEntity = {
  id: number;
  type: string;
  title: string;
  editLink: string;
  viewLink: string;
  canonicalUrl: string;
  rule: UniqueCanonicalRule | null;
  unique: AlternateSummary | null;
  general: AlternateSummary | null;
};

type UniqueCanonicalResponse = {
  items: UniqueCanonicalEntity[];
  page: number;
  perPage: number;
  total: number;
};

type AlternateValidation = {
  errors: {
    hreflang: string;
    hrefBaseUrl: string;
    pathPrefix: string;
  };
  allowPathPrefix: boolean;
  isValid: boolean;
  normalized: AlternateItem;
};

const DEFAULT_PER_PAGE = 50;
const ACCORDION_STORAGE_KEY =
  "forgeAdminSuite.uniqueLinkTags.modalAccordion";
const DEFAULT_ACCORDION_ITEMS = ["canonical", "alternate"];

function normalizeHreflang(value: string) {
  return value.trim().toLowerCase();
}

function parseAlternateBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { normalized: "", error: "URL обязателен.", basePath: "" };
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { normalized: "", error: "Введите корректный URL.", basePath: "" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      normalized: "",
      error: "Разрешены только http или https.",
      basePath: "",
    };
  }

  const host = url.hostname.toLowerCase();
  if (
    !/^[a-z0-9.-]+$/.test(host) ||
    host.includes("..") ||
    host.startsWith(".") ||
    host.endsWith(".")
  ) {
    return { normalized: "", error: "Некорректный домен.", basePath: "" };
  }

  const isLocalhost = host === "localhost";
  const isLoc = host.endsWith(".loc");
  const hasTld = host.includes(".") && host.split(".").pop()!.length >= 2;

  if (!isLocalhost && !isLoc && !hasTld) {
    return {
      normalized: "",
      error: "Домен должен содержать корректный TLD, .loc или localhost.",
      basePath: "",
    };
  }

  let path = url.pathname || "/";
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (!path.endsWith("/")) {
    path = `${path}/`;
  }

  const normalized = `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}${path}`;

  return { normalized, error: "", basePath: path };
}

function validateUniqueBaseUrl(value: string) {
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
}

function canUsePathPrefix(
  preserve: boolean,
  basePath: string,
  baseUrl: string
) {
  if (!preserve || !baseUrl) {
    return false;
  }

  return basePath === "/" || basePath === "";
}

function normalizePathPrefix(value: string) {
  const trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return "";
  }

  if (!trimmed.startsWith("/") || trimmed.includes("?") || trimmed.includes("#")) {
    return "";
  }

  const normalized = `/${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}/`;
  return normalized === "//" ? "/" : normalized;
}

function formatHreflangs(summary: AlternateSummary | null) {
  if (!summary || summary.hreflangs.length === 0) {
    return "-";
  }

  return summary.hreflangs.join(", ");
}

function usePersistentAccordionValue(key: string, defaultValue: string[]) {
  const [value, setValue] = useState<string[]>(defaultValue);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const sanitized = parsed.filter(
          (item): item is string => typeof item === "string"
        );
        setValue(sanitized);
      }
    } catch {
      // Ignore malformed localStorage values.
    }
  }, [key]);

  const handleChange = useCallback(
    (next: string[]) => {
      setValue(next);

      if (typeof window === "undefined") {
        return;
      }

      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore localStorage write errors.
      }
    },
    [key]
  );

  return { value, handleChange };
}

type UniqueCanonicalSectionProps = {
  baseUrl: string;
  baseUrlError: string;
  onBaseUrlChange: (value: string) => void;
  preserveDefaultPath: boolean;
  onPreserveDefaultPathChange: (checked: boolean) => void;
  isDisabled: boolean;
};

function UniqueCanonicalSection({
  baseUrl,
  baseUrlError,
  onBaseUrlChange,
  preserveDefaultPath,
  onPreserveDefaultPathChange,
  isDisabled,
}: UniqueCanonicalSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Канонический адрес (Base URL)</h4>
      <div className="space-y-2">
        <Label htmlFor="unique-base-url">Base URL</Label>
        <Input
          id="unique-base-url"
          placeholder="https://newsite.com/en-in/"
          value={baseUrl}
          onChange={(event) => onBaseUrlChange(event.target.value)}
          disabled={isDisabled}
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
            onPreserveDefaultPathChange(event.target.checked)
          }
          disabled={isDisabled}
        />
        <div className="flex items-center gap-1">
          <Label htmlFor="preserve-default-path">
            Сохранять исходный путь записи
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Если включено — к Base URL будет добавлен стандартный путь
                текущей записи (permalink).
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

type UniqueAlternateLinksSectionProps = {
  alternateItems: AlternateItem[];
  alternateForm: AlternateItem;
  alternateValidation: AlternateValidation;
  alternateEditIndex: number | null;
  isAlternateLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onEdit: (index: number) => void;
  onDeleteRequest: (index: number) => void;
  onFormChange: (updates: Partial<AlternateItem>) => void;
  onResetForm: () => void;
  onSave: () => void;
};

function UniqueAlternateLinksSection({
  alternateItems,
  alternateForm,
  alternateValidation,
  alternateEditIndex,
  isAlternateLoading,
  isSaving,
  isDeleting,
  onEdit,
  onDeleteRequest,
  onFormChange,
  onResetForm,
  onSave,
}: UniqueAlternateLinksSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold">Alternate (hreflang) links</h4>
        <p className="text-xs text-muted-foreground">
          Уникальные alternate ссылки для выбранной записи.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Hreflang</TableHead>
            <TableHead>Base URL</TableHead>
            <TableHead className="w-20 text-center">Preserve</TableHead>
            <TableHead className="w-28">Prefix</TableHead>
            <TableHead className="w-24 text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isAlternateLoading ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                Загрузка...
              </TableCell>
            </TableRow>
          ) : alternateItems.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                Нет данных
              </TableCell>
            </TableRow>
          ) : (
            alternateItems.map((item, index) => (
              <TableRow key={`${item.hreflang}-${index}`}>
                <TableCell>
                  <Badge>{item.hreflang}</Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {item.hrefBaseUrl}
                </TableCell>
                <TableCell className="text-center">
                  {item.preserveDefaultPath ? (
                    <Badge>Да</Badge>
                  ) : (
                    <Badge className="bg-muted text-foreground">Нет</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.pathPrefix || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            type="button"
                            className="bg-muted text-foreground hover:bg-muted/70"
                            onClick={() => onEdit(index)}
                            disabled={isSaving || isDeleting}
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
                            className="bg-red-500 text-white hover:bg-red-600"
                            onClick={() => onDeleteRequest(index)}
                            disabled={isSaving || isDeleting}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Удалить</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-semibold">
            {alternateEditIndex === null
              ? "Добавить alternate link"
              : "Редактировать alternate link"}
          </h5>
          {alternateEditIndex !== null ? (
            <Button
              type="button"
              className="bg-muted text-foreground hover:bg-muted/70"
              onClick={onResetForm}
              disabled={isSaving || isDeleting}
            >
              Сбросить
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="alternate-hreflang">Hreflang</Label>
            <Input
              id="alternate-hreflang"
              placeholder="en, fr, x-default"
              value={alternateForm.hreflang}
              onChange={(event) =>
                onFormChange({ hreflang: event.target.value })
              }
              disabled={isSaving || isDeleting}
            />
            {alternateValidation.errors.hreflang ? (
              <p className="text-xs text-destructive">
                {alternateValidation.errors.hreflang}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="alternate-base-url">Base URL</Label>
            <Input
              id="alternate-base-url"
              placeholder="https://newsite.com/en/"
              value={alternateForm.hrefBaseUrl}
              onChange={(event) =>
                onFormChange({ hrefBaseUrl: event.target.value })
              }
              disabled={isSaving || isDeleting}
            />
            {alternateValidation.errors.hrefBaseUrl ? (
              <p className="text-xs text-destructive">
                {alternateValidation.errors.hrefBaseUrl}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="alternate-preserve-path"
            checked={alternateForm.preserveDefaultPath}
            onChange={(event) =>
              onFormChange({ preserveDefaultPath: event.target.checked })
            }
            disabled={isSaving || isDeleting}
          />
          <Label htmlFor="alternate-preserve-path">
            Preserve default path
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="alternate-path-prefix">Path prefix</Label>
          <Input
            id="alternate-path-prefix"
            placeholder="/en/"
            value={alternateForm.pathPrefix}
            onChange={(event) =>
              onFormChange({ pathPrefix: event.target.value })
            }
            disabled={
              isSaving || isDeleting || !alternateValidation.allowPathPrefix
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
              Доступно только при preserve path и base URL без префикса.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving || isDeleting || !alternateValidation.isValid}
          >
            <Plus className="mr-2 h-4 w-4" />
            {alternateEditIndex === null ? "Добавить" : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderCanonicalCell(url: string) {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className="block max-w-[220px] truncate font-mono text-xs">
            {trimmed}
          </span>
        </TooltipTrigger>
        <TooltipContent>{trimmed}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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
  const [alternateItems, setAlternateItems] = useState<AlternateItem[]>([]);
  const [alternateForm, setAlternateForm] = useState<AlternateItem>({
    hreflang: "",
    hrefBaseUrl: "",
    preserveDefaultPath: true,
    pathPrefix: "",
  });
  const [alternateEditIndex, setAlternateEditIndex] = useState<number | null>(
    null
  );
  const [alternateDeleteIndex, setAlternateDeleteIndex] = useState<number | null>(
    null
  );
  const [isAlternateDeleteOpen, setIsAlternateDeleteOpen] = useState(false);
  const [isAlternateLoading, setIsAlternateLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const loadErrorRef = useRef<string>("");

  const perPage = DEFAULT_PER_PAGE;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / perPage));
  }, [total, perPage]);

  const alternateValidation = useMemo<AlternateValidation>(() => {
    const errors = { hreflang: "", hrefBaseUrl: "", pathPrefix: "" };
    const hreflang = normalizeHreflang(alternateForm.hreflang);

    if (!hreflang) {
      errors.hreflang = "Hreflang обязателен.";
    } else if (
      hreflang !== "x-default" &&
      !/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(hreflang)
    ) {
      errors.hreflang = "Некорректный hreflang.";
    }

    const baseUrlResult = parseAlternateBaseUrl(alternateForm.hrefBaseUrl);
    if (baseUrlResult.error) {
      errors.hrefBaseUrl = baseUrlResult.error;
    }

    const allowPathPrefix = canUsePathPrefix(
      alternateForm.preserveDefaultPath,
      baseUrlResult.basePath,
      baseUrlResult.normalized
    );
    let normalizedPathPrefix = "";

    if (allowPathPrefix) {
      normalizedPathPrefix = normalizePathPrefix(alternateForm.pathPrefix);
      if (alternateForm.pathPrefix.trim() && !normalizedPathPrefix) {
        errors.pathPrefix = 'Path prefix должен начинаться с "/".';
      }
    }

    if (!errors.hreflang && hreflang) {
      const hasDuplicate = alternateItems.some(
        (item, index) => index !== alternateEditIndex && item.hreflang === hreflang
      );
      if (hasDuplicate) {
        errors.hreflang = "Hreflang должен быть уникальным.";
      }
    }

    const isValid =
      !errors.hreflang && !errors.hrefBaseUrl && !errors.pathPrefix;

    return {
      errors,
      allowPathPrefix,
      isValid,
      normalized: {
        hreflang,
        hrefBaseUrl: baseUrlResult.normalized,
        preserveDefaultPath: alternateForm.preserveDefaultPath,
        pathPrefix: allowPathPrefix ? normalizedPathPrefix : "",
      },
    };
  }, [alternateEditIndex, alternateForm, alternateItems]);

  const { value: accordionValue, handleChange: handleAccordionChange } =
    usePersistentAccordionValue(
      ACCORDION_STORAGE_KEY,
      DEFAULT_ACCORDION_ITEMS
    );

  const handleBaseUrlChange = useCallback((value: string) => {
    setBaseUrl(value);
    setBaseUrlError(validateUniqueBaseUrl(value).error);
  }, []);

  const handlePreserveDefaultPathChange = useCallback((checked: boolean) => {
    setPreserveDefaultPath(checked);
  }, []);

  const updateAlternateForm = useCallback(
    (updates: Partial<AlternateItem>) => {
      setAlternateForm((prev) => ({ ...prev, ...updates }));
    },
    []
  );

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

  useEffect(() => {
    if (!alternateValidation.allowPathPrefix && alternateForm.pathPrefix) {
      setAlternateForm((prev) => ({ ...prev, pathPrefix: "" }));
    }
  }, [alternateForm.pathPrefix, alternateValidation.allowPathPrefix]);

  useEffect(() => {
    if (!isDialogOpen || !selected) {
      return;
    }

    const loadAlternateLinks = async () => {
      setIsAlternateLoading(true);
      try {
        const data = await apiGet<{ items: AlternateItem[] }>(
          `forge-admin-suite/v1/unique-link-tags/alternate-links/${selected.id}`
        );
        setAlternateItems(data.items ?? []);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось загрузить alternate links";
        console.error(error);
        toast.error(message);
        setAlternateItems([]);
      } finally {
        setIsAlternateLoading(false);
      }
    };

    loadAlternateLinks();
  }, [isDialogOpen, selected]);

  const openDialog = (entity: UniqueCanonicalEntity) => {
    setSelected(entity);
    setBaseUrl(entity.rule?.baseUrl ?? "");
    setPreserveDefaultPath(entity.rule?.preserveDefaultPath ?? true);
    setBaseUrlError(validateUniqueBaseUrl(entity.rule?.baseUrl ?? "").error);
    setAlternateItems([]);
    setAlternateForm({
      hreflang: "",
      hrefBaseUrl: "",
      preserveDefaultPath: true,
      pathPrefix: "",
    });
    setAlternateEditIndex(null);
    setAlternateDeleteIndex(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelected(null);
    setBaseUrl("");
    setPreserveDefaultPath(true);
    setBaseUrlError("");
    setAlternateItems([]);
    setAlternateForm({
      hreflang: "",
      hrefBaseUrl: "",
      preserveDefaultPath: true,
      pathPrefix: "",
    });
    setAlternateEditIndex(null);
    setAlternateDeleteIndex(null);
    setIsAlternateDeleteOpen(false);
  };

  const openDeleteConfirm = (entity: UniqueCanonicalEntity) => {
    setPendingDelete(entity);
    setIsConfirmOpen(true);
  };

  const handleAlternateEdit = (index: number) => {
    const item = alternateItems[index];
    if (!item) {
      return;
    }

    setAlternateForm({
      hreflang: item.hreflang,
      hrefBaseUrl: item.hrefBaseUrl,
      preserveDefaultPath: item.preserveDefaultPath,
      pathPrefix: item.pathPrefix,
    });
    setAlternateEditIndex(index);
  };

  const resetAlternateForm = () => {
    setAlternateForm({
      hreflang: "",
      hrefBaseUrl: "",
      preserveDefaultPath: true,
      pathPrefix: "",
    });
    setAlternateEditIndex(null);
  };

  const handleAlternateSave = () => {
    if (!alternateValidation.isValid) {
      const message =
        alternateValidation.errors.hreflang ||
        alternateValidation.errors.hrefBaseUrl ||
        alternateValidation.errors.pathPrefix ||
        "Проверьте значения alternate link.";
      toast.error(message);
      return;
    }

    const normalized = alternateValidation.normalized;
    if (!normalized.hreflang || !normalized.hrefBaseUrl) {
      toast.error("Hreflang и URL обязательны.");
      return;
    }

    setAlternateItems((prev) => {
      if (alternateEditIndex === null) {
        return [...prev, normalized];
      }

      return prev.map((item, index) =>
        index === alternateEditIndex ? normalized : item
      );
    });

    resetAlternateForm();
  };

  const openAlternateDeleteConfirm = (index: number) => {
    setAlternateDeleteIndex(index);
    setIsAlternateDeleteOpen(true);
  };

  const handleAlternateDelete = () => {
    if (alternateDeleteIndex === null) {
      return;
    }

    setAlternateItems((prev) =>
      prev.filter((_, index) => index !== alternateDeleteIndex)
    );

    if (alternateEditIndex === alternateDeleteIndex) {
      resetAlternateForm();
    }

    setAlternateDeleteIndex(null);
    setIsAlternateDeleteOpen(false);
  };

  const handleSave = async () => {
    if (!selected) {
      return;
    }

    const { error } = validateUniqueBaseUrl(baseUrl);
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
      await apiPost<{ items: AlternateItem[] }>(
        `forge-admin-suite/v1/unique-link-tags/alternate-links/${selected.id}`,
        {
          items: alternateItems,
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
      <Card>
        <CardHeader className="space-y-2">
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
        </CardHeader>
        <CardContent className="space-y-4">
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
                <TableHead>Canonical</TableHead>
                <TableHead>Unique link tags</TableHead>
                <TableHead className="w-32 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="border-b">
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                      {renderCanonicalCell(entity.rule?.baseUrl ?? "")}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatHreflangs(entity.unique)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                type="button"
                                className="bg-muted text-foreground hover:bg-muted/70"
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
                                className="bg-muted text-foreground hover:bg-muted/70"
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
                        {entity.rule || (entity.unique && entity.unique.count > 0) ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Button
                                  type="button"
                                  className="bg-red-500 text-white hover:bg-red-600"
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
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Unique Link Tags</DialogTitle>
            <DialogDescription>
              Настройте канонический адрес (base URL) для выбранной записи.
            </DialogDescription>
          </DialogHeader>
          <Accordion
            type="multiple"
            value={accordionValue}
            onValueChange={handleAccordionChange}
            className="w-full"
          >
            <AccordionItem value="canonical">
              <AccordionTrigger>Канонический адрес</AccordionTrigger>
              <AccordionContent>
                <UniqueCanonicalSection
                  baseUrl={baseUrl}
                  baseUrlError={baseUrlError}
                  onBaseUrlChange={handleBaseUrlChange}
                  preserveDefaultPath={preserveDefaultPath}
                  onPreserveDefaultPathChange={handlePreserveDefaultPathChange}
                  isDisabled={isSaving || isDeleting}
                />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="alternate">
              <AccordionTrigger>Alternate (hreflang) links</AccordionTrigger>
              <AccordionContent>
                <UniqueAlternateLinksSection
                  alternateItems={alternateItems}
                  alternateForm={alternateForm}
                  alternateValidation={alternateValidation}
                  alternateEditIndex={alternateEditIndex}
                  isAlternateLoading={isAlternateLoading}
                  isSaving={isSaving}
                  isDeleting={isDeleting}
                  onEdit={handleAlternateEdit}
                  onDeleteRequest={openAlternateDeleteConfirm}
                  onFormChange={updateAlternateForm}
                  onResetForm={resetAlternateForm}
                  onSave={handleAlternateSave}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <DialogFooter className="mt-6">
            {selected?.rule || alternateItems.length > 0 ? (
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
              Вы уверены, что хотите удалить уникальные link tags для этой записи?
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

      <AlertDialog
        open={isAlternateDeleteOpen}
        onOpenChange={(open) => {
          setIsAlternateDeleteOpen(open);
          if (!open) {
            setAlternateDeleteIndex(null);
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
              onClick={() => setIsAlternateDeleteOpen(false)}
              disabled={isSaving || isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleAlternateDelete}
              disabled={isSaving || isDeleting}
            >
              Удалить
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
