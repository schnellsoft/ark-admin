"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SlideshowImageEditor } from "@/components/slideshow-image-editor";
import { SlideshowLibraryPicker } from "@/components/slideshow-library-picker";
import { SlideshowOverlayText } from "@/components/slideshow-overlay-text";
import { ensureSlideLayer as ensureLayer } from "@/lib/slideshow-shared";
import { SlideshowOverlayPositioner } from "@/components/slideshow-overlay-positioner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/components/i18n-provider";
import type {
  LibraryCategory,
  LibraryImage,
  LibrarySettings,
} from "@/lib/library-shared";
import {
  importSlideFromLibrary,
  rebuildSlideVariants,
  uploadSlideMedia,
} from "@/lib/slideshow-media-client";
import {
  slideSourceKey,
  slideThumbKey,
  type SlideshowSettings,
  type SlideshowSlide,
} from "@/lib/slideshow-shared";

function fileUrl(key: string | null | undefined) {
  if (!key) return null;
  return `/api/site/slideshow/file?key=${encodeURIComponent(key)}`;
}

export function SlideshowSlideEditor({
  id,
  initialSlide,
  initialSettings,
  librarySettings,
  libraryAssets,
  libraryCategories,
}: {
  id: string;
  initialSlide: SlideshowSlide;
  initialSettings: SlideshowSettings;
  librarySettings: LibrarySettings;
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
}) {
  const { t } = useI18n();
  const [slide, setSlide] = useState(initialSlide);
  const [settings] = useState(initialSettings);
  const [layer, setLayer] = useState(ensureLayer(initialSlide.layer));
  const [desktopHtml, setDesktopHtml] = useState("");
  const [mobileHtml, setMobileHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/site/slideshow/${id}/layer`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        layer?: SlideshowSlide["layer"];
        desktopHtml?: string;
        mobileHtml?: string;
      };
      if (data.layer) setLayer(ensureLayer(data.layer));
      setDesktopHtml(data.desktopHtml ?? "");
      setMobileHtml(data.mobileHtml ?? "");
    })();
  }, [id]);

  const previewUrl = useMemo(() => {
    const source = slideSourceKey(slide);
    if (source) return fileUrl(source);
    return fileUrl(slideThumbKey(slide));
  }, [slide]);

  const thumbUrl = fileUrl(slideThumbKey(slide));

  /** Prefer baked crop variants for overlay preview art-direction. */
  const desktopCropUrl = useMemo(() => {
    const desk = slide.files.desktop ?? {};
    const w =
      desk["1920"] ? "1920" : desk["1280"] ? "1280" : Object.keys(desk).sort((a, b) => +b - +a)[0];
    if (w && slide.version) {
      return fileUrl(`slideshow/${slide.id}/slide-${slide.id}.${slide.version}-d-${w}.jpg`);
    }
    return thumbUrl;
  }, [slide, thumbUrl]);

  const mobileCropUrl = useMemo(() => {
    const mob = slide.files.mobile ?? {};
    const w =
      mob["1080"] ? "1080" : mob["720"] ? "720" : Object.keys(mob).sort((a, b) => +b - +a)[0];
    if (w && slide.version) {
      return fileUrl(`slideshow/${slide.id}/slide-${slide.id}.${slide.version}-m-${w}.jpg`);
    }
    return desktopCropUrl;
  }, [slide, desktopCropUrl]);

  async function saveMeta(opts?: { bakeImages?: boolean }) {
    const bakeImages = opts?.bakeImages !== false;
    setSaving(true);
    if (bakeImages && slide.media_kind === "image") setApplying(true);
    setStatus(t("slideshow.saving"));
    try {
      const res = await fetch(`/api/site/slideshow/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: slide.title,
          alt: slide.alt,
          enabled: slide.enabled,
          filters: slide.filters,
          mobileCrop: slide.mobileCrop,
          desktopCrop: slide.desktopCrop,
          desktopFocus: slide.desktopFocus,
          layer,
        }),
      });
      const data = (await res.json()) as { slide?: SlideshowSlide; error?: string };
      if (!res.ok) throw new Error(data.error || t("slideshow.saveFailed"));

      const sameAsDesktop =
        layer.mobile && "sameAsDesktop" in layer.mobile && layer.mobile.sameAsDesktop;
      const layerRes = await fetch(`/api/site/slideshow/${id}/layer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layer,
          desktopHtml,
          mobileHtml: sameAsDesktop ? null : mobileHtml,
        }),
      });
      if (!layerRes.ok) {
        const err = (await layerRes.json()) as { error?: string };
        throw new Error(err.error || t("slideshow.saveFailed"));
      }

      let next: SlideshowSlide = data.slide
        ? { ...data.slide, layer }
        : { ...slide, layer };

      // Bake crops + filters into -m/-d variants so the static site always
      // receives the edited pixels (JSON alone is not enough).
      if (
        bakeImages &&
        next.media_kind === "image" &&
        next.mobileCrop &&
        previewUrl &&
        next.version
      ) {
        next = await rebuildSlideVariants({
          slideId: id,
          sourceUrl: previewUrl,
          libraryId: next.library_asset_id,
          crop: next.mobileCrop,
          desktopCrop: next.desktopCrop,
          desktopFocus: next.desktopFocus,
          desktopRatio: settings.ratio,
          filters: next.filters,
          alt: next.alt,
          title: next.title,
          output: settings.output,
          version: next.version,
          sourceKey: next.files.sourceKey,
        });
        next = { ...next, layer };
        setStatus(t("slideshow.imagesRebuilt"));
      } else {
        setStatus(t("slideshow.slideSaved"));
      }

      setSlide(next);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("slideshow.saveFailed"));
    } finally {
      setSaving(false);
      setApplying(false);
    }
  }

  async function applyImages() {
    if (!slide.mobileCrop || !previewUrl || !slide.version) {
      setStatus(t("slideshow.uploadFirst"));
      return;
    }
    await saveMeta({ bakeImages: true });
  }

  async function replaceMedia(file: File) {
    setReplacing(true);
    setStatus(t("slideshow.uploading"));
    try {
      const next = await uploadSlideMedia({
        slideId: id,
        file,
        title: slide.title,
        alt: slide.alt,
        librarySettings,
        crop: slide.mobileCrop,
        desktopCrop: slide.desktopCrop,
        desktopFocus: slide.desktopFocus,
        desktopRatio: settings.ratio,
        filters: slide.filters,
        output: settings.output,
      });
      setSlide(next);
      setStatus(t("slideshow.uploadDone"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("slideshow.saveFailed"));
    } finally {
      setReplacing(false);
    }
  }

  async function replaceFromLibrary(asset: LibraryImage) {
    setReplacing(true);
    setStatus(t("slideshow.importing"));
    try {
      const next = await importSlideFromLibrary({
        slideId: id,
        libraryId: asset.id,
        title: slide.title || asset.name,
        alt: slide.alt || asset.alt,
        desktopCrop: slide.desktopCrop,
        desktopFocus: slide.desktopFocus,
        desktopRatio: settings.ratio,
        filters: slide.filters,
        output: settings.output,
      });
      setSlide(next);
      setPickerOpen(false);
      setStatus(t("slideshow.uploadDone"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("slideshow.saveFailed"));
    } finally {
      setReplacing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/site/slideshow">
              <ArrowLeft className="size-4" />
              {t("slideshow.backToSlides")}
            </Link>
          </Button>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
            {slide.title || slide.alt || slide.id}
          </h1>
        </div>
        <Button type="button" onClick={() => void saveMeta()} disabled={saving}>
          {saving ? t("slideshow.saving") : t("slideshow.saveSlide")}
        </Button>
      </div>
      {status ? <p className="text-sm text-slate-400">{status}</p> : null}

      <Tabs defaultValue="media">
        <TabsList className="flex-wrap">
          <TabsTrigger value="media">{t("slideshow.tabMedia")}</TabsTrigger>
          <TabsTrigger value="editor">{t("slideshow.tabEditor")}</TabsTrigger>
          <TabsTrigger value="text">{t("slideshow.tabText")}</TabsTrigger>
          <TabsTrigger value="position">{t("slideshow.tabPosition")}</TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="title">{t("slideshow.title")}</Label>
              <Input
                id="title"
                value={slide.title}
                onChange={(e) => setSlide({ ...slide, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alt">{t("library.alt")}</Label>
              <Input
                id="alt"
                value={slide.alt}
                onChange={(e) => setSlide({ ...slide, alt: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-sm">
            <span>{t("slideshow.published")}</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-teal-500"
              checked={slide.enabled}
              onChange={(e) => setSlide({ ...slide, enabled: e.target.checked })}
            />
          </label>
          <div className="space-y-2">
            <Label>{t("slideshow.replaceMedia")}</Label>
            <Input
              type="file"
              accept="image/*,video/*"
              disabled={replacing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void replaceMedia(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={replacing}
              onClick={() => setPickerOpen(true)}
            >
              {t("slideshow.importLibrary")}
            </Button>
          </div>
          {thumbUrl ? (
            slide.media_kind === "video" ? (
              <video
                src={thumbUrl}
                className="max-h-[420px] w-full rounded-xl object-cover ring-1 ring-slate-700"
                controls
                muted
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbUrl}
                alt={slide.alt}
                className="max-h-[420px] w-full rounded-xl object-cover ring-1 ring-slate-700"
              />
            )
          ) : null}
        </TabsContent>

        <TabsContent value="editor" className="pt-2">
          <SlideshowImageEditor
            slide={slide}
            settings={settings}
            imageUrl={previewUrl}
            applying={applying}
            onFiltersChange={(filters) => setSlide({ ...slide, filters })}
            onMobileCropChange={(mobileCrop) => setSlide({ ...slide, mobileCrop })}
            onDesktopCropChange={(desktopCrop, desktopFocus) =>
              setSlide({ ...slide, desktopCrop, desktopFocus })
            }
            onApply={() => void applyImages()}
          />
        </TabsContent>

        <TabsContent value="text" className="pt-2">
          <SlideshowOverlayText
            layer={layer}
            desktopHtml={desktopHtml}
            mobileHtml={mobileHtml}
            desktopPreviewUrl={desktopCropUrl}
            mobilePreviewUrl={mobileCropUrl}
            onLayerChange={setLayer}
            onDesktopHtmlChange={setDesktopHtml}
            onMobileHtmlChange={setMobileHtml}
          />
        </TabsContent>

        <TabsContent value="position" className="pt-2">
          <SlideshowOverlayPositioner
            layer={layer}
            desktopHtml={desktopHtml}
            mobileHtml={mobileHtml}
            desktopPreviewUrl={desktopCropUrl}
            mobilePreviewUrl={mobileCropUrl}
            onLayerChange={setLayer}
          />
        </TabsContent>
      </Tabs>

      <SlideshowLibraryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        assets={libraryAssets}
        categories={libraryCategories}
        busy={replacing}
        onSelect={(asset) => void replaceFromLibrary(asset)}
      />
    </div>
  );
}
