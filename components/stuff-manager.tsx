"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { StuffCategoriesManager } from "@/components/stuff-categories-manager";
import { StuffGridManager } from "@/components/stuff-grid-manager";
import type {
  StuffCategory,
  StuffMember,
  StuffSubcategory,
} from "@/lib/stuff-shared";
import type { LibrarySettings } from "@/lib/library-shared";
import { cn } from "@/lib/utils";

type Tab = "list" | "categories";

function parseTab(raw: string | null): Tab {
  if (raw === "categories" || raw === "list") return raw;
  return "list";
}

export function StuffManager({
  categories,
  subcategories,
  members,
  librarySettings,
}: {
  categories: StuffCategory[];
  subcategories: StuffSubcategory[];
  members: StuffMember[];
  librarySettings: LibrarySettings;
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
      label: t("stuff.tabList") || "Stuff list",
    },
    {
      id: "categories",
      label: t("stuff.tabCategories") || "Categories",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.stuff.title")}
        </h1>
        <p className="text-slate-400">{t("section.stuff.description")}</p>
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
        <StuffCategoriesManager
          initialCategories={categories}
          initialSubcategories={subcategories}
        />
      ) : null}
      {tab === "list" ? (
        <StuffGridManager
          initialMembers={members}
          categories={categories}
          subcategories={subcategories}
          librarySettings={librarySettings}
        />
      ) : null}
    </div>
  );
}
