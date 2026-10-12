"use client";

import { useId, useState } from "react";
import { HexColorField } from "@/components/hex-color-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";

export type HeaderStripSettings = {
  more: boolean;
  maxWidth: string;
  color: string;
  colorHover: string;
};

export function HeaderStripSettingsForm({
  title,
  initial,
  saveUrl,
}: {
  title: string;
  initial: HeaderStripSettings;
  /** PATCH endpoint that accepts { more, maxWidth, color, colorHover }. */
  saveUrl: string;
}) {
  const { t } = useI18n();
  const [more, setMore] = useState(initial.more);
  const [maxWidth, setMaxWidth] = useState(initial.maxWidth);
  const [color, setColor] = useState(initial.color);
  const [colorHover, setColorHover] = useState(initial.colorHover);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const moreId = useId();
  const widthId = useId();
  const statusId = useId();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus(t("headerIcons.saving"));
    try {
      const res = await fetch(saveUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ more, maxWidth, color, colorHover }),
      });
      const data = (await res.json()) as {
        settings?: HeaderStripSettings;
        error?: string;
      };
      if (!res.ok) {
        setStatus(data.error ?? t("headerIcons.saveFailed"));
        return;
      }
      if (data.settings) {
        setMore(data.settings.more);
        setMaxWidth(data.settings.maxWidth);
        setColor(data.settings.color);
        setColorHover(data.settings.colorHover);
      }
      setStatus(t("headerIcons.settingsSaved"));
    } catch {
      setStatus(t("headerIcons.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="max-w-xl space-y-4 rounded-xl border border-slate-700 p-4"
      aria-describedby={statusId}
    >
      <h2 className="text-lg font-medium text-teal-200">{title}</h2>

      <div className="flex items-center gap-3">
        <input
          id={moreId}
          type="checkbox"
          checked={more}
          onChange={(e) => setMore(e.target.checked)}
          className="h-4 w-4 accent-teal-500"
        />
        <Label htmlFor={moreId}>{t("headerIcons.morePoints")}</Label>
      </div>

      <div className="space-y-1">
        <Label htmlFor={widthId}>{t("headerIcons.maxWidth")}</Label>
        <div className="flex max-w-xs items-center gap-2">
          <Input
            id={widthId}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={maxWidth}
            onChange={(e) => setMaxWidth(e.target.value.replace(/[^\d]/g, ""))}
            className="flex-1"
          />
          <span className="text-sm text-slate-400" aria-hidden="true">
            px
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <HexColorField
          id={`${widthId}-color`}
          label={t("headerIcons.color")}
          value={color}
          onChange={setColor}
        />
        <HexColorField
          id={`${widthId}-color-hover`}
          label={t("headerIcons.colorHover")}
          value={colorHover}
          onChange={setColorHover}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("headerIcons.saving") : t("headerIcons.saveSettings")}
        </Button>
        <p id={statusId} className="text-sm text-slate-400" aria-live="polite">
          {status}
        </p>
      </div>
    </form>
  );
}
