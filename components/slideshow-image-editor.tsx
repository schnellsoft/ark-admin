"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import { defaultDesktopCrop, defaultMobileCrop } from "@/lib/slide-crop-client";
import {
  cssFilters,
  DEFAULT_FILTERS,
  focusFromCrop,
  parseSlideshowRatio,
  type DesktopCrop,
  type ImageFilters,
  type ImageFocus,
  type MobileCrop,
  type SlideshowSettings,
  type SlideshowSlide,
} from "@/lib/slideshow-shared";
import { cn } from "@/lib/utils";

const FILTER_FIELDS: {
  key: keyof ImageFilters;
  labelKey: string;
  min: number;
  max: number;
}[] = [
  { key: "brightness", labelKey: "slideshow.filterBrightness", min: 40, max: 180 },
  { key: "contrast", labelKey: "slideshow.filterContrast", min: 40, max: 180 },
  { key: "saturate", labelKey: "slideshow.filterSaturate", min: 0, max: 200 },
  { key: "hueRotate", labelKey: "slideshow.filterHue", min: 0, max: 360 },
  { key: "grayscale", labelKey: "slideshow.filterGrayscale", min: 0, max: 100 },
  { key: "sepia", labelKey: "slideshow.filterSepia", min: 0, max: 100 },
  { key: "invert", labelKey: "slideshow.filterInvert", min: 0, max: 100 },
  { key: "blur", labelKey: "slideshow.filterBlur", min: 0, max: 12 },
];

type CropTarget = "mobile" | "desktop";

/** Approx. public header-top height (icons row only; booking row removed). */
const PUBLIC_HEADER_REM = 3.75;

function CropLivePreview({
  target,
  crop,
  natural,
  imageUrl,
  previewStyle,
  settings,
  label,
}: {
  target: CropTarget;
  crop: MobileCrop;
  natural: { w: number; h: number };
  imageUrl: string;
  previewStyle: React.CSSProperties;
  settings: SlideshowSettings;
  label: string;
}) {
  const vw = settings.output.mobileViewport.width || 390;
  const vh = settings.output.mobileViewport.height || 844;
  // Match public site: slideshow height = 100dvh − header-top
  const headerPx = Math.round(PUBLIC_HEADER_REM * 16);
  const slideW = vw;
  const slideH = Math.max(1, vh - headerPx);
  const desktopRatio = parseSlideshowRatio(settings.ratio);
  const deskAspect = desktopRatio.w / desktopRatio.h;

  if (target === "desktop") {
    return (
      <div className="flex items-start gap-3">
        <div
          className="overflow-hidden rounded-lg border border-slate-700 bg-black"
          style={{ width: 192, height: Math.round(192 / deskAspect) }}
        >
          <div
            style={{
              width: `${(natural.w / crop.width) * 100}%`,
              transform: `translate(${(-crop.left / crop.width) * 100}%, ${(-crop.top / crop.height) * 100}%)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="block w-full" style={previewStyle} />
          </div>
        </div>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    );
  }

  // Mobile: phone chrome + slide area using real viewport aspect; 3:4 crop covers it.
  const previewW = 140;
  const scale = previewW / slideW;
  const previewH = Math.round(slideH * scale);
  const headerH = Math.round(headerPx * scale);

  return (
    <div className="flex items-start gap-3">
      <div
        className="overflow-hidden rounded-[1.1rem] border border-slate-600 bg-slate-950 shadow-lg ring-1 ring-slate-700"
        style={{ width: previewW }}
      >
        <div className="bg-black" style={{ height: headerH }} aria-hidden />
        <div className="relative overflow-hidden bg-black" style={{ height: previewH }}>
          {(() => {
            // Simulate public site: 3:4 crop file shown with object-fit:cover in the tall slide box
            const cropAspect = crop.width / crop.height;
            const boxAspect = slideW / slideH;
            let layerW: number;
            let layerH: number;
            if (cropAspect > boxAspect) {
              layerH = previewH;
              layerW = (crop.width / crop.height) * layerH;
            } else {
              layerW = previewW;
              layerH = (crop.height / crop.width) * layerW;
            }
            const ox = (previewW - layerW) / 2;
            const oy = (previewH - layerH) / 2;
            return (
              <div
                className="absolute"
                style={{
                  left: ox,
                  top: oy,
                  width: layerW,
                  height: layerH,
                  backgroundImage: `url(${imageUrl})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${(natural.w / crop.width) * 100}% ${(natural.h / crop.height) * 100}%`,
                  backgroundPosition: `${(-crop.left / crop.width) * layerW}px ${(-crop.top / crop.height) * layerH}px`,
                  filter: typeof previewStyle.filter === "string" ? previewStyle.filter : undefined,
                }}
              />
            );
          })()}
        </div>
      </div>
      <div className="space-y-1 text-xs text-slate-400">
        <p>{label}</p>
        <p className="text-slate-500">
          {slideW}×{slideH}px slide · header {headerPx}px
        </p>
      </div>
    </div>
  );
}

export function SlideshowImageEditor({
  slide,
  settings,
  imageUrl,
  onFiltersChange,
  onMobileCropChange,
  onDesktopCropChange,
  onApply,
  applying,
}: {
  slide: SlideshowSlide;
  settings: SlideshowSettings;
  imageUrl: string | null;
  onFiltersChange: (filters: ImageFilters) => void;
  onMobileCropChange: (crop: MobileCrop, focus?: ImageFocus) => void;
  onDesktopCropChange: (crop: DesktopCrop, focus: ImageFocus) => void;
  onApply: () => void;
  applying?: boolean;
}) {
  const { t } = useI18n();
  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<"move" | "resize" | null>(null);
  const [target, setTarget] = useState<CropTarget>("desktop");
  const origin = useRef({ x: 0, y: 0, crop: null as MobileCrop | null });

  const mobileCrop = slide.mobileCrop;
  const desktopCrop = slide.desktopCrop;
  const crop = target === "mobile" ? mobileCrop : desktopCrop;
  const filters = slide.filters ?? DEFAULT_FILTERS;
  const previewStyle = useMemo(() => ({ filter: cssFilters(filters) }), [filters]);
  const desktopRatio = parseSlideshowRatio(settings.ratio);
  const desktopAspect = desktopRatio.w / desktopRatio.h;

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !imageUrl) return;
    function measure() {
      if (!img) return;
      setDisplay({ w: img.clientWidth, h: img.clientHeight });
      if (img.naturalWidth && img.naturalHeight) {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        setNatural({ w: nw, h: nh });
        if (!slide.mobileCrop) {
          onMobileCropChange(defaultMobileCrop(nw, nh));
        }
        if (!slide.desktopCrop) {
          const next = defaultDesktopCrop(nw, nh, settings.ratio);
          onDesktopCropChange(next, focusFromCrop(next, nw, nh));
        }
      }
    }
    img.addEventListener("load", measure);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(img);
    return () => {
      img.removeEventListener("load", measure);
      ro.disconnect();
    };
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = natural.w && display.w ? natural.w / display.w : 1;

  function clampMobile(next: MobileCrop): MobileCrop {
    let { left, top, width, height } = next;
    width = Math.max(1, Math.min(width, natural.w));
    height = Math.round(width * (4 / 3));
    if (height > natural.h) {
      height = natural.h;
      width = Math.round(height * (3 / 4));
    }
    left = Math.max(0, Math.min(left, natural.w - width));
    top = Math.max(0, Math.min(top, natural.h - height));
    return {
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  function clampDesktop(next: DesktopCrop): DesktopCrop {
    let { left, top, width, height } = next;
    width = Math.max(1, Math.min(width, natural.w));
    height = Math.round(width / desktopAspect);
    if (height > natural.h) {
      height = natural.h;
      width = Math.round(height * desktopAspect);
    }
    left = Math.max(0, Math.min(left, natural.w - width));
    top = Math.max(0, Math.min(top, natural.h - height));
    return {
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  function commitCrop(next: MobileCrop) {
    if (target === "mobile") {
      onMobileCropChange(clampMobile(next));
      return;
    }
    const clamped = clampDesktop(next);
    onDesktopCropChange(clamped, focusFromCrop(clamped, natural.w, natural.h));
  }

  function onPointerDown(e: React.PointerEvent, nextMode: "move" | "resize") {
    if (!crop) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setMode(nextMode);
    origin.current = { x: e.clientX, y: e.clientY, crop: { ...crop } };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!mode || !origin.current.crop || !natural.w) return;
    const dx = (e.clientX - origin.current.x) * scale;
    const dy = (e.clientY - origin.current.y) * scale;
    const base = origin.current.crop;
    if (mode === "move") {
      commitCrop({ ...base, left: base.left + dx, top: base.top + dy });
      return;
    }
    const width = base.width + dx;
    if (target === "mobile") {
      commitCrop({ ...base, width, height: Math.round(width * (4 / 3)) });
    } else {
      commitCrop({ ...base, width, height: Math.round(width / desktopAspect) });
    }
  }

  function onPointerUp() {
    setMode(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!crop || !stageRef.current) return;
      if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      let next = { ...crop };
      if (e.key === "ArrowLeft") next.left -= step;
      else if (e.key === "ArrowRight") next.left += step;
      else if (e.key === "ArrowUp") next.top -= step;
      else if (e.key === "ArrowDown") next.top += step;
      else return;
      e.preventDefault();
      commitCrop(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [crop, natural.w, target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (slide.media_kind === "video") {
    return (
      <div className="rounded-xl border border-slate-700 p-6 text-sm text-slate-400">
        {t("slideshow.videoCropNote")}
      </div>
    );
  }

  const soft = target === "mobile" && crop && crop.width < 1080;
  const ratioLabel =
    target === "mobile" ? "3:4" : `${desktopRatio.w}:${desktopRatio.h}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_20rem]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={target === "desktop" ? "default" : "outline"}
            onClick={() => setTarget("desktop")}
          >
            {t("slideshow.desktopCrop")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={target === "mobile" ? "default" : "outline"}
            onClick={() => setTarget("mobile")}
          >
            {t("slideshow.mobileCrop")}
          </Button>
        </div>
        <div
          ref={stageRef}
          className="relative overflow-hidden rounded-xl bg-black ring-1 ring-slate-700"
          tabIndex={0}
        >
          {imageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt={slide.alt}
                className="block max-h-[520px] w-full object-contain"
                style={previewStyle}
                draggable={false}
              />
              {crop && natural.w > 0 ? (
                <>
                  <div
                    className="pointer-events-none absolute inset-0 bg-black/55"
                    style={{
                      clipPath: `polygon(
                        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                        ${(crop.left / natural.w) * 100}% ${(crop.top / natural.h) * 100}%,
                        ${(crop.left / natural.w) * 100}% ${((crop.top + crop.height) / natural.h) * 100}%,
                        ${((crop.left + crop.width) / natural.w) * 100}% ${((crop.top + crop.height) / natural.h) * 100}%,
                        ${((crop.left + crop.width) / natural.w) * 100}% ${(crop.top / natural.h) * 100}%,
                        ${(crop.left / natural.w) * 100}% ${(crop.top / natural.h) * 100}%
                      )`,
                    }}
                  />
                  <div
                    className={cn(
                      "absolute touch-none border-2 bg-teal-500/10",
                      target === "desktop" ? "border-amber-400" : "border-teal-400",
                      mode ? "cursor-grabbing" : "cursor-grab",
                    )}
                    style={{
                      left: crop.left / scale,
                      top: crop.top / scale,
                      width: crop.width / scale,
                      height: crop.height / scale,
                    }}
                    onPointerDown={(e) => onPointerDown(e, "move")}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                  >
                    <span className="pointer-events-none absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-teal-200 uppercase">
                      {target === "desktop"
                        ? t("slideshow.desktopCrop")
                        : t("slideshow.mobileCrop")}
                    </span>
                    <button
                      type="button"
                      aria-label="Resize crop"
                      className="absolute right-0 bottom-0 size-3.5 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-sm border border-teal-300 bg-slate-900"
                      onPointerDown={(e) => onPointerDown(e, "resize")}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="grid aspect-video place-items-center text-sm text-slate-500">
              {t("slideshow.uploadFirst")}
            </div>
          )}
        </div>
        {crop && natural.w > 0 && imageUrl ? (
          <CropLivePreview
            target={target}
            crop={crop}
            natural={natural}
            imageUrl={imageUrl}
            previewStyle={previewStyle}
            settings={settings}
            label={
              target === "mobile" ? t("slideshow.phonePreview") : t("slideshow.desktopPreview")
            }
          />
        ) : null}
        {soft ? <p className="text-sm text-amber-300/90">{t("slideshow.cropSoft")}</p> : null}
      </div>

      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          {target === "mobile" ? t("slideshow.cropHint") : t("slideshow.desktopCropHint")}
        </p>
        {FILTER_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.key}>{t(field.labelKey)}</Label>
              <span className="text-xs text-slate-500">{filters[field.key]}</span>
            </div>
            <input
              id={field.key}
              type="range"
              min={field.min}
              max={field.max}
              value={filters[field.key]}
              className="w-full accent-teal-500"
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  [field.key]: Number(e.target.value),
                })
              }
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          {(["left", "top"] as const).map((key) => (
            <label key={key} className="space-y-1 text-xs tracking-wide uppercase text-slate-400">
              {key}
              <Input
                type="number"
                value={crop?.[key] ?? 0}
                onChange={(e) => {
                  if (!crop) return;
                  commitCrop({ ...crop, [key]: Number(e.target.value) });
                }}
              />
            </label>
          ))}
          {(["width", "height"] as const).map((key) => (
            <label key={key} className="space-y-1 text-xs tracking-wide uppercase text-slate-400">
              {key}
              <Input type="number" value={crop?.[key] ?? 0} readOnly />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onFiltersChange({ ...DEFAULT_FILTERS })}>
            {t("slideshow.resetFilters")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!natural.w) return;
              if (target === "mobile") {
                onMobileCropChange(defaultMobileCrop(natural.w, natural.h));
              } else {
                const next = defaultDesktopCrop(natural.w, natural.h, settings.ratio);
                onDesktopCropChange(next, focusFromCrop(next, natural.w, natural.h));
              }
            }}
          >
            {t("slideshow.resetCrop")}
          </Button>
          <Button type="button" onClick={onApply} disabled={applying || !imageUrl}>
            {applying ? t("slideshow.saving") : t("slideshow.applyImages")}
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          {target === "mobile"
            ? `Viewport hint: ${settings.output.mobileViewport.width}×${settings.output.mobileViewport.height} (crop locked ${ratioLabel})`
            : `Slideshow ratio ${ratioLabel} — drag to choose the visible desktop area`}
        </p>
      </div>
    </div>
  );
}
