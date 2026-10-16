"use client";

import { useId, useMemo, useState } from "react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { IconPickerPanel } from "@/components/icon-picker-panel";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import { emptyLocaleMap } from "@/lib/i18n";
import {
  asFooterIconLabel,
  footerIconLabelText,
  validateFooterIconDraft,
  type FooterIconRow,
} from "@/lib/footer-shared";
import type { IconRow } from "@/lib/icons";

function FooterIconFormFields({
  draft,
  setDraft,
  libraryIcons,
}: {
  draft: Partial<FooterIconRow> | null;
  setDraft: (draft: Partial<FooterIconRow> | null) => void;
  libraryIcons: IconRow[];
}) {
  const { t } = useI18n();
  const [pickerOpen, setPickerOpen] = useState(false);
  const previewId = useId();
  if (!draft) return null;

  const previewSvg =
    draft.svg ||
    libraryIcons.find((icon) => icon.id === draft.icon_id)?.svg ||
    "";

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3 rounded-xl border border-slate-700 p-4">
        <legend className="px-1 text-sm font-medium text-teal-200">
          {t("footer.selectIcon")}
        </legend>
        <div className="flex flex-wrap items-center gap-4">
          <div
            id={previewId}
            className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-600 bg-slate-900 text-teal-300 [&_svg]:h-9 [&_svg]:w-9"
            aria-live="polite"
          >
            {previewSvg ? (
              <span
                className="inline-flex h-full w-full items-center justify-center [&_svg]:h-9 [&_svg]:w-9"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <span className="text-[10px] text-slate-500">—</span>
            )}
          </div>
          <div className="space-y-1">
            <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
              {t("footer.selectIcon")}
            </Button>
            <p className="text-xs text-slate-500">
              {draft.name ? draft.name : t("footer.noIcon")}
            </p>
          </div>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <MultilingualTextEditor
            label={t("field.label")}
            value={asFooterIconLabel(draft.label)}
            onChange={(label) => setDraft({ ...draft, label })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fi-aria">{t("footer.ariaLabel")}</Label>
          <Input
            id="fi-aria"
            value={draft.aria_label ?? ""}
            onChange={(e) => setDraft({ ...draft, aria_label: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="fi-link">{t("field.href")}</Label>
          <Input
            id="fi-link"
            value={draft.link ?? ""}
            onChange={(e) => setDraft({ ...draft, link: e.target.value })}
            placeholder="#"
          />
        </div>
      </div>

      <IconPickerPanel
        icons={libraryIcons}
        selectedId={draft.icon_id}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(icon) =>
          setDraft({
            ...draft,
            icon_id: icon.id,
            name: icon.name,
            svg: icon.svg,
          })
        }
      />
    </div>
  );
}

export function FooterManager({
  initialIcons,
  libraryIcons,
}: {
  initialIcons: FooterIconRow[];
  libraryIcons: IconRow[];
}) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState(initialIcons);

  const columns = useMemo<SndColumn<FooterIconRow>[]>(
    () => [
      {
        id: "preview",
        header: t("icons.svg"),
        filterValue: (r) => `${r.name} ${footerIconLabelText(r.label, locale)}`,
        cell: (r) => (
          <div className="flex items-center gap-2">
            {r.svg ? (
              <span
                className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-slate-800 text-teal-300 [&_svg]:h-5 [&_svg]:w-5"
                dangerouslySetInnerHTML={{ __html: r.svg }}
              />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-xs text-slate-500">
                —
              </span>
            )}
            <span className="font-medium text-teal-200">{r.name || "—"}</span>
          </div>
        ),
      },
      {
        id: "label",
        header: t("field.label"),
        filterValue: (r) => footerIconLabelText(r.label, locale),
        cell: (r) => {
          const text = footerIconLabelText(r.label, locale);
          return text ? (
            <span className="text-slate-200">{text}</span>
          ) : (
            <span className="text-slate-600">—</span>
          );
        },
      },
      {
        id: "link",
        header: t("field.href"),
        filterValue: (r) => r.link,
        cell: (r) => <code className="text-xs text-slate-400">{r.link || "#"}</code>,
      },
    ],
    [t, locale],
  );

  return (
    <SndGrid<FooterIconRow>
      gridId="site-footer-icons"
      rows={rows}
      columns={columns}
      onChange={(next) =>
        setRows(
          next.map((row) => ({
            ...row,
            link: row.link?.trim() ? row.link.trim() : "#",
          })),
        )
      }
      onSave={async (next) => {
        const res = await fetch("/api/site/footer", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ icons: next }),
        });
        const data = (await res.json()) as {
          icons?: FooterIconRow[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        setRows(data.icons ?? next);
      }}
      createEmpty={() => ({
        icon_id: null,
        name: "",
        label: emptyLocaleMap(""),
        aria_label: "",
        link: "",
        svg: "",
      })}
      validateDraft={(draft) => {
        const error = validateFooterIconDraft(draft);
        return error ? t("footer.validation") : null;
      }}
      renderForm={({ draft, setDraft }) => (
        <FooterIconFormFields
          draft={draft}
          setDraft={setDraft}
          libraryIcons={libraryIcons}
        />
      )}
    />
  );
}
