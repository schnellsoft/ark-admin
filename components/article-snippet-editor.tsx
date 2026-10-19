"use client";

import { useState } from "react";
import { ImageIcon, Languages } from "lucide-react";
import { LibraryImagePicker, libraryMediaFileUrl } from "@/components/library-image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n-provider";
import {
  emptyArticleSnippet,
  type ArticleSnippet,
} from "@/lib/articles-shared";
import {
  LOCALES,
  emptyLocaleMap,
  localeLabels,
  type Locale,
  type LocaleMap,
} from "@/lib/i18n";
import type { LibraryCategory, LibraryImage } from "@/lib/library-shared";

/** Value suitable for <input type="date"> / datetime-local date part. */
function toDateValue(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${asDate.getFullYear()}-${pad(asDate.getMonth() + 1)}-${pad(asDate.getDate())}`;
}

export function ArticleSnippetEditor({
  value,
  onChange,
  libraryAssets,
  libraryCategories,
}: {
  value: ArticleSnippet | undefined;
  onChange: (next: ArticleSnippet) => void;
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
}) {
  const { t, locale } = useI18n();
  const snippet = value ?? emptyArticleSnippet();
  const [editLocale, setEditLocale] = useState<Locale>(locale);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateStatus, setTranslateStatus] = useState("");

  const titleMap: LocaleMap = {
    ...emptyLocaleMap(),
    ...(snippet.title ?? {}),
  };
  const textMap: LocaleMap = {
    ...emptyLocaleMap(),
    ...(snippet.text ?? {}),
  };
  const previewKey = snippet.webp_key || snippet.master_key;
  const dateValue = toDateValue(snippet.date);
  const canTranslate = Boolean(
    (titleMap[editLocale] ?? "").trim() || (textMap[editLocale] ?? "").trim(),
  );

  function patch(partial: Partial<ArticleSnippet>) {
    onChange({ ...snippet, ...partial });
  }

  async function translateField(
    text: string,
    target: Locale,
  ): Promise<string> {
    const res = await fetch("/api/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        sourceLocale: editLocale,
        targetLocale: target,
      }),
    });
    const data = (await res.json()) as { translated?: string; error?: string };
    if (!res.ok || !data.translated) {
      throw new Error(data.error ?? "Translate failed");
    }
    return data.translated;
  }

  async function translateOthers() {
    const sourceTitle = (titleMap[editLocale] ?? "").trim();
    const sourceText = (textMap[editLocale] ?? "").trim();
    if (!sourceTitle && !sourceText) return;
    setTranslating(true);
    setTranslateStatus("");
    try {
      const nextTitle = { ...titleMap };
      const nextText = { ...textMap };
      for (const target of LOCALES.filter((l) => l !== editLocale)) {
        if (sourceTitle) nextTitle[target] = await translateField(sourceTitle, target);
        if (sourceText) nextText[target] = await translateField(sourceText, target);
      }
      patch({ title: nextTitle, text: nextText });
      setTranslateStatus(t("articles.snippetTranslated") || "Translated");
    } catch (err) {
      setTranslateStatus(
        err instanceof Error ? err.message : "Translate failed",
      );
    } finally {
      setTranslating(false);
    }
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-700 p-3">
      <legend className="px-1 text-sm font-medium text-teal-200">
        {t("articles.snippet") || "Snippet"}
      </legend>
      <p className="text-xs text-slate-500">
        {t("articles.snippetHint") ||
          "List-card preview: title, image, calendar date, and text."}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-xs text-slate-400">{t("editor.language")}</Label>
        <select
          className="h-8 rounded-md border border-slate-600 bg-slate-900/80 px-2 text-xs"
          value={editLocale}
          onChange={(e) => setEditLocale(e.target.value as Locale)}
          aria-label={t("editor.language")}
        >
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {localeLabels[code]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={translating || !canTranslate}
          onClick={() => void translateOthers()}
        >
          <Languages className="h-3.5 w-3.5" />
          {translating
            ? t("editor.translating")
            : t("editor.translate")}
        </Button>
        {translateStatus ? (
          <span className="text-xs text-slate-400">{translateStatus}</span>
        ) : null}
      </div>

      {/* Wireframe template: title | image + date + text */}
      <div className="overflow-hidden rounded-lg border border-slate-600 bg-black p-3 text-white">
        <div className="space-y-3">
          <Input
            className="border-white/80 bg-transparent text-base font-medium text-white placeholder:text-white/40"
            placeholder={t("field.title")}
            value={titleMap[editLocale] ?? ""}
            onChange={(e) =>
              patch({
                title: { ...titleMap, [editLocale]: e.target.value },
              })
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="relative aspect-square overflow-hidden rounded border border-white/80 bg-black"
              title={t("articles.snippetPickImage") || "Pick image"}
            >
              {previewKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={libraryMediaFileUrl(previewKey)}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-3"
                    style={{
                      background:
                        "linear-gradient(to top right, transparent calc(50% - 1px), rgba(255,255,255,0.7) 50%, transparent calc(50% + 1px)), linear-gradient(to top left, transparent calc(50% - 1px), rgba(255,255,255,0.7) 50%, transparent calc(50% + 1px))",
                    }}
                  />
                  <ImageIcon className="relative h-6 w-6" />
                  <span className="relative text-xs">
                    {t("articles.snippetPickImage") || "Image from library"}
                  </span>
                </span>
              )}
            </button>

            <div className="flex min-h-[12rem] flex-col gap-3">
              <Input
                type="date"
                className="border-white/80 bg-transparent text-white [color-scheme:dark]"
                value={dateValue}
                onChange={(e) => patch({ date: e.target.value })}
                aria-label={t("articles.snippetDate") || "Calendaristic data"}
              />
              <Textarea
                className="min-h-0 flex-1 resize-none border-white/80 bg-transparent text-sm text-white placeholder:text-white/40"
                placeholder={t("articles.snippetText") || "Text"}
                value={textMap[editLocale] ?? ""}
                onChange={(e) =>
                  patch({
                    text: { ...textMap, [editLocale]: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {previewKey ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              patch({
                library_id: null,
                master_key: "",
                webp_key: null,
              })
            }
          >
            {t("articles.snippetClearImage") || "Clear image"}
          </Button>
        </div>
      ) : null}

      <LibraryImagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        assets={libraryAssets}
        categories={libraryCategories}
        onSelect={(asset) => {
          patch({
            library_id: asset.id,
            master_key: asset.master_key,
            webp_key: asset.webp_key,
          });
          setPickerOpen(false);
        }}
      />
    </fieldset>
  );
}
