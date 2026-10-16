"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

function tabFromPath(pathname: string, searchTab: string | null): Tab {
  if (pathname.endsWith("/categories") || pathname.includes("/categories/")) {
    return "categories";
  }
  if (pathname.endsWith("/recommended") || pathname.includes("/recommended/")) {
    return "recommended";
  }
  if (
    searchTab === "categories" ||
    searchTab === "recommended" ||
    searchTab === "services"
  ) {
    return searchTab;
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() =>
    tabFromPath(pathname, searchParams.get("tab")),
  );

  useEffect(() => {
    setTab(tabFromPath(pathname, searchParams.get("tab")));
  }, [pathname, searchParams]);

  const tabs: Array<{ id: Tab; label: string; href: string }> = [
    {
      id: "categories",
      label: t("services.tabCategories") || "Categories",
      href: "/site/services/categories",
    },
    {
      id: "services",
      label: t("services.tabServices") || "Services",
      href: "/site/services",
    },
    {
      id: "recommended",
      label: t("services.tabRecommended") || "Recommended",
      href: "/site/services/recommended",
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
          {t("section.services.title")}
        </h1>
        <p className="text-slate-400">{t("section.services.description")}</p>
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
