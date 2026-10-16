"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { StuffCategoriesManager } from "@/components/stuff-categories-manager";
import { StuffGridManager } from "@/components/stuff-grid-manager";
import { StuffNamedCatalogManager } from "@/components/stuff-named-catalog-manager";
import { StuffSpotlightSettingsForm } from "@/components/stuff-spotlight-settings-form";
import type {
  StuffCategory,
  StuffMember,
  StuffProvidedService,
  StuffRole,
  StuffSpecialty,
  StuffSpotlightSettings,
} from "@/lib/stuff-shared";
import type {
  LibraryCategory,
  LibraryImage,
  LibrarySettings,
} from "@/lib/library-shared";
import { cn } from "@/lib/utils";

type Tab =
  | "list"
  | "categories"
  | "roles"
  | "specialties"
  | "provided-services"
  | "spotlight";

function parseTab(raw: string | null): Tab {
  if (
    raw === "categories" ||
    raw === "list" ||
    raw === "roles" ||
    raw === "specialties" ||
    raw === "provided-services" ||
    raw === "spotlight"
  ) {
    return raw;
  }
  return "list";
}

export function StuffManager({
  categories: initialCategories,
  members,
  roles: initialRoles,
  specialties: initialSpecialties,
  providedServices: initialProvidedServices,
  spotlightSettings,
  librarySettings,
  libraryAssets,
  libraryCategories,
}: {
  categories: StuffCategory[];
  members: StuffMember[];
  roles: StuffRole[];
  specialties: StuffSpecialty[];
  providedServices: StuffProvidedService[];
  spotlightSettings: StuffSpotlightSettings;
  librarySettings: LibrarySettings;
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get("tab")));
  const [categories, setCategories] = useState(initialCategories);
  const [roles, setRoles] = useState(initialRoles);
  const [specialties, setSpecialties] = useState(initialSpecialties);
  const [providedServices, setProvidedServices] = useState(
    initialProvidedServices,
  );

  useEffect(() => {
    setTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "list", label: t("stuff.tabList") || "Stuff list" },
    { id: "categories", label: t("stuff.tabCategories") || "Categories" },
    { id: "roles", label: t("stuff.tabRoles") || "Roles" },
    { id: "specialties", label: t("stuff.tabSpecialties") || "Specialties" },
    {
      id: "provided-services",
      label: t("stuff.tabProvidedServices") || "Provided services",
    },
    { id: "spotlight", label: t("stuff.tabSpotlight") || "Spotlight" },
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
          onSaved={setCategories}
        />
      ) : null}
      {tab === "roles" ? (
        <StuffNamedCatalogManager
          gridId="stuff-roles"
          title={t("stuff.role") || "Role"}
          initialRows={roles}
          saveUrl="/api/site/stuff/roles"
          bodyKey="roles"
          onSaved={setRoles}
        />
      ) : null}
      {tab === "specialties" ? (
        <StuffNamedCatalogManager
          gridId="stuff-specialties"
          title={t("stuff.specialty") || "Specialty"}
          initialRows={specialties}
          saveUrl="/api/site/stuff/specialties"
          bodyKey="specialties"
          onSaved={setSpecialties}
        />
      ) : null}
      {tab === "provided-services" ? (
        <StuffNamedCatalogManager
          gridId="stuff-provided-services"
          title={t("stuff.providedService") || "Provided service"}
          initialRows={providedServices}
          saveUrl="/api/site/stuff/provided-services"
          bodyKey="services"
          onSaved={setProvidedServices}
        />
      ) : null}
      {tab === "spotlight" ? (
        <StuffSpotlightSettingsForm initial={spotlightSettings} />
      ) : null}
      {tab === "list" ? (
        <StuffGridManager
          initialMembers={members}
          categories={categories}
          roles={roles}
          specialties={specialties}
          providedServices={providedServices}
          librarySettings={librarySettings}
          libraryAssets={libraryAssets}
          libraryCategories={libraryCategories}
        />
      ) : null}
    </div>
  );
}
