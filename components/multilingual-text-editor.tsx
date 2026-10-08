"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  emptyLocaleMap,
  LOCALES,
  localeLabels,
  type Locale,
  type LocaleMap,
} from "@/lib/i18n";

export function MultilingualTextEditor({
  label,
  value,
  onChange,
  multiline = false,
  rows = 6,
}: {
  label: string;
  value: LocaleMap;
  onChange: (next: LocaleMap) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const { t } = useI18n();
  const [editLocale, setEditLocale] = useState<Locale>("ro");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const map = value ?? emptyLocaleMap();

  async function translateOthers() {
    const source = map[editLocale]?.trim();
    if (!source) return;
    setPending(true);
    setStatus("");
    try {
      const targets = LOCALES.filter((l) => l !== editLocale);
      const next = { ...map };
      for (const target of targets) {
        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: source,
            sourceLocale: editLocale,
            targetLocale: target,
          }),
        });
        const data = (await res.json()) as { translated?: string; error?: string };
        if (!res.ok || !data.translated) throw new Error(data.error ?? "Translate failed");
        next[target] = data.translated;
      }
      onChange(next);
      setStatus("OK");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Translate failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-8 rounded-md border border-slate-600 bg-slate-900/80 px-2 text-xs text-slate-100"
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
          <Button type="button" size="sm" variant="secondary" disabled={pending || !map[editLocale]} onClick={translateOthers}>
            <Languages className="h-3.5 w-3.5" />
            {pending ? t("editor.translating") : t("editor.translate")}
          </Button>
        </div>
      </div>
      {multiline ? (
        <Textarea
          className="min-h-28 font-mono text-xs"
          rows={rows}
          value={map[editLocale] ?? ""}
          onChange={(e) => onChange({ ...map, [editLocale]: e.target.value })}
        />
      ) : (
        <Input
          value={map[editLocale] ?? ""}
          onChange={(e) => onChange({ ...map, [editLocale]: e.target.value })}
        />
      )}
      {status ? <p className="text-xs text-slate-400">{status}</p> : null}
    </div>
  );
}
