"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  autoStuffCategorySlug,
  emptyStuffCategory,
  validateStuffCategoryDraft,
  type StuffCategory,
} from "@/lib/stuff-shared";
import { emptyLocaleMap } from "@/lib/i18n";

export function StuffCategoriesManager({
  initialCategories,
  onSaved,
}: {
  initialCategories: StuffCategory[];
  onSaved?: (rows: StuffCategory[]) => void;
}) {
  const { t, locale } = useI18n();
  const [categories, setCategories] = useState(initialCategories);
  const [slugUnique, setSlugUnique] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);

  const catColumns = useMemo<SndColumn<StuffCategory>[]>(
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

  return (
    <div className="space-y-3">
      <h2 className="text-lg text-teal-200">
        {t("stuff.category") || "Category"}
      </h2>
      <SndGrid<StuffCategory>
        gridId="stuff-categories"
        rows={categories}
        columns={catColumns}
        onChange={setCategories}
        onSave={async (rows) => {
          const res = await fetch("/api/site/stuff/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categories: rows }),
          });
          const data = (await res.json()) as {
            categories?: StuffCategory[];
            error?: string;
          };
          if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
          if (data.categories) {
            setCategories(data.categories);
            onSaved?.(data.categories);
          }
        }}
        createEmpty={() => emptyStuffCategory()}
        validateDraft={(draft) => {
          const base = validateStuffCategoryDraft(draft);
          if (base) return base;
          if (slugUnique !== true) return t("stuff.slugUniqueBad");
          return null;
        }}
        renderForm={({ draft, setDraft }) => (
          <StuffCategoryFormFields
            draft={draft}
            setDraft={setDraft}
            t={t}
            slugUnique={slugUnique}
            setSlugUnique={setSlugUnique}
            slugChecking={slugChecking}
            setSlugChecking={setSlugChecking}
          />
        )}
      />
    </div>
  );
}

function StuffCategoryFormFields({
  draft,
  setDraft,
  t,
  slugUnique,
  setSlugUnique,
  slugChecking,
  setSlugChecking,
}: {
  draft: Partial<StuffCategory> | null;
  setDraft: (next: Partial<StuffCategory> | null) => void;
  t: (key: string) => string;
  slugUnique: boolean | null;
  setSlugUnique: (v: boolean | null) => void;
  slugChecking: boolean;
  setSlugChecking: (v: boolean) => void;
}) {
  const slug = draft?.slug ?? "";
  const excludeId = draft?.id;

  useEffect(() => {
    if (!slug.trim()) {
      setSlugUnique(null);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSlugChecking(true);
      try {
        const qs = new URLSearchParams({
          slug: slug.trim(),
          kind: "category",
        });
        if (excludeId) qs.set("excludeId", excludeId);
        const res = await fetch(`/api/site/stuff/check-slug?${qs}`);
        const data = (await res.json()) as { unique?: boolean };
        setSlugUnique(Boolean(data.unique));
      } catch {
        setSlugUnique(null);
      } finally {
        setSlugChecking(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [slug, excludeId, setSlugChecking, setSlugUnique]);

  if (!draft) return null;

  return (
    <div className="space-y-3">
      <MultilingualTextEditor
        label={t("field.name")}
        value={draft.name ?? emptyLocaleMap()}
        onChange={(name) => setDraft({ ...draft, name })}
        onBlur={(name) => {
          if (!draft.slug?.trim()) {
            const hasName = Boolean(
              name.en?.trim() || name.ro?.trim() || name.bg?.trim(),
            );
            if (hasName) {
              setDraft({
                ...draft,
                name,
                slug: autoStuffCategorySlug(name),
              });
            }
          }
        }}
      />
      <div className="space-y-1">
        <Label>{t("field.slug") || "Slug"}</Label>
        <div className="flex items-center gap-2">
          <Input
            className="flex-1"
            value={draft.slug ?? ""}
            required
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
          />
          {slugChecking ? (
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {t("stuff.slugChecking")}
            </span>
          ) : slugUnique === true ? (
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-green-500/40 bg-green-500/10 text-green-500"
              title={t("stuff.slugUniqueOk")}
              aria-label={t("stuff.slugUniqueOk")}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
          ) : slugUnique === false ? (
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-500"
              title={t("stuff.slugUniqueBad")}
              aria-label={t("stuff.slugUniqueBad")}
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </span>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">{t("stuff.slugHint")}</p>
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
