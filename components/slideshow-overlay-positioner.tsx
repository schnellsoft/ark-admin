"use client";

import { useEffect, useRef, useState } from "react";
import { SlideshowDraggableBox } from "@/components/slideshow-draggable-box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  clampLayerRect,
  defaultLayerVariant,
  type LayerVariantSettings,
  type SlideLayer,
} from "@/lib/slideshow-shared";

function ChromeFields({
  value,
  onChange,
}: {
  value: LayerVariantSettings;
  onChange: (v: LayerVariantSettings) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(["left", "top", "width", "height"] as const).map((k) => (
        <div key={k} className="space-y-1">
          <Label>
            {k} %
          </Label>
          <Input
            type="number"
            step={0.1}
            value={value.rect[k]}
            onChange={(e) =>
              onChange({
                ...value,
                rect: clampLayerRect({ ...value.rect, [k]: Number(e.target.value) }),
              })
            }
          />
        </div>
      ))}
      <div className="space-y-1">
        <Label>{t("slideshow.layerBg")}</Label>
        <Input
          value={value.background.color}
          onChange={(e) =>
            onChange({
              ...value,
              background: { ...value.background, color: e.target.value },
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label>{t("slideshow.layerBgOpacity")}</Label>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={value.background.opacity}
          onChange={(e) =>
            onChange({
              ...value,
              background: { ...value.background, opacity: Number(e.target.value) },
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label>{t("slideshow.layerBlur")}</Label>
        <Input
          type="number"
          min={0}
          max={40}
          value={value.background.blur}
          onChange={(e) =>
            onChange({
              ...value,
              background: { ...value.background, blur: Number(e.target.value) },
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label>{t("slideshow.layerPadding")}</Label>
        <Input
          type="number"
          min={0}
          value={value.padding}
          onChange={(e) => onChange({ ...value, padding: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label>{t("slideshow.layerRadius")}</Label>
        <Input
          type="number"
          min={0}
          value={value.radius}
          onChange={(e) => onChange({ ...value, radius: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label>{t("slideshow.layerZIndex")}</Label>
        <Input
          type="number"
          value={value.zIndex}
          onChange={(e) => onChange({ ...value, zIndex: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

export function SlideshowOverlayPositioner({
  layer,
  desktopHtml,
  mobileHtml,
  desktopPreviewUrl,
  mobilePreviewUrl,
  onLayerChange,
}: {
  layer: SlideLayer;
  desktopHtml: string;
  mobileHtml: string;
  desktopPreviewUrl: string | null;
  mobilePreviewUrl: string | null;
  onLayerChange: (layer: SlideLayer) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"desktop" | "mobile">("desktop");
  const [playTick, setPlayTick] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sameAsDesktop =
    layer.mobile && "sameAsDesktop" in layer.mobile && layer.mobile.sameAsDesktop;

  const variant: LayerVariantSettings =
    tab === "desktop"
      ? layer.desktop
      : sameAsDesktop
        ? layer.desktop
        : layer.mobile && "sameAsDesktop" in layer.mobile && !layer.mobile.sameAsDesktop
          ? layer.mobile
          : defaultLayerVariant();

  const previewUrl = tab === "desktop" ? desktopPreviewUrl : mobilePreviewUrl || desktopPreviewUrl;
  const html =
    tab === "mobile" && !sameAsDesktop ? mobileHtml || desktopHtml : desktopHtml;
  const anim = variant.animation;

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.classList.remove("is-in");
    if (playTick === 0 || anim.effect === "none" || anim.playMode === "off") {
      el.classList.add("is-in");
      return;
    }
    el.style.setProperty("--d", `${anim.duration}ms`);
    el.style.setProperty("--delay", `${anim.delay}ms`);
    void el.offsetWidth;
    requestAnimationFrame(() => el.classList.add("is-in"));
  }, [playTick, anim.effect, anim.direction, anim.duration, anim.delay, anim.playMode, html]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "desktop" ? "default" : "outline"}
            onClick={() => setTab("desktop")}
          >
            {t("slideshow.desktopOverlay")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "mobile" ? "default" : "outline"}
            onClick={() => setTab("mobile")}
          >
            {t("slideshow.mobileOverlay")}
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-sky-600 hover:bg-sky-500"
          onClick={() => setPlayTick((n) => n + 1)}
          disabled={anim.playMode === "off" || anim.effect === "none"}
        >
          {t("slideshow.animPlay")}
        </Button>
      </div>

      {tab === "mobile" && sameAsDesktop ? (
        <p className="text-sm text-slate-400">{t("slideshow.mobileUsesDesktop")}</p>
      ) : null}

      <div
        className={`relative overflow-hidden rounded-xl bg-black ring-1 ring-slate-700 ${
          tab === "mobile" ? "aspect-[3/4] max-w-sm" : "aspect-video"
        }`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-full object-cover" draggable={false} />
        ) : (
          <div className="grid size-full place-items-center text-sm text-slate-500">
            {t("slideshow.uploadFirst")}
          </div>
        )}
        <div
          className="pointer-events-none absolute overflow-hidden text-sm"
          style={{
            left: `${variant.rect.left}%`,
            top: `${variant.rect.top}%`,
            width: `${variant.rect.width}%`,
            height: `${variant.rect.height}%`,
            opacity: variant.opacity,
            borderRadius: variant.radius,
            zIndex: variant.zIndex,
          }}
        >
          <div
            ref={bodyRef}
            className={`hl-preview hl-preview--${anim.effect} hl-preview--dir-${anim.direction} is-in`}
            style={{
              color: variant.textColor,
              height: "100%",
              padding: variant.padding,
              background: `${variant.background.color}${Math.round(variant.background.opacity * 255)
                .toString(16)
                .padStart(2, "0")}`,
              backdropFilter: variant.background.blur
                ? `blur(${variant.background.blur}px)`
                : undefined,
              display: "flex",
              alignItems:
                variant.verticalAlign === "top"
                  ? "flex-start"
                  : variant.verticalAlign === "bottom"
                    ? "flex-end"
                    : "center",
            }}
            dangerouslySetInnerHTML={{ __html: html || "" }}
          />
        </div>
        {!(tab === "mobile" && sameAsDesktop) ? (
          <SlideshowDraggableBox
            box={variant.rect}
            label={t("slideshow.htmlLayer")}
            onChange={(rect) => {
              const next = { ...variant, rect };
              if (tab === "desktop") onLayerChange({ ...layer, desktop: next });
              else onLayerChange({ ...layer, mobile: { sameAsDesktop: false, ...next } });
            }}
          />
        ) : null}
        <style>{`
          .hl-preview:not(.is-in) { opacity: 0; }
          .hl-preview.is-in {
            opacity: 1; transform: none; filter: none;
            transition: opacity var(--d,600ms) ease var(--delay,0ms),
              transform var(--d,600ms) ease var(--delay,0ms),
              filter var(--d,600ms) ease var(--delay,0ms);
          }
          .hl-preview--slide:not(.is-in).hl-preview--dir-left { transform: translateX(-24px); }
          .hl-preview--slide:not(.is-in).hl-preview--dir-right { transform: translateX(24px); }
          .hl-preview--slide:not(.is-in).hl-preview--dir-top { transform: translateY(-24px); }
          .hl-preview--slide:not(.is-in).hl-preview--dir-bottom { transform: translateY(24px); }
          .hl-preview--zoom:not(.is-in) { transform: scale(0.9); }
          .hl-preview--blur:not(.is-in) { filter: blur(8px); }
          .hl-preview--reveal-lines:not(.is-in) { transform: translateY(100%); }
          .hl-preview--none, .hl-preview--none:not(.is-in) {
            opacity: 1 !important; transform: none !important; transition: none !important;
          }
        `}</style>
      </div>

      {!(tab === "mobile" && sameAsDesktop) ? (
        <ChromeFields
          value={variant}
          onChange={(v) => {
            if (tab === "desktop") onLayerChange({ ...layer, desktop: v });
            else onLayerChange({ ...layer, mobile: { sameAsDesktop: false, ...v } });
          }}
        />
      ) : null}
    </div>
  );
}
