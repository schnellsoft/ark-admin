"use client";

import { useMemo, useState } from "react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  emptyArticleCategory,
  emptyArticleSubcategory,
  slugifyArticle,
  validateArticleCategoryDraft,
  validateArticleSubcategoryDraft,
  type ArticleCategory,
  type ArticleSubcategory,
} from "@/lib/articles-shared";
import { emptyLocaleMap } from "@/lib/i18n";

export function ArticlesCategoriesManager({
  initialCategories,
  initialSubcategories,
}: {
  initialCategories: ArticleCategory[];
  initialSubcategories: ArticleSubcategory[];
}) {
  const { t, locale } = useI18n();
  const [categories, setCategories] = useState(initialCategories);
  const [subcategories, setSubcategories] = useState(initialSubcategories);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");

  const catColumns = useMemo<SndColumn<ArticleCategory>[]>(
    () => [
      {
        id: "name",
        header: t("field.name"),
        filterValue: (row) =>
          `${row.name.ro} ${row.name.en} ${row.name.bg} ${row.slug}`,
        cell: (row) => (
          <span className="font-medium text-slate-200">
            {row.name[locale] || row.name.ro || row.name.en || "—"}
            <span className="ml-2 text-xs text-slate-500">{row.slug}</span>
          </span>
        ),
      },
      {
        id: "enabled",
        header: t("field.enabled") || "Enabled",
        filterValue: (row) => (row.enabled ? "1" : "0"),
        cell: (row) => (row.enabled ? "✓" : "—"),
      },
    ],
    [locale, t],
  );

  const subColumns = useMemo<SndColumn<ArticleSubcategory>[]>(
    () => [
      {
        id: "name",
        header: t("field.name"),
        filterValue: (row) =>
          `${row.name.ro} ${row.name.en} ${row.name.bg} ${row.slug}`,
        cell: (row) => {
          const parent = categories.find((c) => c.id === row.category_id);
          return (
            <span className="font-medium text-slate-200">
              {row.name[locale] || row.name.ro || "—"}
              <span className="ml-2 text-xs text-slate-500">
                {parent?.name[locale] || parent?.slug || ""}
              </span>
            </span>
          );
        },
      },
    ],
    [categories, locale, t],
  );

  const visibleSubs = filterCategoryId
    ? subcategories.filter((s) => s.category_id === filterCategoryId)
    : subcategories;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg text-teal-200">
          {t("articles.categories") || "Categories"}
        </h2>
        <SndGrid<ArticleCategory>
          gridId="article-categories"
          rows={categories}
          columns={catColumns}
          onChange={setCategories}
          onSave={async (rows) => {
            const res = await fetch("/api/site/articles/categories", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ categories: rows }),
            });
            const data = (await res.json()) as {
              categories?: ArticleCategory[];
              error?: string;
            };
            if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
            if (data.categories) setCategories(data.categories);
          }}
          createEmpty={() => emptyArticleCategory()}
          validateDraft={validateArticleCategoryDraft}
          renderForm={({ draft, setDraft }) =>
            draft ? (
              <div className="space-y-3">
                <MultilingualTextEditor
                  label={t("field.name")}
                  value={draft.name ?? emptyLocaleMap()}
                  onChange={(name) => {
                    const slug =
                      draft.slug?.trim() ||
                      slugifyArticle(name.en || name.ro || name.bg);
                    setDraft({ ...draft, name, slug });
                  }}
                />
                <div className="space-y-1">
                  <Label>Slug</Label>
                  <Input
                    value={draft.slug ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, slug: e.target.value })
                    }
                  />
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
            ) : null
          }
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg text-teal-200">
            {t("articles.subcategories") || "Subcategories"}
          </h2>
          <div className="space-y-1">
            <Label>
              {t("articles.filterCategory") || "Filter by category"}
            </Label>
            <select
              className="h-9 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm text-slate-100"
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
            >
              <option value="">
                {t("articles.allCategories") || "All"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[locale] || c.name.ro || c.slug}
                </option>
              ))}
            </select>
          </div>
        </div>
        <SndGrid<ArticleSubcategory>
          gridId="article-subcategories"
          rows={visibleSubs}
          columns={subColumns}
          onChange={(next) => {
            if (filterCategoryId) {
              const others = subcategories.filter(
                (s) => s.category_id !== filterCategoryId,
              );
              setSubcategories([...others, ...next]);
            } else {
              setSubcategories(next);
            }
          }}
          onSave={async (rows) => {
            const payload = filterCategoryId
              ? [
                  ...subcategories.filter(
                    (s) => s.category_id !== filterCategoryId,
                  ),
                  ...rows,
                ]
              : rows;
            const res = await fetch("/api/site/articles/subcategories", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subcategories: payload }),
            });
            const data = (await res.json()) as {
              subcategories?: ArticleSubcategory[];
              error?: string;
            };
            if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
            if (data.subcategories) setSubcategories(data.subcategories);
          }}
          createEmpty={() =>
            emptyArticleSubcategory(
              filterCategoryId || categories[0]?.id || "",
            )
          }
          validateDraft={validateArticleSubcategoryDraft}
          renderForm={({ draft, setDraft }) =>
            draft ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>{t("articles.category") || "Category"}</Label>
                  <select
                    className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
                    value={draft.category_id ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, category_id: e.target.value })
                    }
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name[locale] || c.slug}
                      </option>
                    ))}
                  </select>
                </div>
                <MultilingualTextEditor
                  label={t("field.name")}
                  value={draft.name ?? emptyLocaleMap()}
                  onChange={(name) => {
                    const slug =
                      draft.slug?.trim() ||
                      slugifyArticle(name.en || name.ro || name.bg);
                    setDraft({ ...draft, name, slug });
                  }}
                />
                <div className="space-y-1">
                  <Label>Slug</Label>
                  <Input
                    value={draft.slug ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, slug: e.target.value })
                    }
                  />
                </div>
              </div>
            ) : null
          }
        />
      </section>
    </div>
  );
}
