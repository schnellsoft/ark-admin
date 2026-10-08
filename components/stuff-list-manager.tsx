"use client";

import { useMemo } from "react";
import {
  DraftListGrid,
  displayLabel,
  normalizeDraftItems,
} from "@/components/draft-list-grid";
import { useI18n } from "@/components/i18n-provider";
import { emptyLocaleMap } from "@/lib/i18n";

export function StuffListManager({ initialDraft }: { initialDraft: unknown }) {
  const { t } = useI18n();
  const initialRows = useMemo(
    () =>
      normalizeDraftItems(initialDraft, (raw, index) => ({
        id: String(raw.id ?? crypto.randomUUID()),
        position: typeof raw.position === "number" ? raw.position : index + 1,
        name:
          raw.name && typeof raw.name === "object"
            ? raw.name
            : emptyLocaleMap(String(raw.name ?? "")),
        role:
          raw.role && typeof raw.role === "object"
            ? raw.role
            : emptyLocaleMap(String(raw.role ?? "")),
        bio:
          raw.bio && typeof raw.bio === "object"
            ? raw.bio
            : emptyLocaleMap(String(raw.bio ?? "")),
      })),
    [initialDraft],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.stuff.title")}
        </h1>
        <p className="text-slate-400">{t("section.stuff.description")}</p>
      </div>
      <DraftListGrid
        gridId="stuff"
        draftKey="stuff"
        initialRows={initialRows}
        createEmpty={() => ({
          name: emptyLocaleMap(""),
          role: emptyLocaleMap(""),
          bio: emptyLocaleMap(""),
        })}
        fields={[
          { name: "name", label: t("field.name"), kind: "i18n" },
          { name: "role", label: t("field.role"), kind: "i18n" },
          { name: "bio", label: t("field.bio"), kind: "i18n", multiline: true },
        ]}
        columns={[
          {
            id: "name",
            header: t("field.name"),
            filterValue: (r) => displayLabel(r.name),
            cell: (r) => displayLabel(r.name) || "—",
          },
          {
            id: "role",
            header: t("field.role"),
            filterValue: (r) => displayLabel(r.role),
            cell: (r) => displayLabel(r.role) || "—",
          },
        ]}
      />
    </div>
  );
}
