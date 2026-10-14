"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { ArticlesCategoriesManager } from "@/components/articles-categories-manager";
import { ArticlesGridManager } from "@/components/articles-grid-manager";
import type {
  ArticleCategory,
  ArticleRow,
  ArticleSubcategory,
} from "@/lib/articles-shared";
import { cn } from "@/lib/utils";

type Tab = "list" | "categories";

function parseTab(raw: string | null): Tab {
  if (raw === "categories" || raw === "list") return raw;
  return "list";
}

export function ArticlesManager({
  categories,
  subcategories,
  articles,
}: {
  categories: ArticleCategory[];
  subcategories: ArticleSubcategory[];
  articles: ArticleRow[];
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get("tab")));

  useEffect(() => {
    setTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const tabs: Array<{ id: Tab; label: string }> = [
    {
      id: "list",
      label: t("articles.tabList") || "Articles list",
    },
    {
      id: "categories",
      label: t("articles.tabCategories") || "Articles categories",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.articles.title")}
        </h1>
        <p className="text-slate-400">{t("section.articles.description")}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-px">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "rounded-t-md px-3 py-2 text-sm transition-colors",
              tab === item.id
                ? "bg-slate-800 text-teal-200"
                : "text-slate-400 hover:text-slate-200",
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "categories" ? (
        <ArticlesCategoriesManager
          initialCategories={categories}
          initialSubcategories={subcategories}
        />
      ) : null}
      {tab === "list" ? (
        <ArticlesGridManager
          initialArticles={articles}
          categories={categories}
          subcategories={subcategories}
        />
      ) : null}
    </div>
  );
}
