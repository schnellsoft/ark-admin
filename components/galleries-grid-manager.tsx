"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Pencil, X } from "lucide-react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  emptyGalleryRow,
  slugifyGallery,
  validateGalleryDraft,
  type GalleryRow,
} from "@/lib/galleries-shared";
import { emptyLocaleMap } from "@/lib/i18n";

function GallerySlugField({
  slug,
  excludeId,
  onChange,
  onManualEdit,
}: {
  slug: string;
  excludeId?: string;
  onChange: (slug: string) => void;
  onManualEdit: () => void;
}) {
  const { t } = useI18n();
  const [unique, setUnique] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const value = slug.trim();
    if (!value) {
      setUnique(null);
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ slug: value });
          if (excludeId) params.set("excludeId", excludeId);
          const res = await fetch(
            `/api/site/galleries/check-slug?${params.toString()}`,
          );
          const data = (await res.json()) as { unique?: boolean };
          if (!cancelled) setUnique(Boolean(data.unique));
        } catch {
          if (!cancelled) setUnique(null);
        } finally {
          if (!cancelled) setChecking(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug, excludeId]);

  return (
    <div className="space-y-1">
      <Label>Slug</Label>
      <div className="flex items-center gap-2">
        <Input
          value={slug}
          onChange={(e) => {
            onManualEdit();
            onChange(e.target.value);
          }}
          className="flex-1"
          placeholder={t("galleries.slugAuto") || "Auto from name on blur"}
        />
        {checking ? (
          <span className="text-xs text-slate-500">…</span>
        ) : unique === true ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-green-500/40 bg-green-500/10 text-green-500">
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
        ) : unique === false ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-500">
            <X className="h-5 w-5" strokeWidth={3} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function GalleryFormFields({
  draft,
  setDraft,
  siteDomain,
}: {
  draft: Partial<GalleryRow>;
  setDraft: (next: Partial<GalleryRow>) => void;
  siteDomain: string;
}) {
  const { t } = useI18n();
  const [slugManual, setSlugManual] = useState(() => Boolean(draft.slug?.trim()));
  const nameMap = { ...emptyLocaleMap(), ...(draft.name ?? {}) };
  const previewHref = draft.slug
    ? `${siteDomain.replace(/\/$/, "")}/gallery/${draft.slug}/`
    : "";

  return (
    <div className="space-y-3">
      <div
        onBlur={(e) => {
          if (slugManual) return;
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            if ((draft.slug ?? "").trim()) return;
            const auto = slugifyGallery(
              nameMap.ro || nameMap.en || nameMap.bg || "",
            );
            if (auto) setDraft({ ...draft, slug: auto });
          }
        }}
      >
        <MultilingualTextEditor
          key={`gallery-name-${draft.id ?? "new"}`}
          label={t("field.name") || "Name"}
          value={nameMap}
          onChange={(name) => setDraft({ ...draft, name })}
        />
      </div>
      <GallerySlugField
        slug={draft.slug ?? ""}
        excludeId={draft.id}
        onManualEdit={() => setSlugManual(true)}
        onChange={(slug) => setDraft({ ...draft, slug })}
      />
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={draft.enabled !== false}
          onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
        />
        {t("field.enabled") || "Enabled"}
      </label>
      {draft.id && draft.slug ? (
        <p className="text-xs text-slate-500">
          Preview:{" "}
          <a
            href={previewHref || `/gallery/${draft.slug}/`}
            target="_blank"
            rel="noreferrer"
            className="text-teal-300 underline"
          >
            /gallery/{draft.slug}/
          </a>
        </p>
      ) : null}
    </div>
  );
}

export function GalleriesGridManager({
  initialGalleries,
  siteDomain = "",
}: {
  initialGalleries: GalleryRow[];
  siteDomain?: string;
}) {
  const { t, locale } = useI18n();
  const [galleries, setGalleries] = useState(initialGalleries);

  const columns = useMemo<SndColumn<GalleryRow>[]>(
    () => [
      {
        id: "name",
        header: t("field.name") || "Name",
        sortable: true,
        filterValue: (r: GalleryRow) =>
          `${r.name.ro} ${r.name.en} ${r.name.bg} ${r.slug}`,
        sortValue: (r: GalleryRow) => r.name[locale] || r.name.ro || r.slug,
        cell: (r: GalleryRow) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-100">
              {r.name[locale] || r.name.ro || r.name.en || r.slug}
            </div>
            <div className="truncate text-xs text-slate-500">{r.slug}</div>
          </div>
        ),
      },
      {
        id: "enabled",
        header: t("field.enabled") || "Enabled",
        sortable: true,
        sortValue: (r: GalleryRow) => (r.enabled ? 1 : 0),
        cell: (r: GalleryRow) => (r.enabled ? "✓" : "—"),
      },
      {
        id: "actions",
        header: t("field.actions") || "Actions",
        cell: (r: GalleryRow) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/site/galleries/${r.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-600 px-2 text-xs text-slate-200 hover:bg-slate-800"
              title={t("galleries.editMeta") || "Edit name / slug"}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("galleries.editMeta") || "Meta"}
            </Link>
            <Link
              href={`/site/galleries/${r.id}/slides`}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-teal-700/60 px-2 text-xs text-teal-200 hover:bg-teal-950/40"
              title={t("galleries.editContent") || "Edit content"}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("galleries.editContent") || "Content"}
            </Link>
            <a
              href={`${siteDomain.replace(/\/$/, "")}/gallery/${r.slug}/`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800"
              title={t("galleries.preview") || "Preview"}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ),
      },
    ],
    [locale, siteDomain, t],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.galleries.title") || "Galleries"}
        </h1>
        <p className="text-slate-400">
          {t("section.galleries.description") ||
            "Manage site image galleries."}
        </p>
      </div>

      <SndGrid<GalleryRow>
        gridId="galleries"
        rows={galleries}
        columns={columns}
        onChange={setGalleries}
        createEmpty={() => emptyGalleryRow()}
        validateDraft={validateGalleryDraft}
        renderForm={({ draft, setDraft }) => {
          if (!draft) return null;
          return (
            <GalleryFormFields
              key={draft.id ?? "new"}
              draft={draft}
              setDraft={setDraft}
              siteDomain={siteDomain}
            />
          );
        }}
        onSave={async (rows) => {
          const res = await fetch("/api/site/galleries", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ galleries: rows }),
          });
          const data = (await res.json()) as {
            galleries?: GalleryRow[];
            error?: string;
          };
          if (!res.ok) throw new Error(data.error || "Save failed");
          if (data.galleries) setGalleries(data.galleries);
        }}
      />
    </div>
  );
}
