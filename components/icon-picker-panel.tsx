"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import type { IconRow } from "@/lib/icons";

const PAGE_SIZE_KEY = "ark-icon-picker-pagesize";

export type PickedIcon = Pick<IconRow, "id" | "name" | "svg">;

export function IconPickerPanel({
  icons,
  selectedId,
  onSelect,
  open,
  onOpenChange,
}: {
  icons: IconRow[];
  selectedId?: string | null;
  onSelect: (icon: PickedIcon) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    const raw = window.localStorage.getItem(PAGE_SIZE_KEY);
    const n = raw ? Number(raw) : 8;
    if (Number.isFinite(n) && n > 0) setPageSize(n);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return icons;
    return icons.filter(
      (icon) =>
        icon.name.toLowerCase().includes(q) || icon.svg.toLowerCase().includes(q),
    );
  }, [icons, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function rememberPageSize(n: number) {
    setPageSize(n);
    setPage(1);
    window.localStorage.setItem(PAGE_SIZE_KEY, String(n));
  }

  function pick(icon: IconRow) {
    onSelect({ id: icon.id, name: icon.name, svg: icon.svg });
    onOpenChange(false);
  }

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      className="fixed inset-0 m-auto max-h-[min(90vh,40rem)] w-[min(96vw,40rem)] rounded-xl border border-slate-700 bg-slate-950 p-0 text-slate-100 shadow-2xl open:flex open:flex-col backdrop:bg-slate-950/70"
      onClose={() => onOpenChange(false)}
      onCancel={(e) => {
        e.preventDefault();
        onOpenChange(false);
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 id={titleId} className="text-lg font-medium text-teal-200">
          {t("headerIcons.selectIcon")}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          {t("grid.cancel")}
        </Button>
      </div>

      <div className="space-y-3 overflow-auto p-4">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t("grid.search")}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pageRows.map((icon) => (
            <button
              key={icon.id}
              type="button"
              onClick={() => pick(icon)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 transition-colors hover:border-teal-400/60 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                selectedId === icon.id && "border-teal-500 bg-teal-950/40",
              )}
            >
              <span
                className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-slate-800 text-teal-300 [&_svg]:h-7 [&_svg]:w-7"
                dangerouslySetInnerHTML={{ __html: icon.svg }}
              />
              <span className="w-full truncate text-center text-xs text-slate-300">
                {icon.name}
              </span>
            </button>
          ))}
          {pageRows.length === 0 ? (
            <p className="col-span-full text-sm text-slate-500">{t("grid.noResults")}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>{t("grid.perPage")}</span>
          <select
            className="h-8 rounded-md border border-slate-600 bg-slate-900 px-2"
            value={pageSize}
            onChange={(e) => rememberPageSize(Number(e.target.value))}
          >
            {[4, 8, 12, 16].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹
          </Button>
          <span className="text-sm text-slate-400">
            {t("grid.page")} {safePage} {t("grid.of")} {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            ›
          </Button>
        </div>
      </div>
    </dialog>
  );
}
