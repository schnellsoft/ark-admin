"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import type { LibraryCategory, LibraryImage } from "@/lib/library-shared";
import { cn } from "@/lib/utils";

function libraryFileUrl(key: string) {
  return `/api/site/media/file?key=${encodeURIComponent(key)}`;
}

export function SlideshowLibraryPicker({
  open,
  onClose,
  assets,
  categories,
  onSelect,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  assets: LibraryImage[];
  categories: LibraryCategory[];
  onSelect: (asset: LibraryImage) => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (categoryId && !asset.categoryIds.includes(categoryId)) return false;
      if (!q) return true;
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.alt.toLowerCase().includes(q) ||
        asset.kind.toLowerCase().includes(q)
      );
    });
  }, [assets, categoryId, search]);

  const selected = filtered.find((a) => a.id === selectedId) ?? null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slideshow-library-picker-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
          <div>
            <h2
              id="slideshow-library-picker-title"
              className="text-lg font-medium text-teal-200"
            >
              {t("slideshow.importLibrary")}
            </h2>
            <p className="text-sm text-slate-400">{t("slideshow.importLibraryHint")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {t("slideshow.close")}
          </Button>
        </div>

        <div className="grid gap-3 border-b border-slate-800 p-4 sm:grid-cols-[1fr_12rem]">
          <div className="space-y-1">
            <Label htmlFor="slideshow-lib-search">{t("grid.search")}</Label>
            <Input
              id="slideshow-lib-search"
              value={search}
              placeholder={t("slideshow.searchLibrary")}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="slideshow-lib-cat">{t("library.filterCategory")}</Label>
            <select
              id="slideshow-lib-cat"
              className="h-9 w-full rounded-md border border-slate-600 bg-slate-900/80 px-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{t("library.allCategories")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">{t("slideshow.noLibraryMatches")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((asset) => {
                const previewKey = asset.webp_key || asset.master_key;
                const active = selectedId === asset.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setSelectedId(asset.id)}
                    className={cn(
                      "overflow-hidden rounded-lg border text-left transition",
                      active
                        ? "border-teal-400 ring-2 ring-teal-400/40"
                        : "border-slate-700 hover:border-slate-500",
                    )}
                  >
                    <div className="aspect-video bg-black">
                      {asset.kind === "video" ? (
                        <video
                          src={libraryFileUrl(asset.master_key)}
                          className="size-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={libraryFileUrl(previewKey)}
                          alt={asset.alt || asset.name}
                          className="size-full object-cover"
                        />
                      )}
                    </div>
                    <div className="space-y-0.5 p-2">
                      <p className="truncate text-sm text-slate-100">{asset.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {asset.kind}
                        {asset.width && asset.height
                          ? ` · ${asset.width}×${asset.height}`
                          : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 p-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("slideshow.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!selected || busy}
            onClick={() => {
              if (selected) onSelect(selected);
            }}
          >
            {busy ? t("slideshow.importing") : t("slideshow.useSelected")}
          </Button>
        </div>
      </div>
    </div>
  );
}
