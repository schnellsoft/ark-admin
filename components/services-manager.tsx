"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { ServicesCategoriesManager } from "@/components/services-categories-manager";
import { ServicesGridManager } from "@/components/services-grid-manager";
import { ServicesRecommendedManager } from "@/components/services-recommended-manager";
import type {
  ServiceCategory,
  ServiceRecommended,
  ServiceRow,
  ServiceSubcategory,
} from "@/lib/services-shared";
import type { IconRow } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Tab = "categories" | "services" | "recommended";

function parseTab(raw: string | null): Tab {
  if (raw === "categories" || raw === "recommended" || raw === "services") {
    return raw;
  }
  return "services";
}

export function ServicesManager({
  categories,
  subcategories,
  services,
  recommended,
  icons,
}: {
  categories: ServiceCategory[];
  subcategories: ServiceSubcategory[];
  services: ServiceRow[];
  recommended: ServiceRecommended[];
  icons: IconRow[];
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get("tab")));

  useEffect(() => {
    setTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const tabs: Array<{ id: Tab; label: string }> = [
    {
      id: "categories",
      label: t("services.tabCategories") || "Categories",
    },
    {
      id: "services",
      label: t("services.tabServices") || "Services",
    },
    {
      id: "recommended",
      label: t("services.tabRecommended") || "Recommended",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.services.title")}
        </h1>
        <p className="text-slate-400">{t("section.services.description")}</p>
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
        <ServicesCategoriesManager
          initialCategories={categories}
          initialSubcategories={subcategories}
        />
      ) : null}
      {tab === "services" ? (
        <ServicesGridManager
          initialServices={services}
          categories={categories}
          subcategories={subcategories}
          icons={icons}
        />
      ) : null}
      {tab === "recommended" ? (
        <ServicesRecommendedManager
          initialServices={services}
          initialRecommended={recommended}
        />
      ) : null}
    </div>
  );
}
