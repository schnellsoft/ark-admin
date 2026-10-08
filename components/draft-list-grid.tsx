"use client";

import { useMemo, useState } from "react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emptyLocaleMap, type LocaleMap } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";

export type DraftListRow = {
  id: string;
  position: number;
  [key: string]: unknown;
};

type FieldDef =
  | { name: string; label: string; kind: "text" | "url" | "slug" }
  | { name: string; label: string; kind: "i18n"; multiline?: boolean };

function asLocaleMap(value: unknown): LocaleMap {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Partial<LocaleMap>;
    return { ro: v.ro ?? "", bg: v.bg ?? "", en: v.en ?? "" };
  }
  if (typeof value === "string") return emptyLocaleMap(value);
  return emptyLocaleMap();
}

function displayLabel(value: unknown): string {
  const map = asLocaleMap(value);
  return map.ro || map.en || map.bg || "";
}

/** Normalize legacy `{ itemsJson: "..." }` or `{ items: [...] }` drafts into rows. */
export function normalizeDraftItems(
  draft: unknown,
  mapItem: (raw: Record<string, unknown>, index: number) => DraftListRow,
): DraftListRow[] {
  let items: unknown[] = [];
  if (draft && typeof draft === "object") {
    const d = draft as Record<string, unknown>;
    if (Array.isArray(d.items)) items = d.items;
    else if (typeof d.itemsJson === "string") {
      try {
        const parsed = JSON.parse(d.itemsJson) as unknown;
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        items = [];
      }
    }
  }
  return items.map((item, index) => {
    const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return mapItem(raw, index);
  });
}

export function DraftListGrid({
  gridId,
  draftKey,
  initialRows,
  fields,
  columns,
  createEmpty,
}: {
  gridId: string;
  draftKey: string;
  initialRows: DraftListRow[];
  fields: FieldDef[];
  columns: SndColumn<DraftListRow>[];
  createEmpty: () => Partial<DraftListRow>;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState(initialRows);

  const cols = useMemo(() => columns, [columns]);

  return (
    <SndGrid<DraftListRow>
      gridId={gridId}
      rows={rows}
      columns={cols}
      onChange={setRows}
      onSave={async (next) => {
        const res = await fetch("/api/site/drafts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: draftKey, payload: { items: next } }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? t("grid.saveFailed"));
        }
        setRows(next);
      }}
      createEmpty={createEmpty}
      renderForm={({ draft, setDraft }) => {
        if (!draft) return null;
        return (
          <div className="space-y-3">
            {fields.map((field) => {
              if (field.kind === "i18n") {
                return (
                  <MultilingualTextEditor
                    key={field.name}
                    label={field.label}
                    multiline={field.multiline}
                    value={asLocaleMap(draft[field.name])}
                    onChange={(map) => setDraft({ ...draft, [field.name]: map })}
                  />
                );
              }
              return (
                <div key={field.name} className="space-y-1">
                  <Label>{field.label}</Label>
                  <Input
                    value={String(draft[field.name] ?? "")}
                    onChange={(e) => setDraft({ ...draft, [field.name]: e.target.value })}
                    placeholder={field.kind === "url" ? "https://" : undefined}
                  />
                </div>
              );
            })}
          </div>
        );
      }}
    />
  );
}

export { asLocaleMap, displayLabel };
