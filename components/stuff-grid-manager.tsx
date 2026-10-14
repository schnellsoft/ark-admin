"use client";

import { useMemo, useRef, useState } from "react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  STUFF_PORTRAIT_MAX_EDGE,
  emptyStuffMember,
  slugifyStuff,
  validateStuffMemberDraft,
  type StuffCategory,
  type StuffMember,
  type StuffSubcategory,
} from "@/lib/stuff-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import {
  prepareLibraryImage,
  uploadLibraryImageWithProgress,
} from "@/lib/library-image-client";
import {
  UNSPECIFIED_CATEGORY_ID,
  suggestLibraryNameFromFile,
  type LibraryImage,
  type LibrarySettings,
} from "@/lib/library-shared";

function libraryFileUrl(key: string) {
  return `/api/site/media/file?key=${encodeURIComponent(key)}`;
}

export function StuffGridManager({
  initialMembers,
  categories,
  subcategories,
  librarySettings,
}: {
  initialMembers: StuffMember[];
  categories: StuffCategory[];
  subcategories: StuffSubcategory[];
  librarySettings: LibrarySettings;
}) {
  const { t, locale } = useI18n();
  const [members, setMembers] = useState(initialMembers);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadPending, setUploadPending] = useState(false);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const subById = useMemo(
    () => new Map(subcategories.map((s) => [s.id, s])),
    [subcategories],
  );

  const columns = useMemo<SndColumn<StuffMember>[]>(
    () => [
      {
        id: "name",
        header: t("field.name"),
        filterValue: (row) =>
          `${row.name.ro} ${row.name.en} ${row.name.bg} ${row.slug}`,
        cell: (row) => (
          <span className="font-medium text-slate-200">
            {row.name[locale] || row.name.ro || "—"}
          </span>
        ),
      },
      {
        id: "role",
        header: t("field.role"),
        filterValue: (row) =>
          `${row.role.ro} ${row.role.en} ${row.role.bg}`,
        cell: (row) => (
          <span className="text-sm text-slate-400">
            {row.role[locale] || row.role.ro || "—"}
          </span>
        ),
      },
      {
        id: "category",
        header: t("stuff.category") || "Category",
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
        id: "portrait",
        header: t("stuff.portrait") || "Portrait",
        filterValue: (row) => row.portrait_master_key || "",
        cell: (row) =>
          row.portrait_800_key ||
          row.portrait_webp_key ||
          row.portrait_master_key ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={libraryFileUrl(
                row.portrait_800_key ||
                  row.portrait_webp_key ||
                  row.portrait_master_key,
              )}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            "—"
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

  async function uploadPortrait(
    file: File,
    draft: Partial<StuffMember>,
    setDraft: (next: Partial<StuffMember>) => void,
  ) {
    setUploadPending(true);
    setUploadStatus(t("stuff.uploadingPortrait") || "Uploading…");
    try {
      const prepared = await prepareLibraryImage(file, librarySettings, {
        portraitMaxEdge: STUFF_PORTRAIT_MAX_EDGE,
      });
      const form = new FormData();
      form.set("id", prepared.id);
      form.set(
        "name",
        suggestLibraryNameFromFile(
          file.name || `portrait-${draft.slug || prepared.id}`,
        ),
      );
      form.set(
        "alt",
        draft.name?.en || draft.name?.ro || draft.name?.bg || "",
      );
      form.set("width", String(prepared.width));
      form.set("height", String(prepared.height));
      form.set(
        "categoryIds",
        JSON.stringify([UNSPECIFIED_CATEGORY_ID]),
      );
      form.set(
        "master",
        new File([prepared.masterBlob], file.name, {
          type: prepared.masterContentType,
        }),
      );
      if (prepared.webpBlob) {
        form.set(
          "webp",
          new File([prepared.webpBlob], `${prepared.id}.webp`, {
            type: "image/webp",
          }),
        );
      }
      if (prepared.portrait800Blob) {
        form.set(
          "portrait800",
          new File([prepared.portrait800Blob], `${prepared.id}-p800.webp`, {
            type: "image/webp",
          }),
        );
      }

      const result = await uploadLibraryImageWithProgress(form, () => {});
      const image = result.image as LibraryImage | undefined;
      if (!image) throw new Error(result.error || "Upload failed");

      setDraft({
        ...draft,
        portrait_library_id: image.id,
        portrait_master_key: image.master_key,
        portrait_webp_key: image.webp_key,
        portrait_800_key: image.portrait_800_key,
      });
      setUploadStatus(t("stuff.portraitUploaded") || "Portrait uploaded");
    } catch (err) {
      setUploadStatus(
        err instanceof Error
          ? err.message
          : t("stuff.portraitFailed") || "Upload failed",
      );
    } finally {
      setUploadPending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <SndGrid<StuffMember>
        gridId="stuff-members"
        rows={members}
        columns={columns}
        onChange={setMembers}
        onSave={async (rows) => {
          const res = await fetch("/api/site/stuff", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ members: rows }),
          });
          const data = (await res.json()) as {
            members?: StuffMember[];
            error?: string;
          };
          if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
          if (data.members) setMembers(data.members);
        }}
        createEmpty={() => emptyStuffMember(categories[0]?.id || "")}
        validateDraft={validateStuffMemberDraft}
        renderForm={({ draft, setDraft }) => {
          if (!draft) return null;
          const catId = draft.category_id || categories[0]?.id || "";
          const subsForCat = subcategories.filter(
            (s) => s.category_id === catId,
          );
          const previewKey =
            draft.portrait_800_key ||
            draft.portrait_webp_key ||
            draft.portrait_master_key ||
            "";

          return (
            <div className="space-y-3">
              <MultilingualTextEditor
                label={t("field.name")}
                value={draft.name ?? emptyLocaleMap()}
                onChange={(name) => {
                  const slug =
                    draft.slug?.trim() ||
                    slugifyStuff(name.en || name.ro || name.bg);
                  setDraft({ ...draft, name, slug });
                }}
              />
              <MultilingualTextEditor
                label={t("field.role")}
                value={draft.role ?? emptyLocaleMap()}
                onChange={(role) => setDraft({ ...draft, role })}
              />
              <MultilingualTextEditor
                label={t("field.snippet") || "Snippet"}
                value={draft.snippet ?? emptyLocaleMap()}
                onChange={(snippet) => setDraft({ ...draft, snippet })}
                multiline
              />
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input
                  value={draft.slug ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, slug: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("stuff.category") || "Category"}</Label>
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
                  <Label>
                    {t("stuff.subcategory") || "Subcategory"}
                  </Label>
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

              <fieldset className="space-y-3 rounded-lg border border-slate-700 p-3">
                <legend className="px-1 text-sm font-medium text-teal-200">
                  {t("stuff.portrait") || "Portrait"}
                </legend>
                <p className="text-xs text-slate-400">
                  {(
                    t("stuff.portraitHint") ||
                    "Saved to the media library (resize + WebP) plus a {n}px portrait."
                  ).replace("{n}", String(STUFF_PORTRAIT_MAX_EDGE))}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  {previewKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={libraryFileUrl(previewKey)}
                      alt=""
                      className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-600"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-600 text-xs text-slate-500">
                      {t("stuff.noPortrait") || "No portrait"}
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadPortrait(file, draft, setDraft);
                      }}
                    />
                    <Button
                      type="button"
                      disabled={uploadPending}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploadPending
                        ? t("stuff.uploadingPortrait") || "Uploading…"
                        : t("stuff.uploadPortrait") || "Upload portrait"}
                    </Button>
                    {previewKey ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadPending}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            portrait_library_id: null,
                            portrait_master_key: "",
                            portrait_webp_key: null,
                            portrait_800_key: null,
                          })
                        }
                      >
                        {t("stuff.clearPortrait") || "Clear"}
                      </Button>
                    ) : null}
                    {uploadStatus ? (
                      <p className="text-xs text-slate-400">{uploadStatus}</p>
                    ) : null}
                  </div>
                </div>
              </fieldset>

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
            </div>
          );
        }}
      />
    </div>
  );
}
