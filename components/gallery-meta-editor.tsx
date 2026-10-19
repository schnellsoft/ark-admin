"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { useI18n } from "@/components/i18n-provider";
import { slugifyGallery, type GalleryRow } from "@/lib/galleries-shared";
import { emptyLocaleMap } from "@/lib/i18n";

export function GalleryMetaEditor({
  initial,
  siteDomain = "",
}: {
  initial: GalleryRow;
  siteDomain?: string;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(initial);
  const [slugManual, setSlugManual] = useState(true);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setStatus("");
    try {
      const res = await fetch("/api/site/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { gallery?: GalleryRow; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.gallery) setForm(data.gallery);
      setStatus(t("grid.saved") || "Saved");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  const preview = `${siteDomain.replace(/\/$/, "")}/gallery/${form.slug}/`;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
            {t("galleries.editMeta") || "Edit gallery"}
          </h1>
          <p className="text-slate-400">{form.slug}</p>
        </div>
        <Link
          href={`/site/galleries/${form.id}/slides`}
          className="text-sm text-teal-300 underline"
        >
          {t("galleries.editContent") || "Edit content"}
        </Link>
      </div>

      <div
        onBlur={(e) => {
          if (slugManual) return;
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            if (form.slug.trim()) return;
            const auto = slugifyGallery(
              form.name.ro || form.name.en || form.name.bg || "",
            );
            if (auto) setForm({ ...form, slug: auto });
          }
        }}
      >
        <MultilingualTextEditor
          label={t("field.name") || "Name"}
          value={{ ...emptyLocaleMap(), ...form.name }}
          onChange={(name) => setForm({ ...form, name })}
        />
      </div>

      <div className="space-y-1">
        <Label>Slug</Label>
        <Input
          value={form.slug}
          onChange={(e) => {
            setSlugManual(true);
            setForm({ ...form, slug: e.target.value });
          }}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
        />
        {t("field.enabled") || "Enabled"}
      </label>

      <p className="text-xs text-slate-500">
        Preview:{" "}
        <a href={preview} target="_blank" rel="noreferrer" className="text-teal-300 underline">
          /gallery/{form.slug}/
        </a>
      </p>

      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={() => void save()}>
          {pending ? "…" : t("grid.save") || "Save"}
        </Button>
        <Link href="/site/galleries" className="text-sm text-slate-400 underline">
          {t("nav.galleries") || "Back"}
        </Link>
        {status ? <span className="text-sm text-slate-400">{status}</span> : null}
      </div>
    </div>
  );
}
