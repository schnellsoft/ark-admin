"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { ArticlesCategoriesManager } from "@/components/articles-categories-manager";
import { ArticlesFirstPageManager } from "@/components/articles-first-page-manager";
import { ArticlesGridManager } from "@/components/articles-grid-manager";
import type {
  ArticleCategory,
  ArticleFirstPageSlot,
  ArticleRow,
  ArticleSubcategory,
} from "@/lib/articles-shared";
import type { LibraryCategory, LibraryImage } from "@/lib/library-shared";
import { cn } from "@/lib/utils";

type Tab = "list" | "categories" | "first-page";

function tabFromPath(pathname: string): Tab {
  if (pathname.endsWith("/categories") || pathname.includes("/categories/")) {
    return "categories";
  }
  if (
    pathname.endsWith("/first-page") ||
    pathname.includes("/first-page/")
  ) {
    return "first-page";
  }
  return "list";
}

export function ArticlesManager({
  categories,
  subcategories,
  articles,
  libraryAssets,
  libraryCategories,
  firstPageSlots = [],
}: {
  categories: ArticleCategory[];
  subcategories: ArticleSubcategory[];
  articles: ArticleRow[];
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
  firstPageSlots?: ArticleFirstPageSlot[];
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(() => tabFromPath(pathname));

  useEffect(() => {
    setTab(tabFromPath(pathname));
  }, [pathname]);

  const tabs: Array<{ id: Tab; label: string; href: string }> = [
    {
      id: "list",
      label: t("articles.tabList") || "Articles list",
      href: "/site/articles",
    },
    {
      id: "categories",
      label: t("articles.tabCategories") || "Articles categories",
      href: "/site/articles/categories",
    },
    {
      id: "first-page",
      label: t("articles.tabFirstPage") || "On first page",
      href: "/site/articles/first-page",
    },
  ];

  function selectTab(item: { id: Tab; href: string }) {
    setTab(item.id);
    if (pathname !== item.href) {
      router.push(item.href);
    }
  }

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
            onClick={() => selectTab(item)}
            className={cn(
              "rounded-t-md px-3 py-2 text-sm transition-colors",
              tab === item.id
                ? "bg-slate-800 text-teal-200"
                : "text-slate-400 hover:text-slate-200",
            )}
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
      {tab === "first-page" ? (
        <ArticlesFirstPageManager
          initialSlots={firstPageSlots}
          articles={articles}
        />
      ) : null}
      {tab === "list" ? (
        <ArticlesGridManager
          initialArticles={articles}
          categories={categories}
          subcategories={subcategories}
          libraryAssets={libraryAssets}
          libraryCategories={libraryCategories}
        />
      ) : null}
    </div>
  );
}
