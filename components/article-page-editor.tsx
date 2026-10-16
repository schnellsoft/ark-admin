"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { SndHtmlEdit } from "@/components/snd-html-edit";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { mapVisibleHtmlText } from "@/lib/html-visible-text";
import {
  LOCALES,
  emptyLocaleMap,
  localeLabels,
  type Locale,
  type LocaleMap,
} from "@/lib/i18n";
import type { ArticlePage, ArticleRow } from "@/lib/articles-shared";
import type { LibraryCategory, LibraryImage } from "@/lib/library-shared";

export function ArticlePageEditor({
  article,
  initialPage,
  libraryAssets,
  libraryCategories,
}: {
  article: ArticleRow;
  initialPage: ArticlePage;
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [body, setBody] = useState<LocaleMap>(
    initialPage.body ?? emptyLocaleMap(),
  );
  const [editLocale, setEditLocale] = useState<Locale>(() => {
    if (body[locale]?.trim()) return locale;
    return LOCALES.find((l) => body[l]?.trim()) ?? locale;
  });
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [translating, setTranslating] = useState(false);

  const title =
    article.title[locale] ||
    article.title.ro ||
    article.title.en ||
    article.title.bg ||
    article.slug;

  const sourceHtml = body[editLocale] ?? "";

  async function save() {
    setPending(true);
    setStatus("");
    try {
      const res = await fetch(`/api/site/articles/${article.id}/page`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
      setStatus(t("grid.saved"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function translateText(text: string, target: Locale): Promise<string> {
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
    if (!sourceHtml.trim()) return;
    setTranslating(true);
    setStatus("");
    try {
      const next = { ...body };
      for (const target of LOCALES.filter((l) => l !== editLocale)) {
        next[target] = await mapVisibleHtmlText(sourceHtml, (text) =>
          translateText(text, target),
        );
      }
      setBody(next);
      setStatus(t("articles.editor.translated"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Translate failed");
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            <button
              type="button"
              className="text-teal-300 hover:underline"
              onClick={() => router.push("/site/articles")}
            >
              ← {t("articles.tabList")}
            </button>
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
            {title}
          </h1>
          <p className="text-slate-400">{t("articles.editor.description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span className="sr-only">{t("editor.language")}</span>
            <select
              className="h-9 rounded-md border border-slate-600 bg-slate-900/80 px-2 text-sm"
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
          </label>
          <Button
            type="button"
            size="default"
            variant="secondary"
            disabled={translating || pending || !sourceHtml.trim()}
            onClick={translateOthers}
          >
            <Languages className="h-4 w-4" />
            {translating ? t("editor.translating") : t("editor.translate")}
          </Button>
          <Button type="button" onClick={save} disabled={pending || translating}>
            {pending ? t("grid.saving") : t("grid.save")}
          </Button>
        </div>
      </div>

      {status ? <p className="text-sm text-slate-400">{status}</p> : null}

      <SndHtmlEdit
        key={editLocale}
        value={body[editLocale] ?? ""}
        onChange={(html) =>
          setBody((prev) => ({
            ...prev,
            [editLocale]: html,
          }))
        }
        libraryAssets={libraryAssets}
        libraryCategories={libraryCategories}
        minHeight={480}
      />
    </div>
  );
}
