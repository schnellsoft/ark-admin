"use client";

import { useMemo, useState } from "react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { useI18n } from "@/components/i18n-provider";
import {
  emptyStuffNamedCatalog,
  validateStuffNamedCatalogDraft,
  type StuffNamedCatalog,
} from "@/lib/stuff-shared";
import { emptyLocaleMap } from "@/lib/i18n";

export function StuffNamedCatalogManager({
  gridId,
  title,
  initialRows,
  saveUrl,
  bodyKey,
  onSaved,
}: {
  gridId: string;
  title: string;
  initialRows: StuffNamedCatalog[];
  saveUrl: string;
  /** JSON key for the array in the PUT body, e.g. "roles" | "specialties" | "services" */
  bodyKey: string;
  onSaved?: (rows: StuffNamedCatalog[]) => void;
}) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState(initialRows);

  const columns = useMemo<SndColumn<StuffNamedCatalog>[]>(
    () => [
      {
        id: "name",
        header: t("field.name"),
        filterValue: (row) =>
          `${row.name.ro} ${row.name.en} ${row.name.bg}`,
        cell: (row) => (
          <span className="font-medium text-slate-200">
            {row.name[locale] || row.name.ro || row.name.en || "—"}
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
      <h2 className="text-lg text-teal-200">{title}</h2>
      <SndGrid<StuffNamedCatalog>
        gridId={gridId}
        rows={rows}
        columns={columns}
        onChange={setRows}
        onSave={async (next) => {
          const res = await fetch(saveUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [bodyKey]: next }),
          });
          const data = (await res.json()) as Record<string, unknown> & {
            error?: string;
          };
          if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
          const saved = data[bodyKey] as StuffNamedCatalog[] | undefined;
          if (saved) {
            setRows(saved);
            onSaved?.(saved);
          }
        }}
        createEmpty={() => emptyStuffNamedCatalog()}
        validateDraft={validateStuffNamedCatalogDraft}
        renderForm={({ draft, setDraft }) =>
          draft ? (
            <div className="space-y-3">
              <MultilingualTextEditor
                label={t("field.name")}
                value={draft.name ?? emptyLocaleMap()}
                onChange={(name) => setDraft({ ...draft, name })}
              />
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
          ) : null
        }
      />
    </div>
  );
}
