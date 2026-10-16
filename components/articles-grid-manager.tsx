"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { ArticleSnippetEditor } from "@/components/article-snippet-editor";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  emptyArticleRow,
  emptyArticleSnippet,
  slugifyArticle,
  validateArticleDraft,
  type ArticleCategory,
  type ArticleRow,
  type ArticleSubcategory,
} from "@/lib/articles-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import type { LibraryCategory, LibraryImage } from "@/lib/library-shared";

/** Value suitable for <input type="datetime-local"> */
function toDatetimeLocalValue(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    return raw.slice(0, 16);
  }
  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${asDate.getFullYear()}-${pad(asDate.getMonth() + 1)}-${pad(asDate.getDate())}T${pad(asDate.getHours())}:${pad(asDate.getMinutes())}`;
}

function ArticleSlugField({
  slug,
  excludeId,
  onChange,
  onManualEdit,
}: {
  slug: string;
  excludeId?: string;
  onChange: (slug: string) => void;
  onManualEdit: () => void;
}) {
  const { t } = useI18n();
  const [unique, setUnique] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const value = slug.trim();
    if (!value) {
      setUnique(null);
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ slug: value });
          if (excludeId) params.set("excludeId", excludeId);
          const res = await fetch(
            `/api/site/articles/check-slug?${params.toString()}`,
          );
          const data = (await res.json()) as { unique?: boolean };
          if (!cancelled) setUnique(Boolean(data.unique));
        } catch {
          if (!cancelled) setUnique(null);
        } finally {
          if (!cancelled) setChecking(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug, excludeId]);

  return (
    <div className="space-y-1">
      <Label>Slug</Label>
      <div className="flex items-center gap-2">
        <Input
          value={slug}
          onChange={(e) => {
            onManualEdit();
            onChange(e.target.value);
          }}
          className="flex-1"
          placeholder={t("articles.slugAuto") || "Auto from title"}
        />
        {checking ? (
          <span className="text-xs text-slate-500">
            {t("articles.slugChecking") || "…"}
          </span>
        ) : unique === true ? (
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-green-500/40 bg-green-500/10 text-green-500"
            title={t("articles.slugUniqueOk") || "Slug is available"}
            aria-label={t("articles.slugUniqueOk") || "Slug is available"}
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
        ) : unique === false ? (
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-500"
            title={t("articles.slugUniqueBad") || "Slug already exists"}
            aria-label={t("articles.slugUniqueBad") || "Slug already exists"}
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ArticleFormFields({
  draft,
  setDraft,
  categories,
  subcategories,
  libraryAssets,
  libraryCategories,
  openArticlePage,
}: {
  draft: Partial<ArticleRow>;
  setDraft: (next: Partial<ArticleRow>) => void;
  categories: ArticleCategory[];
  subcategories: ArticleSubcategory[];
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
  openArticlePage: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const [slugManual, setSlugManual] = useState(() => Boolean(draft.slug?.trim()));
  const catId = draft.category_id ?? "";
  const subsForCat = catId
    ? subcategories.filter((s) => s.category_id === catId)
    : [];
  const localValue = toDatetimeLocalValue(draft.datetime ?? "");
  const titleMap = {
    ...emptyLocaleMap(),
    ...(draft.title ?? {}),
  };
  const snippet = draft.snippet ?? emptyArticleSnippet();

  return (
    <div className="space-y-3">
      <MultilingualTextEditor
        key={`article-title-${draft.id ?? "new"}`}
        label={t("field.title")}
        value={titleMap}
        onChange={(title) => {
          const next: Partial<ArticleRow> = { ...draft, title };
          if (!slugManual) {
            const auto = slugifyArticle(title.en || title.ro || title.bg);
            next.slug = title.en || title.ro || title.bg ? auto : "";
          }
          setDraft(next);
        }}
      />
      <ArticleSlugField
        slug={draft.slug ?? ""}
        excludeId={draft.id}
        onManualEdit={() => setSlugManual(true)}
        onChange={(slug) => setDraft({ ...draft, slug })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{t("articles.category") || "Category"}</Label>
          <select
            className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
            value={catId}
            onChange={(e) =>
              setDraft({
                ...draft,
                category_id: e.target.value || null,
                subcategory_id: null,
              })
            }
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[locale] || c.slug}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>{t("articles.subcategory") || "Subcategory"}</Label>
          <select
            className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
            value={draft.subcategory_id ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                subcategory_id: e.target.value || null,
              })
            }
            disabled={!catId}
          >
            <option value="">—</option>
            {subsForCat.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name[locale] || s.slug}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-2 rounded-lg border border-slate-700 p-3">
        <legend className="px-1 text-sm font-medium text-teal-200">
          {t("articles.datetime") || "Date-time"}
        </legend>
        <p className="text-xs text-slate-500">
          {t("articles.datetimeHint") ||
            "Optional. Leave empty, type manually, or pick with the date control."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="article-datetime-text">
              {t("articles.datetimeManual") || "Value"}
            </Label>
            <Input
              id="article-datetime-text"
              placeholder="2026-10-14T09:00"
              value={draft.datetime ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, datetime: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="article-datetime-picker">
              {t("articles.datetimePicker") || "Date input"}
            </Label>
            <Input
              id="article-datetime-picker"
              type="datetime-local"
              value={localValue}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  datetime: e.target.value,
                })
              }
            />
          </div>
        </div>
      </fieldset>

      <ArticleSnippetEditor
        value={snippet}
        onChange={(next) => setDraft({ ...draft, snippet: next })}
        libraryAssets={libraryAssets}
        libraryCategories={libraryCategories}
      />

      <div className="space-y-2">
        <Label>{t("articles.content") || "Content"}</Label>
        {draft.id ? (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => openArticlePage(draft.id!)}
            >
              {t("articles.edit") || "Edit"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {t("articles.editAfterSave") ||
              "Save the article first, then edit its HTML page."}
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={draft.enabled !== false}
          onChange={(e) =>
            setDraft({ ...draft, enabled: e.target.checked })
          }
        />
        {t("field.enabled") || "Enabled"}
      </label>
    </div>
  );
}

export function ArticlesGridManager({
  initialArticles,
  categories,
  subcategories,
  libraryAssets,
  libraryCategories,
}: {
  initialArticles: ArticleRow[];
  categories: ArticleCategory[];
  subcategories: ArticleSubcategory[];
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const subById = useMemo(
    () => new Map(subcategories.map((s) => [s.id, s])),
    [subcategories],
  );

  function openArticlePage(id: string, e?: MouseEvent) {
    e?.stopPropagation();
    e?.preventDefault();
    router.push(`/site/articles/${id}/page`);
  }

  const columns = useMemo<SndColumn<ArticleRow>[]>(
    () => [
      {
        id: "title",
        header: t("field.title"),
        filterValue: (row) =>
          `${row.title.ro} ${row.title.en} ${row.title.bg} ${row.slug}`,
        cell: (row) => (
          <span className="font-medium text-slate-200">
            {row.title[locale] || row.title.ro || "—"}
          </span>
        ),
      },
      {
        id: "category",
        header: t("articles.category") || "Category",
        filterValue: (row) => {
          const c = row.category_id ? catById.get(row.category_id) : null;
          const s = row.subcategory_id
            ? subById.get(row.subcategory_id)
            : null;
          return `${c?.name.ro ?? ""} ${s?.name.ro ?? ""}`;
        },
        cell: (row) => {
          const c = row.category_id ? catById.get(row.category_id) : null;
          const s = row.subcategory_id
            ? subById.get(row.subcategory_id)
            : null;
          return (
            <span className="text-sm text-slate-400">
              {c?.name[locale] || c?.slug || "—"}
              {s ? ` / ${s.name[locale] || s.slug}` : ""}
            </span>
          );
        },
      },
      {
        id: "datetime",
        header: t("articles.datetime") || "Date-time",
        filterValue: (row) => row.datetime || "",
        cell: (row) => (
          <span className="tabular-nums text-sm text-slate-400">
            {row.datetime || "—"}
          </span>
        ),
      },
      {
        id: "page",
        header: t("articles.content") || "Content",
        filterValue: () => "",
        cell: (row) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-teal-300 hover:underline"
            onClick={(e) => openArticlePage(row.id, e)}
          >
            {t("articles.edit") || "Edit"}
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        ),
      },
      {
        id: "enabled",
        header: "✓",
        filterValue: (row) => (row.enabled ? "1" : "0"),
        cell: (row) => (row.enabled ? "✓" : "—"),
      },
    ],
    [catById, locale, subById, t],
  );

  return (
    <div className="space-y-4">
      <SndGrid<ArticleRow>
        gridId="articles"
        rows={articles}
        columns={columns}
        onChange={setArticles}
        onSave={async (rows) => {
          const res = await fetch("/api/site/articles", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articles: rows }),
          });
          const data = (await res.json()) as {
            articles?: ArticleRow[];
            error?: string;
          };
          if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
          if (data.articles) setArticles(data.articles);
        }}
        createEmpty={() => emptyArticleRow(categories[0]?.id ?? null)}
        validateDraft={validateArticleDraft}
        renderForm={({ draft, setDraft }) => {
          if (!draft) return null;
          return (
            <ArticleFormFields
              key={draft.id ?? "new"}
              draft={draft}
              setDraft={setDraft}
              categories={categories}
              subcategories={subcategories}
              libraryAssets={libraryAssets}
              libraryCategories={libraryCategories}
              openArticlePage={openArticlePage}
            />
          );
        }}
      />
    </div>
  );
}
