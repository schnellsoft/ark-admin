"use client";

import { useMemo, useState } from "react";
import { LibraryUploader } from "@/components/library-uploader";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  UNSPECIFIED_CATEGORY_ID,
  validateLibraryImageDraft,
  type LibraryCategory,
  type LibraryImage,
  type LibrarySettings,
} from "@/lib/library-shared";

function previewUrl(key: string) {
  return `/api/site/media/file?key=${encodeURIComponent(key)}`;
}

function CategoryChecks({
  draft,
  setDraft,
  categories,
}: {
  draft: Partial<LibraryImage>;
  setDraft: (draft: Partial<LibraryImage> | null) => void;
  categories: LibraryCategory[];
}) {
  const ids = draft.categoryIds ?? [UNSPECIFIED_CATEGORY_ID];

  function toggle(id: string) {
    const has = ids.includes(id);
    let next: string[];
    if (has) {
      next = ids.filter((c) => c !== id);
      if (!next.length) next = [UNSPECIFIED_CATEGORY_ID];
    } else if (id === UNSPECIFIED_CATEGORY_ID) {
      next = [UNSPECIFIED_CATEGORY_ID];
    } else {
      next = [...ids.filter((c) => c !== UNSPECIFIED_CATEGORY_ID), id];
    }
    setDraft({ ...draft, categoryIds: next });
  }

  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((cat) => (
        <label key={cat.id} className="inline-flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal-500"
            checked={ids.includes(cat.id)}
            onChange={() => toggle(cat.id)}
          />
          {cat.name}
        </label>
      ))}
    </div>
  );
}

export function LibraryManager({
  initialImages,
  initialCategories,
  initialSettings,
}: {
  initialImages: LibraryImage[];
  initialCategories: LibraryCategory[];
  initialSettings: LibrarySettings;
}) {
  const { t } = useI18n();
  const [images, setImages] = useState(initialImages);
  const [categories] = useState(initialCategories);
  const [settings] = useState(initialSettings);
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (ids: string[]) =>
      ids.map((id) => map.get(id) ?? id).join(", ");
  }, [categories]);

  const visibleRows = useMemo(() => {
    if (!categoryFilter) return images;
    return images.filter((img) => img.categoryIds.includes(categoryFilter));
  }, [categoryFilter, images]);

  const columns = useMemo<SndColumn<LibraryImage>[]>(
    () => [
      {
        id: "preview",
        header: t("library.preview"),
        cell: (row) =>
          row.kind === "video" ? (
            <video
              src={previewUrl(row.master_key)}
              className="h-12 w-12 rounded object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl(row.master_key)}
              alt={row.alt || row.name}
              className="h-12 w-12 rounded object-cover"
              loading="lazy"
            />
          ),
      },
      {
        id: "kind",
        header: t("library.kind"),
        filterValue: (row) => row.kind,
        cell: (row) => (
          <span className="text-xs uppercase text-slate-400">{row.kind}</span>
        ),
      },
      {
        id: "name",
        header: t("field.name"),
        filterValue: (row) => `${row.name} ${row.alt}`,
        cell: (row) => <span className="font-medium text-slate-200">{row.name}</span>,
      },
      {
        id: "alt",
        header: t("library.alt"),
        filterValue: (row) => row.alt,
        cell: (row) => (
          <span className="text-sm text-slate-400">{row.alt || "—"}</span>
        ),
      },
      {
        id: "categories",
        header: t("library.categories"),
        filterValue: (row) => categoryName(row.categoryIds),
        cell: (row) => (
          <span className="text-sm text-slate-400">{categoryName(row.categoryIds)}</span>
        ),
      },
      {
        id: "size",
        header: t("library.dimensions"),
        cell: (row) => (
          <span className="font-mono text-xs text-slate-400">
            {row.width}×{row.height}
          </span>
        ),
      },
    ],
    [categoryName, t],
  );

  async function persistDelete(id: string) {
    const res = await fetch(`/api/site/media/library/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
  }

  return (
    <div className="space-y-6">
      <LibraryUploader
        settings={settings}
        categories={categories}
        onUploaded={(image) => {
          setImages((prev) => [...prev.filter((i) => i.id !== image.id), image]);
        }}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="library-category-filter">{t("library.filterCategory")}</Label>
            <select
              id="library-category-filter"
              className="h-9 rounded-md border border-slate-600 bg-slate-900/80 px-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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

        <SndGrid<LibraryImage>
          gridId="library-images"
          rows={visibleRows}
          columns={columns}
          onChange={(nextVisible) => {
            const nextIds = new Set(nextVisible.map((r) => r.id));
            const removed = visibleRows.filter((r) => !nextIds.has(r.id));
            const nextById = new Map(nextVisible.map((r) => [r.id, r]));

            if (!categoryFilter) {
              setImages(nextVisible);
            } else {
              // Keep global positions while filtered; apply name/category edits only.
              const updated = images
                .filter((img) => !removed.some((r) => r.id === img.id))
                .map((img) => {
                  const edited = nextById.get(img.id);
                  if (!edited) return img;
                  return {
                    ...img,
                    name: edited.name,
                    alt: edited.alt,
                    categoryIds: edited.categoryIds,
                  };
                });
              setImages(updated);
            }

            for (const img of removed) {
              void persistDelete(img.id).catch((err) => {
                console.error(err);
              });
            }
          }}
          onSave={async (rows) => {
            let payload: LibraryImage[];
            if (!categoryFilter) {
              payload = rows;
            } else {
              const nextById = new Map(rows.map((r) => [r.id, r]));
              payload = images.map((img) => {
                const edited = nextById.get(img.id);
                if (!edited) return img;
                return {
                  ...img,
                  name: edited.name,
                  alt: edited.alt,
                  categoryIds: edited.categoryIds,
                };
              });
            }

            const res = await fetch("/api/site/media/library", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: payload }),
            });
            const data = (await res.json()) as {
              images?: LibraryImage[];
              error?: string;
            };
            if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
            if (data.images) setImages(data.images);
          }}
          createEmpty={() => ({
            name: "",
            alt: "",
            kind: "image" as const,
            categoryIds: [UNSPECIFIED_CATEGORY_ID],
            master_key: "",
            master_content_type: "image/jpeg",
            webp_key: null,
            width: 0,
            height: 0,
            bytes: 0,
          })}
          validateDraft={(draft) => validateLibraryImageDraft(draft)}
          renderForm={({ draft, setDraft }) =>
            draft ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="lib-name">{t("field.name")}</Label>
                  <Input
                    id="lib-name"
                    value={draft.name ?? ""}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="lib-alt">{t("library.alt")}</Label>
                  <Input
                    id="lib-alt"
                    value={draft.alt ?? ""}
                    onChange={(e) => setDraft({ ...draft, alt: e.target.value })}
                    placeholder={t("library.altPlaceholder")}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>{t("library.categories")}</Label>
                  <CategoryChecks
                    draft={draft}
                    setDraft={setDraft}
                    categories={categories}
                  />
                </div>
                {draft.master_key ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl(draft.master_key)}
                    alt={draft.alt || draft.name || ""}
                    className="h-24 w-24 rounded object-cover"
                  />
                ) : (
                  <p className="text-sm text-slate-500 sm:col-span-2">
                    {t("library.useUpload")}
                  </p>
                )}
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}
