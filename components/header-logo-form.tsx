"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n-provider";
import type {
  HeaderLogoDocument,
  HeaderLogoEntry,
  HeaderLogoPreviews,
  HeaderLogoSlot,
} from "@/lib/header-logo";

type SlotState = {
  file: File | null;
  svg: string;
};

function slotFileUrl(slot: HeaderLogoSlot, updatedAt: string) {
  const bust = updatedAt ? `&v=${encodeURIComponent(updatedAt)}` : "";
  return `/api/site/header/logo/file?slot=${encodeURIComponent(slot)}${bust}`;
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function entrySummary(entry: HeaderLogoEntry | null, emptyLabel: string): string {
  if (!entry) return emptyLabel;
  if (entry.type === "image") return `image → ${entry.src}`;
  return `svg (${entry.svg.length} chars)`;
}

function LogoSlotFieldset({
  slot,
  legend,
  fileLabel,
  svgLabel,
  fileHelp,
  svgHelp,
  previewLabel,
  current,
  emptyCurrent,
  updatedAt,
  savedPreview,
  state,
  onChange,
}: {
  slot: HeaderLogoSlot;
  legend: string;
  fileLabel: string;
  svgLabel: string;
  fileHelp: string;
  svgHelp: string;
  previewLabel: string;
  current: HeaderLogoEntry | null;
  emptyCurrent: string;
  updatedAt: string;
  savedPreview: string | null;
  state: SlotState;
  onChange: (next: SlotState) => void;
}) {
  const baseId = useId();
  const fileId = `${baseId}-${slot}-file`;
  const svgId = `${baseId}-${slot}-svg`;
  const fileHelpId = `${baseId}-${slot}-file-help`;
  const svgHelpId = `${baseId}-${slot}-svg-help`;
  const currentId = `${baseId}-${slot}-current`;
  const localPreview = useObjectUrl(state.file);
  const apiPreview =
    current?.type === "image" && current.src
      ? slotFileUrl(slot, updatedAt)
      : null;
  const previewSrc = localPreview ?? savedPreview ?? apiPreview;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [previewSrc]);

  return (
    <fieldset className="space-y-4 rounded-xl border border-slate-700 p-4">
      <legend className="px-1 text-base font-medium text-teal-200">{legend}</legend>

      <p id={currentId} className="text-sm text-slate-400" aria-live="polite">
        {entrySummary(current, emptyCurrent)}
      </p>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {previewLabel}
        </p>
        {previewSrc && !imgFailed ? (
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
            <img
              src={previewSrc}
              alt={`${slot} preview`}
              className="max-h-28 w-auto max-w-full object-contain object-left"
              onError={() => setImgFailed(true)}
            />
          </div>
        ) : current?.type === "svg" && current.svg ? (
          <div
            className="max-h-28 overflow-hidden rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-teal-100 [&_svg]:h-16 [&_svg]:w-auto"
            dangerouslySetInnerHTML={{ __html: current.svg }}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-3 py-6 text-sm text-slate-500">
            {emptyCurrent}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={fileId}>{fileLabel}</Label>
        <Input
          id={fileId}
          name={`${slot}_file`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          aria-describedby={`${fileHelpId} ${currentId}`}
          onChange={(e) => onChange({ ...state, file: e.target.files?.[0] ?? null })}
        />
        <p id={fileHelpId} className="text-xs text-slate-500">
          {fileHelp}
        </p>
        {state.file ? (
          <p className="text-xs text-teal-300/90">Selected: {state.file.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={svgId}>{svgLabel}</Label>
        <Textarea
          id={svgId}
          name={`${slot}_svg`}
          className="min-h-36 font-mono text-xs"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          value={state.svg}
          aria-describedby={`${svgHelpId} ${currentId}`}
          onChange={(e) => onChange({ ...state, svg: e.target.value })}
          placeholder="<svg xmlns=…>…</svg>"
        />
        <p id={svgHelpId} className="text-xs text-slate-500">
          {svgHelp}
        </p>
      </div>
    </fieldset>
  );
}

export function HeaderLogoForm({
  initial,
  initialPreviews,
}: {
  initial: HeaderLogoDocument;
  initialPreviews: HeaderLogoPreviews;
}) {
  const { t } = useI18n();
  const [document, setDocument] = useState(initial);
  const [previews, setPreviews] = useState(initialPreviews);
  const [formKey, setFormKey] = useState(0);
  const [min, setMin] = useState<SlotState>({
    file: null,
    svg: initial.logo_min?.type === "svg" ? initial.logo_min.svg : "",
  });
  const [max, setMax] = useState<SlotState>({
    file: null,
    svg: initial.logo_max?.type === "svg" ? initial.logo_max.svg : "",
  });
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const statusId = useId();

  async function refreshPreviews(doc: HeaderLogoDocument) {
    const next: HeaderLogoPreviews = {
      logo_min:
        doc.logo_min?.type === "image"
          ? slotFileUrl("logo_min", doc.updated_at)
          : null,
      logo_max:
        doc.logo_max?.type === "image"
          ? slotFileUrl("logo_max", doc.updated_at)
          : null,
    };
    setPreviews(next);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus(t("logo.saving"));

    const data = new FormData();
    if (min.file) data.set("logo_min_file", min.file);
    if (min.svg.trim()) data.set("logo_min_svg", min.svg.trim());
    if (max.file) data.set("logo_max_file", max.file);
    if (max.svg.trim()) data.set("logo_max_svg", max.svg.trim());

    try {
      const res = await fetch("/api/site/header/logo", { method: "POST", body: data });
      const json = (await res.json()) as {
        ok?: boolean;
        document?: HeaderLogoDocument;
        error?: string;
      };
      if (!res.ok || !json.document) {
        setStatus(json.error ?? t("logo.saveFailed"));
        return;
      }
      setDocument(json.document);
      await refreshPreviews(json.document);
      setMin({
        file: null,
        svg: json.document.logo_min?.type === "svg" ? json.document.logo_min.svg : "",
      });
      setMax({
        file: null,
        svg: json.document.logo_max?.type === "svg" ? json.document.logo_max.svg : "",
      });
      setFormKey((k) => k + 1);
      setStatus(t("logo.saved"));
    } catch {
      setStatus(t("logo.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      key={formKey}
      method="post"
      action="/api/site/header/logo"
      encType="multipart/form-data"
      onSubmit={onSubmit}
      className="max-w-2xl space-y-6"
      aria-describedby={statusId}
    >
      <p className="text-sm text-slate-400">{t("logo.replaceHint")}</p>

      <LogoSlotFieldset
        slot="logo_min"
        legend={t("logo.min")}
        fileLabel={t("logo.fileLabel")}
        svgLabel={t("logo.svgLabel")}
        fileHelp={t("logo.fileHelpMin")}
        svgHelp={t("logo.svgHelp")}
        previewLabel={t("logo.preview")}
        current={document.logo_min}
        emptyCurrent={t("logo.empty")}
        updatedAt={document.updated_at}
        savedPreview={previews.logo_min}
        state={min}
        onChange={setMin}
      />

      <LogoSlotFieldset
        slot="logo_max"
        legend={t("logo.max")}
        fileLabel={t("logo.fileLabel")}
        svgLabel={t("logo.svgLabel")}
        fileHelp={t("logo.fileHelpMax")}
        svgHelp={t("logo.svgHelp")}
        previewLabel={t("logo.preview")}
        current={document.logo_max}
        emptyCurrent={t("logo.empty")}
        updatedAt={document.updated_at}
        savedPreview={previews.logo_max}
        state={max}
        onChange={setMax}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("logo.saving") : t("logo.save")}
        </Button>
        <p id={statusId} className="text-sm text-slate-400" aria-live="polite">
          {status}
        </p>
      </div>
    </form>
  );
}
