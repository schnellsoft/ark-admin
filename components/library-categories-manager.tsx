"use client";

import { useMemo, useState } from "react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  UNSPECIFIED_CATEGORY_ID,
  UNSPECIFIED_CATEGORY_NAME,
  validateLibraryCategoryDraft,
  type LibraryCategory,
} from "@/lib/library-shared";

export function LibraryCategoriesManager({
  initialCategories,
}: {
  initialCategories: LibraryCategory[];
}) {
  const { t } = useI18n();
  const [categories, setCategories] = useState(initialCategories);

  const columns = useMemo<SndColumn<LibraryCategory>[]>(
    () => [
      {
        id: "name",
        header: t("field.name"),
        filterValue: (row) => row.name,
        cell: (row) => (
          <span className="font-medium text-slate-200">
            {row.name}
            {row.is_system ? (
              <span className="ml-2 text-xs text-slate-500">({t("library.system")})</span>
            ) : null}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <SndGrid<LibraryCategory>
      gridId="library-categories"
      rows={categories}
      columns={columns}
      onChange={(next) => {
        // Keep Unspecified if accidentally removed from local state
        if (!next.some((c) => c.id === UNSPECIFIED_CATEGORY_ID)) {
          const unspecified =
            categories.find((c) => c.id === UNSPECIFIED_CATEGORY_ID) ?? {
              id: UNSPECIFIED_CATEGORY_ID,
              name: UNSPECIFIED_CATEGORY_NAME,
              position: 1,
              is_system: true,
            };
          setCategories(
            [unspecified, ...next].map((c, i) => ({ ...c, position: i + 1 })),
          );
          return;
        }
        setCategories(next);
      }}
      onSave={async (rows) => {
        const res = await fetch("/api/site/media/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: rows }),
        });
        const data = (await res.json()) as {
          categories?: LibraryCategory[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
        if (data.categories) setCategories(data.categories);
      }}
      createEmpty={() => ({
        name: "",
        is_system: false,
      })}
      validateDraft={(draft) => {
        if (draft.id === UNSPECIFIED_CATEGORY_ID) {
          const name = (draft.name ?? "").trim();
          if (name.toLowerCase() !== UNSPECIFIED_CATEGORY_NAME.toLowerCase()) {
            return t("library.unspecifiedLocked");
          }
        }
        return validateLibraryCategoryDraft(draft);
      }}
      renderForm={({ draft, setDraft, mode }) =>
        draft ? (
          <div className="space-y-1">
            <Label htmlFor="cat-name">{t("field.name")}</Label>
            <Input
              id="cat-name"
              value={draft.name ?? ""}
              disabled={
                mode === "edit" && draft.id === UNSPECIFIED_CATEGORY_ID
              }
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            {draft.id === UNSPECIFIED_CATEGORY_ID ? (
              <p className="text-xs text-slate-500">{t("library.unspecifiedLocked")}</p>
            ) : null}
          </div>
        ) : null
      }
    />
  );
}
