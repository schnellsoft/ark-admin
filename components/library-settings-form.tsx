"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import type { LibrarySettings } from "@/lib/library-shared";

export function LibrarySettingsForm({
  initial,
}: {
  initial: LibrarySettings;
}) {
  const { t } = useI18n();
  const [maxWidth, setMaxWidth] = useState(String(initial.maxWidth));
  const [convertToWebp, setConvertToWebp] = useState(initial.convertToWebp);
  const [jpegQuality, setJpegQuality] = useState(String(initial.jpegQuality));
  const [webpQuality, setWebpQuality] = useState(String(initial.webpQuality));
  const [maxBytesMb, setMaxBytesMb] = useState(
    String(Math.round(initial.maxBytes / (1024 * 1024))),
  );
  const [maxVideoBytesMb, setMaxVideoBytesMb] = useState(
    String(Math.round(initial.maxVideoBytes / (1024 * 1024))),
  );
  const [maxFilesPerBatch, setMaxFilesPerBatch] = useState(
    String(initial.maxFilesPerBatch),
  );
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const formId = useId();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus(t("library.saving"));
    try {
      const res = await fetch("/api/site/media/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxWidth: Number(maxWidth),
          convertToWebp,
          jpegQuality: Number(jpegQuality),
          webpQuality: Number(webpQuality),
          maxBytes: Number(maxBytesMb) * 1024 * 1024,
          maxVideoBytes: Number(maxVideoBytesMb) * 1024 * 1024,
          maxFilesPerBatch: Number(maxFilesPerBatch),
        }),
      });
      const data = (await res.json()) as {
        settings?: LibrarySettings;
        error?: string;
      };
      if (!res.ok) {
        setStatus(data.error ?? t("library.saveFailed"));
        return;
      }
      if (data.settings) {
        setMaxWidth(String(data.settings.maxWidth));
        setConvertToWebp(data.settings.convertToWebp);
        setJpegQuality(String(data.settings.jpegQuality));
        setWebpQuality(String(data.settings.webpQuality));
        setMaxBytesMb(String(Math.round(data.settings.maxBytes / (1024 * 1024))));
        setMaxVideoBytesMb(
          String(Math.round(data.settings.maxVideoBytes / (1024 * 1024))),
        );
        setMaxFilesPerBatch(String(data.settings.maxFilesPerBatch));
      }
      setStatus(t("library.settingsSaved"));
    } catch {
      setStatus(t("library.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="max-w-xl space-y-4 rounded-xl border border-slate-700 p-4"
    >
      <h2 className="text-lg font-medium text-teal-200">{t("library.settings")}</h2>

      <div className="space-y-1">
        <Label htmlFor={`${formId}-width`}>{t("library.maxWidth")}</Label>
        <div className="flex max-w-xs items-center gap-2">
          <Input
            id={`${formId}-width`}
            type="number"
            min={1}
            max={10000}
            value={maxWidth}
            onChange={(e) => setMaxWidth(e.target.value.replace(/[^\d]/g, ""))}
          />
          <span className="text-sm text-slate-400">px</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id={`${formId}-webp`}
          type="checkbox"
          checked={convertToWebp}
          onChange={(e) => setConvertToWebp(e.target.checked)}
          className="h-4 w-4 accent-teal-500"
        />
        <Label htmlFor={`${formId}-webp`}>{t("library.convertWebp")}</Label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${formId}-jpeg`}>{t("library.jpegQuality")}</Label>
          <Input
            id={`${formId}-jpeg`}
            type="number"
            min={0.05}
            max={1}
            step={0.01}
            value={jpegQuality}
            onChange={(e) => setJpegQuality(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${formId}-webp-q`}>{t("library.webpQuality")}</Label>
          <Input
            id={`${formId}-webp-q`}
            type="number"
            min={0.05}
            max={1}
            step={0.01}
            value={webpQuality}
            onChange={(e) => setWebpQuality(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${formId}-mb`}>{t("library.maxBytesMb")}</Label>
          <Input
            id={`${formId}-mb`}
            type="number"
            min={1}
            value={maxBytesMb}
            onChange={(e) => setMaxBytesMb(e.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${formId}-vmb`}>{t("library.maxVideoBytesMb")}</Label>
          <Input
            id={`${formId}-vmb`}
            type="number"
            min={1}
            value={maxVideoBytesMb}
            onChange={(e) =>
              setMaxVideoBytesMb(e.target.value.replace(/[^\d]/g, ""))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${formId}-batch`}>{t("library.maxFiles")}</Label>
          <Input
            id={`${formId}-batch`}
            type="number"
            min={1}
            max={100}
            value={maxFilesPerBatch}
            onChange={(e) =>
              setMaxFilesPerBatch(e.target.value.replace(/[^\d]/g, ""))
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("library.saving") : t("library.saveSettings")}
        </Button>
        <p className="text-sm text-slate-400" aria-live="polite">
          {status}
        </p>
      </div>
    </form>
  );
}
