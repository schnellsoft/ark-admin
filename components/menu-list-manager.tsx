"use client";

import { useMemo } from "react";
import {
  DraftListGrid,
  displayLabel,
  normalizeDraftItems,
} from "@/components/draft-list-grid";
import { useI18n } from "@/components/i18n-provider";
import { emptyLocaleMap } from "@/lib/i18n";

export function MenuListManager({ initialDraft }: { initialDraft: unknown }) {
  const { t } = useI18n();
  const initialRows = useMemo(
    () =>
      normalizeDraftItems(initialDraft, (raw, index) => ({
        id: String(raw.id ?? crypto.randomUUID()),
        position: typeof raw.position === "number" ? raw.position : index + 1,
        label:
          raw.label && typeof raw.label === "object"
            ? raw.label
            : emptyLocaleMap(String(raw.label ?? "Home")),
        href: String(raw.href ?? "/"),
      })),
    [initialDraft],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.menu.title")}
        </h1>
        <p className="text-slate-400">{t("section.menu.description")}</p>
      </div>
      <DraftListGrid
        gridId="header-menu"
        draftKey="header-menu"
        initialRows={initialRows}
        createEmpty={() => ({ label: emptyLocaleMap(""), href: "/" })}
        fields={[
          { name: "label", label: t("field.label"), kind: "i18n" },
          { name: "href", label: t("field.href"), kind: "url" },
        ]}
        columns={[
          {
            id: "label",
            header: t("field.label"),
            filterValue: (r) => displayLabel(r.label),
            cell: (r) => displayLabel(r.label) || "—",
          },
          {
            id: "href",
            header: t("field.href"),
            filterValue: (r) => String(r.href ?? ""),
            cell: (r) => <code className="text-xs text-slate-400">{String(r.href ?? "")}</code>,
          },
        ]}
      />
    </div>
  );
}
