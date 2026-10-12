"use client";

import { useId, useMemo, useState } from "react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { HexColorField } from "@/components/hex-color-field";
import { HeaderStripSettingsForm } from "@/components/header-strip-settings-form";
import { IconPickerPanel } from "@/components/icon-picker-panel";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import { emptyLocaleMap } from "@/lib/i18n";
import {
  asHeaderIconLabel,
  headerIconLabelText,
  validateHeaderIconDraft,
  type HeaderIconRow,
  type HeaderIconSettings,
} from "@/lib/header-icons-shared";
import type { IconRow } from "@/lib/icons";

function HeaderIconFormFields({
  draft,
  setDraft,
  libraryIcons,
}: {
  draft: Partial<HeaderIconRow> | null;
  setDraft: (draft: Partial<HeaderIconRow> | null) => void;
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
          {t("headerIcons.selectIcon")}
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
              {t("headerIcons.selectIcon")}
            </Button>
            <p className="text-xs text-slate-500">
              {draft.name ? draft.name : t("headerIcons.noIcon")}
            </p>
          </div>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <MultilingualTextEditor
            label={t("field.label")}
            value={asHeaderIconLabel(draft.label)}
            onChange={(label) => setDraft({ ...draft, label })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hi-aria">{t("headerIcons.ariaLabel")}</Label>
          <Input
            id="hi-aria"
            value={draft.aria_label ?? ""}
            onChange={(e) => setDraft({ ...draft, aria_label: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="hi-desc">{t("headerIcons.description")}</Label>
          <Input
            id="hi-desc"
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="hi-link">{t("field.href")}</Label>
          <Input
            id="hi-link"
            value={draft.link ?? ""}
            onChange={(e) => setDraft({ ...draft, link: e.target.value })}
            placeholder="#"
          />
        </div>
        <HexColorField
          id="hi-color"
          label={t("headerIcons.color")}
          value={draft.color ?? ""}
          onChange={(color) => setDraft({ ...draft, color })}
        />
        <HexColorField
          id="hi-color-hover"
          label={t("headerIcons.colorHover")}
          value={draft.color_hover ?? ""}
          onChange={(color_hover) => setDraft({ ...draft, color_hover })}
        />
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

export function HeaderIconsManager({
  initialIcons,
  initialSettings,
  libraryIcons,
}: {
  initialIcons: HeaderIconRow[];
  initialSettings: HeaderIconSettings;
  libraryIcons: IconRow[];
}) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState(initialIcons);

  const columns = useMemo<SndColumn<HeaderIconRow>[]>(
    () => [
      {
        id: "preview",
        header: t("icons.svg"),
        filterValue: (r) => `${r.name} ${headerIconLabelText(r.label, locale)}`,
        cell: (r) => (
          <div className="flex items-center gap-2">
            {r.svg ? (
              <span
                className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-slate-800 text-teal-300 [&_svg]:h-5 [&_svg]:w-5"
                style={r.color ? { color: r.color } : undefined}
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
        filterValue: (r) => headerIconLabelText(r.label, locale),
        cell: (r) => {
          const text = headerIconLabelText(r.label, locale);
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
      {
        id: "color",
        header: t("headerIcons.color"),
        filterValue: (r) => r.color,
        cell: (r) =>
          r.color ? (
            <span className="inline-flex items-center gap-2 text-xs">
              <span
                className="inline-block h-4 w-4 rounded border border-slate-600"
                style={{ backgroundColor: r.color }}
              />
              {r.color}
            </span>
          ) : (
            <span className="text-slate-600">—</span>
          ),
      },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-8">
      <HeaderStripSettingsForm
        title={t("headerIcons.settings")}
        initial={{
          more: initialSettings.more,
          maxWidth: initialSettings.maxWidth,
          color: initialSettings.color,
          colorHover: initialSettings.colorHover,
        }}
        saveUrl="/api/site/header/icons"
      />

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-teal-200">{t("headerIcons.list")}</h2>
        <SndGrid<HeaderIconRow>
          gridId="site-header-icons"
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
            const res = await fetch("/api/site/header/icons", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ icons: next }),
            });
            const data = (await res.json()) as {
              icons?: HeaderIconRow[];
              error?: string;
            };
            if (!res.ok) throw new Error(data.error ?? "Save failed");
            setRows(data.icons ?? next);
          }}
          createEmpty={() => ({
            icon_id: null,
            name: "",
            label: emptyLocaleMap(""),
            description: "",
            aria_label: "",
            link: "",
            color: "",
            color_hover: "",
            svg: "",
          })}
          validateDraft={(draft) => {
            const error = validateHeaderIconDraft(draft);
            return error ? t("headerIcons.validation") : null;
          }}
          renderForm={({ draft, setDraft }) => (
            <HeaderIconFormFields
              draft={draft}
              setDraft={setDraft}
              libraryIcons={libraryIcons}
            />
          )}
        />
      </div>
    </div>
  );
}
