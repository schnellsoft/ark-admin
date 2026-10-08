"use client";

import { useMemo } from "react";
import {
  DraftListGrid,
  displayLabel,
  normalizeDraftItems,
} from "@/components/draft-list-grid";
import { useI18n } from "@/components/i18n-provider";
import { emptyLocaleMap } from "@/lib/i18n";

export function ArticlesListManager({ initialDraft }: { initialDraft: unknown }) {
  const { t } = useI18n();
  const initialRows = useMemo(
    () =>
      normalizeDraftItems(initialDraft, (raw, index) => ({
        id: String(raw.id ?? crypto.randomUUID()),
        position: typeof raw.position === "number" ? raw.position : index + 1,
        slug: String(raw.slug ?? ""),
        title:
          raw.title && typeof raw.title === "object"
            ? raw.title
            : emptyLocaleMap(String(raw.title ?? "")),
        html:
          raw.html && typeof raw.html === "object"
            ? raw.html
            : emptyLocaleMap(String(raw.html ?? "")),
      })),
    [initialDraft],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.articles.title")}
        </h1>
        <p className="text-slate-400">{t("section.articles.description")}</p>
      </div>
      <DraftListGrid
        gridId="articles"
        draftKey="articles"
        initialRows={initialRows}
        createEmpty={() => ({
          slug: "",
          title: emptyLocaleMap(""),
          html: emptyLocaleMap("<p></p>"),
        })}
        fields={[
          { name: "slug", label: t("field.slug"), kind: "slug" },
          { name: "title", label: t("field.title"), kind: "i18n" },
          { name: "html", label: t("field.html"), kind: "i18n", multiline: true },
        ]}
        columns={[
          {
            id: "slug",
            header: t("field.slug"),
            filterValue: (r) => String(r.slug ?? ""),
            cell: (r) => <code className="text-xs text-slate-400">{String(r.slug ?? "")}</code>,
          },
          {
            id: "title",
            header: t("field.title"),
            filterValue: (r) => displayLabel(r.title),
            cell: (r) => displayLabel(r.title) || "—",
          },
        ]}
      />
    </div>
  );
}
