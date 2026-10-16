"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { ProvidedServicesPicker } from "@/components/provided-services-picker";
import {
  LibraryImagePicker,
  libraryMediaFileUrl,
} from "@/components/library-image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  STUFF_PORTRAIT_MAX_EDGE,
  autoStuffMemberSlug,
  catalogLabel,
  emptyStuffMember,
  validateStuffMemberDraft,
  type StuffCategory,
  type StuffMember,
  type StuffProvidedService,
  type StuffRole,
  type StuffSpecialty,
} from "@/lib/stuff-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import {
  encodePortraitVariantsFromUrl,
  prepareLibraryImage,
  uploadLibraryImageWithProgress,
  uploadLibraryVariantsWithProgress,
} from "@/lib/library-image-client";
import {
  UNSPECIFIED_CATEGORY_ID,
  suggestLibraryNameFromFile,
  type LibraryCategory,
  type LibraryImage,
  type LibrarySettings,
} from "@/lib/library-shared";

function libraryFileUrl(key: string) {
  return `/api/site/media/file?key=${encodeURIComponent(key)}`;
}

export function StuffGridManager({
  initialMembers,
  categories,
  roles,
  specialties,
  providedServices,
  librarySettings,
  libraryAssets: initialLibraryAssets,
  libraryCategories,
}: {
  initialMembers: StuffMember[];
  categories: StuffCategory[];
  roles: StuffRole[];
  specialties: StuffSpecialty[];
  providedServices: StuffProvidedService[];
  librarySettings: LibrarySettings;
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
}) {
  const { t, locale } = useI18n();
  const [members, setMembers] = useState(initialMembers);
  const [libraryAssets, setLibraryAssets] = useState(initialLibraryAssets);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadPending, setUploadPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<{
    draft: Partial<StuffMember>;
    setDraft: (next: Partial<StuffMember>) => void;
  } | null>(null);
  const [slugUnique, setSlugUnique] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const roleById = useMemo(
    () => new Map(roles.map((r) => [r.id, r])),
    [roles],
  );
  const specialtyById = useMemo(
    () => new Map(specialties.map((s) => [s.id, s])),
    [specialties],
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
        filterValue: (row) => {
          const r = row.role_id ? roleById.get(row.role_id) : null;
          return r
            ? `${r.name.ro} ${r.name.en} ${r.name.bg}`
            : `${row.role.ro} ${row.role.en} ${row.role.bg}`;
        },
        cell: (row) => {
          const r = row.role_id ? roleById.get(row.role_id) : null;
          return (
            <span className="text-sm text-slate-400">
              {r
                ? catalogLabel(r, locale) || "—"
                : row.role[locale] || row.role.ro || "—"}
            </span>
          );
        },
      },
      {
        id: "specialty",
        header: t("field.specialty"),
        filterValue: (row) => {
          const s = row.specialty_id
            ? specialtyById.get(row.specialty_id)
            : null;
          return s
            ? `${s.name.ro} ${s.name.en} ${s.name.bg}`
            : `${row.specialty?.ro ?? ""} ${row.specialty?.en ?? ""} ${row.specialty?.bg ?? ""}`;
        },
        cell: (row) => {
          const s = row.specialty_id
            ? specialtyById.get(row.specialty_id)
            : null;
          return (
            <span className="text-sm text-slate-400">
              {s
                ? catalogLabel(s, locale) || "—"
                : row.specialty?.[locale] || row.specialty?.ro || "—"}
            </span>
          );
        },
      },
      {
        id: "doctor_title",
        header: t("stuff.doctorTitle") || "Doctor Title",
        filterValue: (row) => (row.doctor_title ? "1" : "0"),
        cell: (row) => (row.doctor_title ? "✓" : "—"),
      },
      {
        id: "services",
        header: t("stuff.servicesCount") || "Services",
        filterValue: (row) => String(row.provided_service_ids?.length ?? 0),
        cell: (row) => (
          <span className="text-sm text-slate-400">
            {row.provided_service_ids?.length ?? 0}
          </span>
        ),
      },
      {
        id: "category",
        header: t("stuff.category") || "Category",
        filterValue: (row) => {
          const c = catById.get(row.category_id);
          return c?.name.ro ?? "";
        },
        cell: (row) => {
          const c = catById.get(row.category_id);
          return (
            <span className="text-sm text-slate-400">
              {c?.name[locale] || c?.slug || "—"}
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
    [catById, locale, roleById, specialtyById, t],
  );

  function applyPortraitImage(
    draft: Partial<StuffMember>,
    setDraft: (next: Partial<StuffMember>) => void,
    image: LibraryImage,
  ) {
    setDraft({
      ...draft,
      portrait_library_id: image.id,
      portrait_master_key: image.master_key,
      portrait_webp_key: image.webp_key,
      portrait_800_key: image.portrait_800_key,
    });
    setLibraryAssets((prev) => {
      const i = prev.findIndex((a) => a.id === image.id);
      if (i < 0) return [...prev, image];
      const next = [...prev];
      next[i] = image;
      return next;
    });
  }

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

      applyPortraitImage(draft, setDraft, image);
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

  async function insertPortraitFromLibrary(
    asset: LibraryImage,
    draft: Partial<StuffMember>,
    setDraft: (next: Partial<StuffMember>) => void,
  ) {
    setUploadPending(true);
    setUploadStatus(t("stuff.insertingPortrait") || "Inserting from library…");
    try {
      let image = asset;
      const needsPortrait = !image.portrait_800_key;
      const needsWebp =
        librarySettings.convertToWebp &&
        !image.webp_key &&
        image.master_content_type !== "image/webp";

      if (needsPortrait || needsWebp) {
        const sourceKey =
          image.webp_key || image.master_key || image.portrait_800_key;
        if (!sourceKey) throw new Error("Library image has no file");
        const variants = await encodePortraitVariantsFromUrl(
          libraryMediaFileUrl(sourceKey),
          librarySettings,
          STUFF_PORTRAIT_MAX_EDGE,
        );
        const form = new FormData();
        form.set("id", image.id);
        if (needsWebp && variants.webpBlob) {
          form.set(
            "webp",
            new File([variants.webpBlob], `${image.id}.webp`, {
              type: "image/webp",
            }),
          );
        }
        if (needsPortrait) {
          form.set(
            "portrait800",
            new File([variants.portrait800Blob], `${image.id}-p800.webp`, {
              type: "image/webp",
            }),
          );
        }
        const result = await uploadLibraryVariantsWithProgress(form);
        const updated = result.image as LibraryImage | undefined;
        if (!updated) throw new Error(result.error || "Variant upload failed");
        image = updated;
      }

      applyPortraitImage(draft, setDraft, image);
      setUploadStatus(t("stuff.portraitInserted") || "Portrait inserted");
    } catch (err) {
      setUploadStatus(
        err instanceof Error
          ? err.message
          : t("stuff.portraitFailed") || "Upload failed",
      );
    } finally {
      setUploadPending(false);
      setPickerOpen(false);
      setPickerDraft(null);
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
        validateDraft={(draft) => {
          const base = validateStuffMemberDraft(draft);
          if (base) return base;
          if (slugUnique !== true) return t("stuff.slugUniqueBad");
          return null;
        }}
        renderForm={({ draft, setDraft }) => (
          <StuffMemberFormFields
            draft={draft}
            setDraft={setDraft}
            categories={categories}
            roles={roles}
            specialties={specialties}
            providedServices={providedServices}
            locale={locale}
            t={t}
            fileRef={fileRef}
            uploadPending={uploadPending}
            uploadStatus={uploadStatus}
            uploadPortrait={uploadPortrait}
            onOpenLibraryPicker={() => {
              if (!draft) return;
              setPickerDraft({ draft, setDraft });
              setPickerOpen(true);
            }}
            slugUnique={slugUnique}
            setSlugUnique={setSlugUnique}
            slugChecking={slugChecking}
            setSlugChecking={setSlugChecking}
          />
        )}
      />
      <LibraryImagePicker
        open={pickerOpen}
        onClose={() => {
          if (uploadPending) return;
          setPickerOpen(false);
          setPickerDraft(null);
        }}
        assets={libraryAssets}
        categories={libraryCategories}
        busy={uploadPending}
        onSelect={(asset) => {
          if (!pickerDraft) return;
          void insertPortraitFromLibrary(
            asset,
            pickerDraft.draft,
            pickerDraft.setDraft,
          );
        }}
      />
    </div>
  );
}

function StuffMemberFormFields({
  draft,
  setDraft,
  categories,
  roles,
  specialties,
  providedServices,
  locale,
  t,
  fileRef,
  uploadPending,
  uploadStatus,
  uploadPortrait,
  onOpenLibraryPicker,
  slugUnique,
  setSlugUnique,
  slugChecking,
  setSlugChecking,
}: {
  draft: Partial<StuffMember> | null;
  setDraft: (next: Partial<StuffMember> | null) => void;
  categories: StuffCategory[];
  roles: StuffRole[];
  specialties: StuffSpecialty[];
  providedServices: StuffProvidedService[];
  locale: "ro" | "en" | "bg";
  t: (key: string) => string;
  fileRef: React.RefObject<HTMLInputElement | null>;
  uploadPending: boolean;
  uploadStatus: string;
  uploadPortrait: (
    file: File,
    draft: Partial<StuffMember>,
    setDraft: (next: Partial<StuffMember>) => void,
  ) => Promise<void>;
  onOpenLibraryPicker: () => void;
  slugUnique: boolean | null;
  setSlugUnique: (v: boolean | null) => void;
  slugChecking: boolean;
  setSlugChecking: (v: boolean) => void;
}) {
  const slug = draft?.slug ?? "";
  const excludeId = draft?.id;

  useEffect(() => {
    if (!slug.trim()) {
      setSlugUnique(null);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSlugChecking(true);
      try {
        const qs = new URLSearchParams({ slug: slug.trim() });
        if (excludeId) qs.set("excludeId", excludeId);
        const res = await fetch(`/api/site/stuff/check-slug?${qs}`);
        const data = (await res.json()) as { unique?: boolean };
        setSlugUnique(Boolean(data.unique));
      } catch {
        setSlugUnique(null);
      } finally {
        setSlugChecking(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [slug, excludeId, setSlugChecking, setSlugUnique]);

  if (!draft) return null;

  const catId = draft.category_id || categories[0]?.id || "";
  const previewKey =
    draft.portrait_800_key ||
    draft.portrait_webp_key ||
    draft.portrait_master_key ||
    "";
  const enabledRoles = roles.filter((r) => r.enabled !== false);
  const enabledSpecialties = specialties.filter((s) => s.enabled !== false);

  return (
    <div className="space-y-3">
      <MultilingualTextEditor
        label={t("field.name")}
        value={draft.name ?? emptyLocaleMap()}
        onChange={(name) => setDraft({ ...draft, name })}
        onBlur={(name) => {
          if (!draft.slug?.trim()) {
            const hasName = Boolean(
              name.en?.trim() || name.ro?.trim() || name.bg?.trim(),
            );
            if (hasName) {
              setDraft({
                ...draft,
                name,
                slug: autoStuffMemberSlug(name),
              });
            }
          }
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{t("field.role")}</Label>
          <select
            className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
            value={draft.role_id ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                role_id: e.target.value || null,
              })
            }
          >
            <option value="">—</option>
            {enabledRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {catalogLabel(r, locale) || "—"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>{t("field.specialty")}</Label>
          <select
            className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
            value={draft.specialty_id ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                specialty_id: e.target.value || null,
              })
            }
          >
            <option value="">—</option>
            {enabledSpecialties.map((s) => (
              <option key={s.id} value={s.id}>
                {catalogLabel(s, locale) || "—"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={draft.doctor_title === true}
          onChange={(e) =>
            setDraft({ ...draft, doctor_title: e.target.checked })
          }
        />
        {t("stuff.doctorTitle") || "Doctor Title"}
      </label>

      <div className="space-y-1">
        <Label>{t("field.college") || "College"}</Label>
        <Input
          type="text"
          value={draft.college ?? ""}
          onChange={(e) => setDraft({ ...draft, college: e.target.value })}
        />
      </div>

      <ProvidedServicesPicker
        services={providedServices}
        selectedIds={draft.provided_service_ids ?? []}
        onChange={(ids) =>
          setDraft({ ...draft, provided_service_ids: ids })
        }
      />

      <MultilingualTextEditor
        label={t("field.snippet") || "Snippet"}
        value={draft.snippet ?? emptyLocaleMap()}
        onChange={(snippet) => setDraft({ ...draft, snippet })}
        multiline
      />
      <div className="space-y-1">
        <Label>{t("field.slug") || "Slug"}</Label>
        <div className="flex items-center gap-2">
          <Input
            className="flex-1"
            value={draft.slug ?? ""}
            required
            onChange={(e) =>
              setDraft({ ...draft, slug: e.target.value })
            }
          />
          {slugChecking ? (
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {t("stuff.slugChecking")}
            </span>
          ) : slugUnique === true ? (
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-green-500/40 bg-green-500/10 text-green-500"
              title={t("stuff.slugUniqueOk")}
              aria-label={t("stuff.slugUniqueOk")}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
          ) : slugUnique === false ? (
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-500"
              title={t("stuff.slugUniqueBad")}
              aria-label={t("stuff.slugUniqueBad")}
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </span>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">{t("stuff.slugHint")}</p>
      </div>
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={uploadPending}
                onClick={() => fileRef.current?.click()}
              >
                {uploadPending
                  ? t("stuff.uploadingPortrait") || "Uploading…"
                  : t("stuff.uploadPortrait") || "Upload portrait"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={uploadPending}
                onClick={onOpenLibraryPicker}
              >
                {t("stuff.insertFromLibrary") || "From library"}
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
            </div>
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
}
