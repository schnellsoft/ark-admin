"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import type { LocationSettings } from "@/lib/location-shared";
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

export function LocationManager({
  initial,
  librarySettings,
}: {
  initial: LocationSettings;
  librarySettings: LibrarySettings;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewKey =
    form.building_webp_key || form.building_master_key || "";

  async function save() {
    setPending(true);
    setStatus("");
    try {
      const res = await fetch("/api/site/location", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as {
        location?: LocationSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
      if (data.location) setForm(data.location);
      setStatus(t("grid.saved"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("grid.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  async function uploadBuilding(file: File) {
    setUploadPending(true);
    setStatus(t("location.uploading") || "Uploading…");
    try {
      const prepared = await prepareLibraryImage(file, librarySettings);
      const formData = new FormData();
      formData.set("id", prepared.id);
      formData.set("name", suggestLibraryNameFromFile(file.name || "building"));
      formData.set("alt", t("location.buildingImage") || "Building");
      formData.set("width", String(prepared.width));
      formData.set("height", String(prepared.height));
      formData.set(
        "categoryIds",
        JSON.stringify([UNSPECIFIED_CATEGORY_ID]),
      );
      formData.set(
        "master",
        new File([prepared.masterBlob], file.name, {
          type: prepared.masterContentType,
        }),
      );
      if (prepared.webpBlob) {
        formData.set(
          "webp",
          new File([prepared.webpBlob], `${prepared.id}.webp`, {
            type: "image/webp",
          }),
        );
      }

      const result = await uploadLibraryImageWithProgress(formData, () => {});
      const image = result.image as LibraryImage | undefined;
      if (!image) throw new Error(result.error || "Upload failed");

      setForm((prev) => ({
        ...prev,
        building_library_id: image.id,
        building_master_key: image.master_key,
        building_webp_key: image.webp_key,
      }));
      setStatus(t("location.imageUploaded") || "Building image uploaded");
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : t("location.imageFailed") || "Upload failed",
      );
    } finally {
      setUploadPending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.location.title")}
        </h1>
        <p className="text-slate-400">{t("section.location.description")}</p>
      </div>

      <div className="max-w-xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="loc-lat">
              {t("location.latitude") || "Latitude"}
            </Label>
            <Input
              id="loc-lat"
              inputMode="decimal"
              placeholder="44.4268"
              value={form.latitude}
              onChange={(e) =>
                setForm({ ...form, latitude: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="loc-lng">
              {t("location.longitude") || "Longitude"}
            </Label>
            <Input
              id="loc-lng"
              inputMode="decimal"
              placeholder="26.1025"
              value={form.longitude}
              onChange={(e) =>
                setForm({ ...form, longitude: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="loc-maps-key">
            {t("location.googleMapsKey") || "Google Maps key"}
          </Label>
          <Input
            id="loc-maps-key"
            type="password"
            autoComplete="off"
            value={form.google_maps_key}
            onChange={(e) =>
              setForm({ ...form, google_maps_key: e.target.value })
            }
          />
          <p className="text-xs text-slate-500">
            {t("location.googleMapsKeyHint") ||
              "Maps JavaScript API key used by the public site."}
          </p>
        </div>

        <fieldset className="space-y-3 rounded-lg border border-slate-700 p-4">
          <legend className="px-1 text-sm font-medium text-teal-200">
            {t("location.buildingImage") || "Building image"}
          </legend>
          <p className="text-xs text-slate-400">
            {(
              t("location.buildingHint") ||
              "Processed like library images (max {w}px, WebP when enabled) and stored in the media library."
            ).replace("{w}", String(librarySettings.maxWidth))}
          </p>
          <div className="flex flex-wrap items-start gap-4">
            {previewKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={libraryFileUrl(previewKey)}
                alt=""
                className="h-32 w-48 rounded-lg object-cover ring-1 ring-slate-600"
              />
            ) : (
              <div className="flex h-32 w-48 items-center justify-center rounded-lg border border-dashed border-slate-600 text-xs text-slate-500">
                {t("location.noImage") || "No image"}
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
                  if (file) void uploadBuilding(file);
                }}
              />
              <Button
                type="button"
                disabled={uploadPending}
                onClick={() => fileRef.current?.click()}
              >
                {uploadPending
                  ? t("location.uploading") || "Uploading…"
                  : t("location.uploadImage") || "Upload image"}
              </Button>
              {previewKey ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadPending}
                  onClick={() =>
                    setForm({
                      ...form,
                      building_library_id: null,
                      building_master_key: "",
                      building_webp_key: null,
                    })
                  }
                >
                  {t("location.clearImage") || "Clear"}
                </Button>
              ) : null}
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={pending || uploadPending}
            onClick={() => void save()}
          >
            {pending ? t("grid.saving") : t("grid.save")}
          </Button>
          {status ? (
            <span className="text-sm text-slate-400">{status}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
