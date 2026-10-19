"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { SlideshowLibraryPicker } from "@/components/slideshow-library-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";
import type { LibraryCategory, LibraryImage, LibrarySettings } from "@/lib/library-shared";
import { importSlideFromLibrary, uploadSlideMedia } from "@/lib/slideshow-media-client";
import {
  slideLayerFlags,
  type SlideshowSettings,
  type SlideshowSlide,
} from "@/lib/slideshow-shared";
import {
  DEFAULT_SLIDE_SCOPE,
  slideEditHref,
  slideFileApi,
  slideItemApi,
  slideReorderApi,
  slideThumbKeyForScope,
  type SlideApiScope,
} from "@/lib/slide-api-scope";


function libraryFileUrl(key: string) {
  return `/api/site/media/file?key=${encodeURIComponent(key)}`;
}

export function SlideshowSlideList({
  initialSlides,
  librarySettings,
  libraryAssets,
  libraryCategories,
  settings,
  scope = DEFAULT_SLIDE_SCOPE,
  title,
  subtitle,
}: {
  initialSlides: SlideshowSlide[];
  librarySettings: LibrarySettings;
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
  settings: SlideshowSettings;
  scope?: SlideApiScope;
  title?: string;
  subtitle?: string;
}) {
  const { t } = useI18n();
  const [slides, setSlides] = useState(initialSlides);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const persistOrder = async (next: SlideshowSlide[]) => {
    setSlides(next);
    await fetch(slideReorderApi(scope), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((slide) => slide.id) }),
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = slides.slice();
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  };

  const toggle = async (slide: SlideshowSlide, enabled: boolean) => {
    const next = slides.map((item) => (item.id === slide.id ? { ...item, enabled } : item));
    setSlides(next);
    await fetch(slideItemApi(slide.id, scope), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  };

  const remove = async (slide: SlideshowSlide) => {
    const label = slide.title || slide.alt || slide.id;
    if (!window.confirm(`${t("slideshow.deleteConfirm")} “${label}”?`)) return;
    await fetch(slideItemApi(slide.id, scope), { method: "DELETE" });
    setSlides(slides.filter((item) => item.id !== slide.id));
    setStatus(t("slideshow.deleted"));
  };

  const upload = async (file: File) => {
    setUploading(true);
    setStatus(t("slideshow.uploading"));
    try {
      const id = crypto.randomUUID();
      const slide = await uploadSlideMedia({
        slideId: id,
        file,
        librarySettings,
        desktopRatio: settings.ratio,
        output: settings.output,
        scope,
      });
      setStatus(t("slideshow.uploadDone"));
      router.push(slideEditHref(slide.id, scope));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("slideshow.saveFailed"));
    } finally {
      setUploading(false);
    }
  };

  const importAsset = async (asset: LibraryImage) => {
    setUploading(true);
    setStatus(t("slideshow.importing"));
    try {
      const id = crypto.randomUUID();
      const slide = await importSlideFromLibrary({
        slideId: id,
        libraryId: asset.id,
        title: asset.name,
        alt: asset.alt,
        desktopRatio: settings.ratio,
        output: settings.output,
        scope,
      });
      setPickerOpen(false);
      setStatus(t("slideshow.uploadDone"));
      router.push(slideEditHref(slide.id, scope));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("slideshow.saveFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
            {title || t("slideshow.slidesTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {subtitle || t("slideshow.slidesSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            disabled={uploading}
          >
            <FolderOpen className="size-4" />
            {t("slideshow.importLibrary")}
          </Button>
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Plus className="size-4" />
            {uploading ? t("slideshow.uploading") : t("slideshow.addMedia")}
          </Button>
        </div>
      </div>

      {status ? <p className="text-sm text-slate-400">{status}</p> : null}

      <div className="grid gap-4">
        {slides.map((slide, index) => {
          const thumb = slideThumbKeyForScope(slide, scope);
          const libraryAsset = slide.library_asset_id
            ? libraryAssets.find((a) => a.id === slide.library_asset_id)
            : null;
          const libraryPreviewKey = libraryAsset
            ? libraryAsset.webp_key || libraryAsset.master_key
            : null;
          const imageSrc = thumb
            ? slideFileApi(thumb, scope)
            : libraryPreviewKey
              ? libraryFileUrl(libraryPreviewKey)
              : null;
          const videoSrc =
            slide.media_kind === "video"
              ? thumb
                ? slideFileApi(thumb, scope)
                : libraryAsset
                  ? libraryFileUrl(libraryAsset.master_key)
                  : null
              : null;
          const layers = slideLayerFlags(slide);
          return (
            <Card key={slide.id} className="border-slate-700 bg-slate-900/40">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="relative h-24 w-full overflow-hidden rounded-lg bg-black sm:w-40">
                  {slide.media_kind === "video" && videoSrc ? (
                    <video
                      src={videoSrc}
                      className="size-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageSrc}
                      alt={slide.alt}
                      className="size-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (
                          libraryPreviewKey &&
                          !el.src.includes("/api/site/media/file")
                        ) {
                          el.src = libraryFileUrl(libraryPreviewKey);
                        }
                      }}
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-xs text-slate-600">
                      —
                    </div>
                  )}
                  {(layers.desktop || layers.mobile) && (
                    <div className="absolute top-1.5 left-1.5 flex gap-1">
                      {layers.desktop ? (
                        <span
                          className="rounded bg-teal-700/95 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-teal-50"
                          title={t("slideshow.layerDesktopFlag")}
                        >
                          D
                        </span>
                      ) : null}
                      {layers.mobile ? (
                        <span
                          className="rounded bg-sky-700/95 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sky-50"
                          title={t("slideshow.layerMobileFlag")}
                        >
                          M
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-medium text-slate-100">
                      {slide.title || slide.alt || slide.id}
                    </h2>
                    <Badge variant="secondary">{slide.media_kind}</Badge>
                    {slide.enabled ? (
                      <Badge>{t("slideshow.published")}</Badge>
                    ) : (
                      <Badge className="bg-slate-800 text-slate-300">{t("slideshow.hidden")}</Badge>
                    )}
                    {layers.desktop ? (
                      <Badge className="bg-teal-900/70">{t("slideshow.layerDesktopFlag")}</Badge>
                    ) : null}
                    {layers.mobile ? (
                      <Badge className="bg-sky-900/70">{t("slideshow.layerMobileFlag")}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{slide.alt}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-teal-500"
                      checked={slide.enabled}
                      onChange={(e) => void toggle(slide, e.target.checked)}
                    />
                    {t("slideshow.published")}
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Link
                    href={slideEditHref(slide.id, scope)}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-600 hover:bg-slate-800"
                    aria-label={`Edit ${slide.title || slide.id}`}
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => void remove(slide)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SlideshowLibraryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        assets={libraryAssets}
        categories={libraryCategories}
        busy={uploading}
        onSelect={(asset) => void importAsset(asset)}
      />
    </div>
  );
}
