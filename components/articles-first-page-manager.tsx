"use client";

import { useMemo, useState } from "react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import type { ArticleFirstPageSlot, ArticleRow } from "@/lib/articles-shared";

type FirstPageRow = ArticleFirstPageSlot & {
  title: string;
  slug: string;
  enabled: boolean;
};

export function ArticlesFirstPageManager({
  initialSlots,
  articles,
}: {
  initialSlots: ArticleFirstPageSlot[];
  articles: ArticleRow[];
}) {
  const { t, locale } = useI18n();
  const [slots, setSlots] = useState(initialSlots);
  const [pickerId, setPickerId] = useState("");

  const articleById = useMemo(
    () => new Map(articles.map((a) => [a.id, a])),
    [articles],
  );

  const rows: FirstPageRow[] = useMemo(
    () =>
      [...slots]
        .sort((a, b) => a.position - b.position)
        .map((slot) => {
          const article = articleById.get(slot.article_id);
          return {
            ...slot,
            title:
              article?.title[locale] ||
              article?.title.ro ||
              article?.slug ||
              slot.article_id,
            slug: article?.slug || "",
            enabled: article?.enabled !== false,
          };
        }),
    [articleById, locale, slots],
  );

  const available = useMemo(() => {
    const selected = new Set(slots.map((s) => s.article_id));
    return articles
      .filter((a) => a.enabled !== false && !selected.has(a.id))
      .sort((a, b) => a.position - b.position);
  }, [articles, slots]);

  const columns = useMemo<SndColumn<FirstPageRow>[]>(
    () => [
      {
        id: "title",
        header: t("field.title") || "Title",
        filterValue: (row) => `${row.title} ${row.slug}`,
        cell: (row) => (
          <span className="font-medium text-slate-200">{row.title}</span>
        ),
      },
      {
        id: "slug",
        header: t("field.slug") || "Slug",
        filterValue: (row) => row.slug,
        cell: (row) => (
          <span className="font-mono text-xs text-slate-400">{row.slug || "—"}</span>
        ),
      },
      {
        id: "enabled",
        header: "✓",
        filterValue: (row) => (row.enabled ? "1" : "0"),
        cell: (row) => (row.enabled ? "✓" : "—"),
      },
    ],
    [t],
  );

  function addSelected() {
    if (!pickerId) return;
    if (slots.some((s) => s.article_id === pickerId)) return;
    setSlots((prev) => [
      ...prev,
      {
        id: pickerId,
        article_id: pickerId,
        position: prev.length + 1,
      },
    ]);
    setPickerId("");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        {t("articles.firstPageHint") ||
          "Choose articles for the homepage snippets module. Order matters — use the reposition form."}
      </p>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-700 p-3">
        <label className="min-w-[16rem] flex-1 space-y-1 text-sm text-slate-300">
          <span>{t("articles.firstPageAdd") || "Add article"}</span>
          <select
            className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
            value={pickerId}
            onChange={(e) => setPickerId(e.target.value)}
          >
            <option value="">
              {t("articles.firstPagePick") || "Select an article…"}
            </option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title[locale] || a.title.ro || a.slug}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" disabled={!pickerId} onClick={addSelected}>
          {t("articles.firstPageAddBtn") || "Add"}
        </Button>
      </div>

      <SndGrid<FirstPageRow>
        gridId="articles-first-page"
        rows={rows}
        columns={columns}
        onChange={(next) =>
          setSlots(
            next.map((row, index) => ({
              id: row.article_id,
              article_id: row.article_id,
              position: index + 1,
            })),
          )
        }
        onSave={async (nextRows) => {
          const payload = nextRows.map((row, index) => ({
            article_id: row.article_id,
            position: index + 1,
          }));
          const res = await fetch("/api/site/articles/first-page", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slots: payload }),
          });
          const data = (await res.json()) as {
            slots?: ArticleFirstPageSlot[];
            error?: string;
          };
          if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
          if (data.slots) setSlots(data.slots);
        }}
        createEmpty={() => ({
          id: "",
          article_id: "",
          position: slots.length + 1,
          title: "",
          slug: "",
          enabled: true,
        })}
        validateDraft={() =>
          t("articles.firstPageNoCreate") ||
          "Use the Add article control above."
        }
        renderForm={() => (
          <p className="text-sm text-slate-400">
            {t("articles.firstPageNoCreate") ||
              "Use the Add article control above. Reposition with From/To."}
          </p>
        )}
      />
    </div>
  );
}
