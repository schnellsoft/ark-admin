"use client";

import { useState } from "react";
import Link from "next/link";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n-provider";
import {
  LOCALES,
  emptyLocaleMap,
  type Locale,
  type LocaleMap,
} from "@/lib/i18n";
import type { ServicePage, ServiceRow } from "@/lib/services-shared";

function paragraphsToText(list: string[]): string {
  return (list ?? []).join("\n\n");
}

function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function ServicePageEditor({
  service,
  initialPage,
}: {
  service: ServiceRow;
  initialPage: ServicePage;
}) {
  const { t, locale } = useI18n();
  const [synopsis, setSynopsis] = useState<LocaleMap>(
    initialPage.synopsis ?? emptyLocaleMap(),
  );
  const [paragraphs, setParagraphs] = useState(
    initialPage.paragraphs ?? { ro: [], en: [], bg: [] },
  );
  const [editLocale, setEditLocale] = useState<Locale>(locale);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);

  async function save() {
    setPending(true);
    setStatus("");
    try {
      const res = await fetch(`/api/site/services/${service.id}/page`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          synopsis,
          paragraphs,
          images: initialPage.images ?? [],
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
      setStatus("OK");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function translateParagraphs() {
    const source = paragraphsToText(paragraphs[editLocale] ?? []);
    if (!source.trim()) return;
    setPending(true);
    setStatus("");
    try {
      const next = { ...paragraphs };
      for (const target of LOCALES.filter((l) => l !== editLocale)) {
        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: source,
            sourceLocale: editLocale,
            targetLocale: target,
          }),
        });
        const data = (await res.json()) as {
          translated?: string;
          error?: string;
        };
        if (!res.ok || !data.translated) {
          throw new Error(data.error ?? "Translate failed");
        }
        next[target] = textToParagraphs(data.translated);
      }
      setParagraphs(next);
      setStatus("OK");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Translate failed");
    } finally {
      setPending(false);
    }
  }

  async function generateStub() {
    setAiPending(true);
    setStatus("");
    try {
      const title =
        service.title[editLocale] ||
        service.title.ro ||
        service.title.en ||
        service.slug;
      const stub = [
        `${title} — prezentare clinică. Tarif ${service.price_text} ${service.currency}.`,
        `Indicațiile și protocolul pentru ${title} se stabilesc după examen clinic.`,
        `După intervenție, pacientul primește indicații de îngrijire și program de control.`,
      ];
      // Try AI endpoint if present; fall back to stub in current locale
      let text = stub.join("\n\n");
      try {
        const res = await fetch("/api/ai/generate-service-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            locale: editLocale,
            price: service.price_text,
            currency: service.currency,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { text?: string };
          if (data.text?.trim()) text = data.text.trim();
        }
      } catch {
        // use stub
      }
      setParagraphs({
        ...paragraphs,
        [editLocale]: textToParagraphs(text),
      });
      if (!synopsis[editLocale]?.trim()) {
        setSynopsis({
          ...synopsis,
          [editLocale]: stub[0],
        });
      }
      setStatus(t("services.stubReady") || "Stub ready — use Translate for other locales");
    } finally {
      setAiPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/site/services"
          className="text-sm text-slate-400 hover:text-teal-300"
        >
          ← {t("nav.services")}
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {service.title[locale] || service.title.ro || service.slug}
        </h1>
        <p className="text-sm text-slate-400">
          <code>{service.page_path}</code> · {service.price_text}{" "}
          {service.currency}
        </p>
      </div>

      <MultilingualTextEditor
        label={t("services.synopsis") || "Synopsis"}
        value={synopsis}
        onChange={setSynopsis}
        multiline
        rows={3}
      />

      <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>{t("services.paragraphs") || "Paragraphs"}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-md border border-slate-600 bg-slate-900/80 px-2 text-xs"
              value={editLocale}
              onChange={(e) => setEditLocale(e.target.value as Locale)}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={aiPending}
              onClick={generateStub}
            >
              {aiPending ? "…" : t("services.generateAi") || "Generate with AI"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={translateParagraphs}
            >
              {t("translate.button") || "Translate"}
            </Button>
          </div>
        </div>
        <Textarea
          rows={14}
          value={paragraphsToText(paragraphs[editLocale] ?? [])}
          onChange={(e) =>
            setParagraphs({
              ...paragraphs,
              [editLocale]: textToParagraphs(e.target.value),
            })
          }
          placeholder="Paragraphs separated by a blank line"
        />
        <p className="text-xs text-slate-500">
          {t("services.paragraphsHint") ||
            "Separate paragraphs with a blank line."}
        </p>
      </div>

      {(initialPage.images?.length ?? 0) > 0 ? (
        <div className="space-y-2">
          <Label>{t("services.images") || "Images"}</Label>
          <ul className="space-y-1 text-sm text-slate-400">
            {initialPage.images.map((img, i) => (
              <li key={`${img.masterKey}-${i}`}>
                <code className="text-xs">{img.masterKey}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "…" : t("grid.save") || "Save"}
        </Button>
        {status ? <span className="text-xs text-slate-400">{status}</span> : null}
      </div>
    </div>
  );
}
