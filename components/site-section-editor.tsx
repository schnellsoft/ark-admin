"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { emptyLocaleMap, type LocaleMap } from "@/lib/i18n";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  /** Raw JSON / code fields stay monolingual; text content uses RO/BG/EN editors. */
  raw?: boolean;
};

function parseLocaleMap(raw: string | undefined): LocaleMap {
  if (!raw) return emptyLocaleMap();
  try {
    const parsed = JSON.parse(raw) as Partial<LocaleMap>;
    if (parsed && typeof parsed === "object" && ("ro" in parsed || "en" in parsed || "bg" in parsed)) {
      return {
        ro: parsed.ro ?? "",
        bg: parsed.bg ?? "",
        en: parsed.en ?? "",
      };
    }
  } catch {
    // legacy plain string → seed Romanian (default)
  }
  return emptyLocaleMap(raw);
}

export function SiteSectionEditor({
  title,
  description,
  draftKey,
  initial,
  fields,
}: {
  title: string;
  description: string;
  draftKey: string;
  initial: Record<string, string>;
  fields: Field[];
}) {
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [status, setStatus] = useState("");

  async function save() {
    setStatus("Saving…");
    const res = await fetch("/api/site/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: draftKey, payload: form }),
    });
    setStatus(res.ok ? "Draft saved" : "Save failed — check validation");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">{title}</h1>
        <p className="text-slate-400">{description}</p>
      </div>
      <div className="max-w-2xl space-y-4">
        {fields.map((field) =>
          field.raw ? (
            <div key={field.name} className="space-y-2">
              <Label>{field.label}</Label>
              <Textarea
                className="min-h-40 font-mono text-xs"
                value={form[field.name] ?? ""}
                onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                placeholder={field.placeholder}
              />
            </div>
          ) : (
            <MultilingualTextEditor
              key={field.name}
              label={field.label}
              multiline={field.multiline}
              value={parseLocaleMap(form[field.name])}
              onChange={(map) => setForm({ ...form, [field.name]: JSON.stringify(map) })}
            />
          ),
        )}
        <div className="flex items-center gap-3">
          <Button type="button" onClick={save}>
            Save draft
          </Button>
          <span className="text-sm text-slate-400">{status}</span>
        </div>
      </div>
    </div>
  );
}
