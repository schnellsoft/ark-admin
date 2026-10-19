"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  emptyServiceRow,
  pagePathForSlug,
  slugifyService,
  validateServiceDraft,
  type ServiceCategory,
  type ServiceRow,
  type ServiceSubcategory,
} from "@/lib/services-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import type { IconRow } from "@/lib/icons";

export function ServicesGridManager({
  initialServices,
  categories,
  subcategories,
  icons,
}: {
  initialServices: ServiceRow[];
  categories: ServiceCategory[];
  subcategories: ServiceSubcategory[];
  icons: IconRow[];
}) {
  const { t, locale } = useI18n();
  const [services, setServices] = useState(initialServices);
  const [pdfStatus, setPdfStatus] = useState("");
  const [pdfPending, setPdfPending] = useState(false);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const subById = useMemo(
    () => new Map(subcategories.map((s) => [s.id, s])),
    [subcategories],
  );

  const columns = useMemo<SndColumn<ServiceRow>[]>(
    () => [
      {
        id: "title",
        header: t("field.title"),
        filterValue: (row) =>
          `${row.title.ro} ${row.title.en} ${row.title.bg} ${row.slug}`,
        cell: (row) => (
          <span className="font-medium text-slate-200">
            {row.title[locale] || row.title.ro || "—"}
          </span>
        ),
      },
      {
        id: "category",
        header: t("services.category") || "Category",
        filterValue: (row) => {
          const c = catById.get(row.category_id);
          const s = row.subcategory_id
            ? subById.get(row.subcategory_id)
            : null;
          return `${c?.name.ro ?? ""} ${s?.name.ro ?? ""}`;
        },
        cell: (row) => {
          const c = catById.get(row.category_id);
          const s = row.subcategory_id
            ? subById.get(row.subcategory_id)
            : null;
          return (
            <span className="text-sm text-slate-400">
              {c?.name[locale] || c?.slug || "—"}
              {s ? ` / ${s.name[locale] || s.slug}` : ""}
            </span>
          );
        },
      },
      {
        id: "price",
        header: t("services.price") || "Price",
        filterValue: (row) => `${row.price_text} ${row.currency}`,
        cell: (row) => (
          <span className="tabular-nums text-slate-300">
            {row.price_text || "—"} {row.currency}
          </span>
        ),
      },
      {
        id: "page",
        header: t("services.pageUrl") || "Page",
        filterValue: (row) => row.page_path,
        cell: (row) => (
          <div className="flex items-center gap-2">
            <code className="max-w-[10rem] truncate text-xs text-teal-300/90">
              {row.page_path || pagePathForSlug(row.slug)}
            </code>
            <Link
              href={`/site/services/${row.id}/page`}
              className="text-slate-400 hover:text-teal-300"
              title="Edit page"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        ),
      },
      {
        id: "enabled",
        header: "✓",
        filterValue: (row) => (row.enabled ? "1" : "0"),
        cell: (row) => (row.enabled ? "✓" : "—"),
      },
    ],
    [catById, locale, subById, t],
  );

  async function exportPdf() {
    setPdfPending(true);
    setPdfStatus("");
    try {
      const res = await fetch("/api/site/services/pdf", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        bytes?: number;
        bytesByLocale?: { ro?: number; en?: number; bg?: number };
      };
      if (!res.ok) throw new Error(data.error || "Export failed");
      const by = data.bytesByLocale;
      setPdfStatus(
        by
          ? `OK RO ${by.ro ?? 0} · EN ${by.en ?? 0} · BG ${by.bg ?? 0} bytes`
          : `OK (${data.bytes ?? 0} bytes)`,
      );
    } catch (err) {
      setPdfStatus(err instanceof Error ? err.message : "Export failed");
    } finally {
      setPdfPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
        <legend className="px-1 text-sm font-medium text-teal-200">PDF</legend>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={pdfPending} onClick={exportPdf}>
            {pdfPending
              ? t("services.exportingPdf") || "Exporting…"
              : t("services.exportPdf") || "Export to PDF"}
          </Button>
          {(["ro", "en", "bg"] as const).map((lang) => (
            <a
              key={lang}
              href={`/api/site/services/pdf?lang=${lang}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-600 px-2.5 text-xs uppercase tracking-wide text-slate-300 hover:bg-slate-800 hover:text-teal-200"
              title={`${t("services.openPdf") || "Open PDF"} (${lang})`}
            >
              <FileText className="h-4 w-4" />
              {lang}
            </a>
          ))}
          {pdfStatus ? (
            <span className="text-xs text-slate-400">{pdfStatus}</span>
          ) : null}
        </div>
      </fieldset>

      <SndGrid<ServiceRow>
        gridId="services"
        rows={services}
        columns={columns}
        onChange={setServices}
        onSave={async (rows) => {
          const res = await fetch("/api/site/services", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ services: rows }),
          });
          const data = (await res.json()) as {
            services?: ServiceRow[];
            error?: string;
          };
          if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
          if (data.services) setServices(data.services);
        }}
        createEmpty={() => emptyServiceRow(categories[0]?.id || "")}
        validateDraft={validateServiceDraft}
        renderForm={({ draft, setDraft }) => {
          if (!draft) return null;
          const catId = draft.category_id || categories[0]?.id || "";
          const subsForCat = subcategories.filter((s) => s.category_id === catId);
          return (
            <div className="space-y-3">
              <MultilingualTextEditor
                label={t("field.title")}
                value={draft.title ?? emptyLocaleMap()}
                onChange={(title) => {
                  const slug =
                    draft.slug?.trim() ||
                    slugifyService(title.en || title.ro || title.bg);
                  setDraft({
                    ...draft,
                    title,
                    slug,
                    page_path: pagePathForSlug(slug),
                  });
                }}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Slug</Label>
                  <Input
                    value={draft.slug ?? ""}
                    onChange={(e) => {
                      const slug = e.target.value;
                      setDraft({
                        ...draft,
                        slug,
                        page_path: pagePathForSlug(slug || "service"),
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("services.pageUrl") || "Page URL"}</Label>
                  <Input
                    value={
                      draft.page_path ||
                      pagePathForSlug(draft.slug || "service")
                    }
                    readOnly
                    className="opacity-80"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("services.category") || "Category"}</Label>
                  <select
                    className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
                    value={catId}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        category_id: e.target.value,
                        subcategory_id: null,
                      })
                    }
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name[locale] || c.slug}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>{t("services.subcategory") || "Subcategory"}</Label>
                  <select
                    className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
                    value={draft.subcategory_id ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        subcategory_id: e.target.value || null,
                      })
                    }
                  >
                    <option value="">—</option>
                    {subsForCat.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name[locale] || s.slug}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>{t("services.price") || "Price"}</Label>
                  <Input
                    value={draft.price_text ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, price_text: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("services.currency") || "Currency"}</Label>
                  <Input
                    value={draft.currency ?? "RON"}
                    onChange={(e) =>
                      setDraft({ ...draft, currency: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("services.icon") || "Icon"}</Label>
                  <select
                    className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
                    value={draft.icon_id ?? ""}
                    onChange={(e) => {
                      const icon = icons.find((i) => i.id === e.target.value);
                      setDraft({
                        ...draft,
                        icon_id: e.target.value || null,
                        icon_svg: icon?.svg ?? draft.icon_svg ?? "",
                      });
                    }}
                  >
                    <option value="">—</option>
                    {icons.map((icon) => (
                      <option key={icon.id} value={icon.id}>
                        {icon.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {draft.icon_svg ? (
                <div
                  className="h-10 w-10 text-[#FFE082] [&_svg]:h-full [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: draft.icon_svg }}
                />
              ) : null}
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={draft.enabled !== false}
                  onChange={(e) =>
                    setDraft({ ...draft, enabled: e.target.checked })
                  }
                />
                {t("field.enabled") || "Enabled"}
              </label>
              {draft.id ? (
                <Link
                  href={`/site/services/${draft.id}/page`}
                  className="inline-flex text-sm text-teal-300 hover:underline"
                >
                  {t("services.editPage") || "Edit service page"} →
                </Link>
              ) : null}
            </div>
          );
        }}
      />
    </div>
  );
}
