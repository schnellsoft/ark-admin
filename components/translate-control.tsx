"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TranslateControl({
  value,
  onApply,
}: {
  value: string;
  onApply: (translated: string) => void;
}) {
  const [locale, setLocale] = useState("ro");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function translate() {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, targetLocale: locale }),
      });
      const data = (await res.json()) as { translated?: string; error?: string };
      if (!res.ok || !data.translated) throw new Error(data.error ?? "Translate failed");
      setPreview(data.translated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translate failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Languages className="h-4 w-4 text-teal-800" />
        <Input
          className="h-8 w-24"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          aria-label="Target locale"
        />
        <Button type="button" size="sm" variant="secondary" disabled={pending || !value} onClick={translate}>
          {pending ? "Translating…" : "Translate"}
        </Button>
        {preview ? (
          <Button type="button" size="sm" onClick={() => onApply(preview)}>
            Apply
          </Button>
        ) : null}
      </div>
      {preview ? <p className="text-sm text-slate-700">{preview}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
