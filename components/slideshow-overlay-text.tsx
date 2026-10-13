"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import { HexColorField } from "@/components/hex-color-field";
import { SlideshowDraggableBox } from "@/components/slideshow-draggable-box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import { sanitizeSlideLayerHtml } from "@/lib/slide-layer-sanitize";
import {
  defaultLayerVariant,
  normalizeLayerAnimation,
  type LayerAnimDirection,
  type LayerAnimEffect,
  type LayerAnimPlayMode,
  type LayerVariantSettings,
  type SlideLayer,
} from "@/lib/slideshow-shared";

type RibbonTab = "home" | "insert" | "animation" | "layer" | "view";
type DeviceTab = "desktop" | "mobile";

const EFFECT_OPTIONS: { id: LayerAnimEffect; labelKey: string }[] = [
  { id: "none", labelKey: "slideshow.animNone" },
  { id: "fade", labelKey: "slideshow.animFade" },
  { id: "slide", labelKey: "slideshow.animSlide" },
  { id: "stagger", labelKey: "slideshow.animStaggerEffect" },
  { id: "zoom", labelKey: "slideshow.animZoom" },
  { id: "reveal-lines", labelKey: "slideshow.animLines" },
  { id: "blur", labelKey: "slideshow.animBlur" },
  { id: "underline", labelKey: "slideshow.animUnderline" },
  { id: "typewriter", labelKey: "slideshow.animTypewriter" },
];

const DIR_OPTIONS: LayerAnimDirection[] = ["left", "right", "top", "bottom"];

const PLAY_OPTIONS: { id: LayerAnimPlayMode; labelKey: string }[] = [
  { id: "once", labelKey: "slideshow.animPlayOnce" },
  { id: "always", labelKey: "slideshow.animPlayAlways" },
  { id: "off", labelKey: "slideshow.animPlayOff" },
];

function ribbonBtn(active: boolean) {
  return active
    ? "bg-sky-600 text-white hover:bg-sky-500"
    : "border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800";
}

function activeVariant(
  layer: SlideLayer,
  device: DeviceTab,
): LayerVariantSettings {
  if (device === "desktop") return layer.desktop;
  const same =
    layer.mobile && "sameAsDesktop" in layer.mobile && layer.mobile.sameAsDesktop;
  if (same) return layer.desktop;
  if (layer.mobile && "sameAsDesktop" in layer.mobile && !layer.mobile.sameAsDesktop) {
    return layer.mobile;
  }
  return defaultLayerVariant();
}

function patchVariant(
  layer: SlideLayer,
  device: DeviceTab,
  next: LayerVariantSettings,
): SlideLayer {
  if (device === "desktop") return { ...layer, desktop: next };
  return { ...layer, mobile: { sameAsDesktop: false, ...next } };
}

function LayerPreview({
  variant,
  htmlContent,
  previewUrl,
  playing,
  aspect,
  onRectChange,
  showDrag,
}: {
  variant: LayerVariantSettings;
  htmlContent: string;
  previewUrl: string | null;
  playing: boolean;
  aspect: "video" | "portrait";
  onRectChange: (rect: LayerVariantSettings["rect"]) => void;
  showDrag: boolean;
}) {
  const anim = variant.animation;
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.classList.remove("is-in");
    if (!playing || anim.effect === "none" || anim.playMode === "off") {
      el.classList.add("is-in");
      return;
    }
    el.style.setProperty("--d", `${anim.duration}ms`);
    el.style.setProperty("--delay", `${anim.delay}ms`);
    // Force reflow then play
    void el.offsetWidth;
    requestAnimationFrame(() => el.classList.add("is-in"));
  }, [playing, anim.effect, anim.direction, anim.duration, anim.delay, anim.playMode, htmlContent]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-950 ring-1 ring-slate-700 ${
        aspect === "portrait" ? "aspect-[3/4] max-w-sm" : "aspect-video"
      }`}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        <div className="grid size-full place-items-center bg-emerald-900/40 text-sm text-slate-400">
          —
        </div>
      )}
      <div
        className="pointer-events-none absolute overflow-hidden"
        style={{
          left: `${variant.rect.left}%`,
          top: `${variant.rect.top}%`,
          width: `${variant.rect.width}%`,
          height: `${variant.rect.height}%`,
          opacity: variant.opacity,
          zIndex: variant.zIndex,
          borderRadius: variant.radius,
        }}
      >
        <div
          ref={bodyRef}
          className={`hl-preview hl-preview--${anim.effect} hl-preview--dir-${anim.direction}${
            playing ? "" : " is-in"
          }`}
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
            fontSize: variant.scaleText ? "clamp(0.75rem, 4cqi, 1.5rem)" : undefined,
          }}
          dangerouslySetInnerHTML={{ __html: htmlContent || "" }}
        />
        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
          x {Math.round(variant.rect.left)}% y {Math.round(variant.rect.top)}% w{" "}
          {Math.round(variant.rect.width)}% h {Math.round(variant.rect.height)}%
        </span>
      </div>
      {showDrag ? (
        <SlideshowDraggableBox
          box={variant.rect}
          label="HTML layer"
          onChange={onRectChange}
        />
      ) : null}
      <style>{`
        .hl-preview:not(.is-in) {
          opacity: 0;
        }
        .hl-preview.is-in {
          opacity: 1;
          transform: none;
          filter: none;
          transition:
            opacity var(--d, 600ms) ease var(--delay, 0ms),
            transform var(--d, 600ms) ease var(--delay, 0ms),
            filter var(--d, 600ms) ease var(--delay, 0ms);
        }
        .hl-preview--slide:not(.is-in).hl-preview--dir-left {
          transform: translateX(-24px);
        }
        .hl-preview--slide:not(.is-in).hl-preview--dir-right {
          transform: translateX(24px);
        }
        .hl-preview--slide:not(.is-in).hl-preview--dir-top {
          transform: translateY(-24px);
        }
        .hl-preview--slide:not(.is-in).hl-preview--dir-bottom {
          transform: translateY(24px);
        }
        .hl-preview--zoom:not(.is-in) {
          transform: scale(0.9);
        }
        .hl-preview--blur:not(.is-in) {
          filter: blur(8px);
        }
        .hl-preview--reveal-lines:not(.is-in) {
          transform: translateY(100%);
        }
        .hl-preview--none,
        .hl-preview--none:not(.is-in) {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }
      `}</style>
    </div>
  );
}

export function SlideshowOverlayText({
  layer,
  desktopHtml,
  mobileHtml,
  desktopPreviewUrl,
  mobilePreviewUrl,
  onLayerChange,
  onDesktopHtmlChange,
  onMobileHtmlChange,
}: {
  layer: SlideLayer;
  desktopHtml: string;
  mobileHtml: string;
  desktopPreviewUrl?: string | null;
  mobilePreviewUrl?: string | null;
  onLayerChange: (layer: SlideLayer) => void;
  onDesktopHtmlChange: (html: string) => void;
  onMobileHtmlChange: (html: string) => void;
}) {
  const { t } = useI18n();
  const [ribbon, setRibbon] = useState<RibbonTab>("home");
  const [device, setDevice] = useState<DeviceTab>("desktop");
  const [sourceMode, setSourceMode] = useState(false);
  const [playTick, setPlayTick] = useState(0);
  const [icons, setIcons] = useState<Array<{ id: string; name: string; svg: string }>>([]);
  const [iconOpen, setIconOpen] = useState(false);

  const sameAsDesktop =
    layer.mobile && "sameAsDesktop" in layer.mobile && layer.mobile.sameAsDesktop;
  const variant = activeVariant(layer, device);
  const editingLocked = device === "mobile" && Boolean(sameAsDesktop);

  const activeHtml = device === "desktop" ? desktopHtml : mobileHtml;
  const setActiveHtml = device === "desktop" ? onDesktopHtmlChange : onMobileHtmlChange;
  const previewUrl =
    device === "desktop"
      ? desktopPreviewUrl ?? null
      : mobilePreviewUrl || desktopPreviewUrl || null;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      TextStyle,
      Color,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: desktopHtml || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const htmlValue = sanitizeSlideLayerHtml(ed.getHTML());
      if (device === "desktop") onDesktopHtmlChange(htmlValue);
      else onMobileHtmlChange(htmlValue);
    },
  });

  useEffect(() => {
    if (!editor || editingLocked) return;
    const htmlValue = device === "desktop" ? desktopHtml : mobileHtml;
    if (editor.getHTML() !== htmlValue) editor.commands.setContent(htmlValue || "<p></p>");
  }, [device, editingLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/site/icons");
        if (!res.ok) return;
        const data = (await res.json()) as {
          icons?: Array<{ id: string; name: string; svg: string }>;
        };
        setIcons(data.icons ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  function updateVariant(patch: Partial<LayerVariantSettings>) {
    const next = { ...variant, ...patch };
    onLayerChange(patchVariant(layer, device, next));
  }

  function updateAnim(patch: Partial<LayerVariantSettings["animation"]>) {
    updateVariant({
      animation: normalizeLayerAnimation({ ...variant.animation, ...patch }),
    });
  }

  function insertHtml(snippet: string) {
    if (sourceMode) {
      setActiveHtml(sanitizeSlideLayerHtml(`${activeHtml}${snippet}`));
      return;
    }
    editor?.chain().focus().insertContent(snippet).run();
  }

  const ribbonTabs = useMemo(
    () =>
      (
        [
          ["home", "slideshow.ribbonHome"],
          ["insert", "slideshow.ribbonInsert"],
          ["animation", "slideshow.ribbonAnimation"],
          ["layer", "slideshow.ribbonLayer"],
          ["view", "slideshow.ribbonView"],
        ] as const
      ).map(([id, key]) => ({ id, label: t(key) })),
    [t],
  );

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-200">{t("slideshow.htmlLayer")}</h2>
        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <span>{variant.enabled ? t("slideshow.layerOn") : t("slideshow.layerOff")}</span>
          <input
            type="checkbox"
            className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-slate-600 accent-sky-500 checked:bg-sky-600"
            style={{
              background: variant.enabled ? "#0284c7" : "#475569",
            }}
            checked={variant.enabled}
            onChange={(e) => updateVariant({ enabled: e.target.checked })}
            disabled={editingLocked}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-2">
        {ribbonTabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant="outline"
            className={ribbonBtn(ribbon === tab.id)}
            onClick={() => setRibbon(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {!editingLocked ? (
        <div className="min-h-[4.5rem] space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          {ribbon === "home" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                  B
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                  I
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                >
                  U
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                >
                  •
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                >
                  1.
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor?.chain().focus().setTextAlign("left").run()}
                >
                  ⬅
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor?.chain().focus().setTextAlign("center").run()}
                >
                  ≡
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor?.chain().focus().setTextAlign("right").run()}
                >
                  ➡
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
                >
                  {t("slideshow.clearFormat")}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <HexColorField
                  id="layer-text-color"
                  label={t("slideshow.layerTextColor")}
                  value={variant.textColor}
                  onChange={(textColor) => {
                    updateVariant({ textColor });
                    editor?.chain().focus().setColor(textColor).run();
                  }}
                />
                <div className="space-y-1">
                  <Label>{t("slideshow.layerOpacity")}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={variant.opacity}
                    onChange={(e) => updateVariant({ opacity: Number(e.target.value) })}
                  />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-sky-500"
                    checked={variant.scaleText}
                    onChange={(e) => updateVariant({ scaleText: e.target.checked })}
                  />
                  {t("slideshow.scaleText")}
                </label>
              </div>
            </div>
          ) : null}

          {ribbon === "insert" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const url = window.prompt("URL");
                  if (url) editor?.chain().focus().setLink({ href: url }).run();
                }}
              >
                {t("slideshow.insertLink")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  insertHtml(
                    `<p><a class="slide-btn" href="#" style="display:inline-block;padding:0.5rem 1rem;border-radius:999px;background:#fff;color:#111;text-decoration:none">Button</a></p>`,
                  )
                }
              >
                {t("slideshow.insertButton")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => insertHtml("<hr />")}
              >
                {t("slideshow.insertDivider")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIconOpen((v) => !v)}
              >
                {t("slideshow.insertIcon")}
              </Button>
              {iconOpen ? (
                <div className="max-h-40 w-full overflow-auto rounded border border-slate-700 p-2">
                  {icons.length === 0 ? (
                    <p className="text-xs text-slate-500">{t("slideshow.noIcons")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {icons.map((icon) => (
                        <button
                          key={icon.id}
                          type="button"
                          title={icon.name}
                          className="grid size-10 place-items-center rounded border border-slate-600 bg-slate-900 text-sky-200 hover:border-sky-500"
                          onClick={() => {
                            const svg = icon.svg.includes("currentColor")
                              ? icon.svg
                              : icon.svg.replace(/fill="[^"]*"/g, 'fill="currentColor"');
                            insertHtml(
                              `<span class="slide-icon" aria-hidden="true">${svg}</span>`,
                            );
                            setIconOpen(false);
                          }}
                          dangerouslySetInnerHTML={{ __html: icon.svg }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {ribbon === "animation" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                {EFFECT_OPTIONS.slice(0, 6).map((opt) => (
                  <Button
                    key={opt.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className={ribbonBtn(variant.animation.effect === opt.id)}
                    onClick={() => updateAnim({ effect: opt.id })}
                  >
                    {t(opt.labelKey)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-slate-500">{t("slideshow.animExtraHint")}</p>
              <div className="flex flex-wrap gap-2">
                {EFFECT_OPTIONS.slice(6).map((opt) => (
                  <Button
                    key={opt.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className={ribbonBtn(variant.animation.effect === opt.id)}
                    onClick={() => updateAnim({ effect: opt.id })}
                  >
                    {t(opt.labelKey)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>{t("slideshow.animDirection")}</Label>
                  <div className="flex gap-1">
                    {DIR_OPTIONS.map((dir) => (
                      <Button
                        key={dir}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`size-9 p-0 ${ribbonBtn(variant.animation.direction === dir)}`}
                        onClick={() => updateAnim({ direction: dir })}
                        aria-label={dir}
                      >
                        {dir === "left" ? "←" : dir === "right" ? "→" : dir === "top" ? "↑" : "↓"}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  className="min-w-[8rem] bg-sky-600 hover:bg-sky-500"
                  onClick={() => setPlayTick((n) => n + 1)}
                >
                  {t("slideshow.animPreview")}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>{t("slideshow.animDuration")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={variant.animation.duration}
                      onChange={(e) => updateAnim({ duration: Number(e.target.value) })}
                    />
                    <span className="text-xs text-slate-500">ms</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("slideshow.animDelay")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={variant.animation.delay}
                      onChange={(e) => updateAnim({ delay: Number(e.target.value) })}
                    />
                    <span className="text-xs text-slate-500">ms</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("slideshow.animStagger")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={variant.animation.stagger}
                      onChange={(e) => updateAnim({ stagger: Number(e.target.value) })}
                    />
                    <span className="text-xs text-slate-500">ms</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("slideshow.animPlayMode")}</Label>
                <div className="flex flex-wrap gap-2">
                  {PLAY_OPTIONS.map((opt) => (
                    <Button
                      key={opt.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className={ribbonBtn(variant.animation.playMode === opt.id)}
                      onClick={() => updateAnim({ playMode: opt.id })}
                    >
                      {t(opt.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {ribbon === "layer" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["left", "top", "width", "height"] as const).map((k) => (
                <div key={k} className="space-y-1">
                  <Label>
                    {k} %
                  </Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={variant.rect[k]}
                    onChange={(e) =>
                      updateVariant({
                        rect: { ...variant.rect, [k]: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label>{t("slideshow.layerOpacity")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={variant.opacity}
                  onChange={(e) => updateVariant({ opacity: Number(e.target.value) })}
                />
              </div>
              <HexColorField
                id="layer-bg-color"
                label={t("slideshow.layerBg")}
                value={variant.background.color}
                onChange={(color) =>
                  updateVariant({
                    background: { ...variant.background, color },
                  })
                }
              />
              <div className="space-y-1">
                <Label>{t("slideshow.layerBgOpacity")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={variant.background.opacity}
                  onChange={(e) =>
                    updateVariant({
                      background: {
                        ...variant.background,
                        opacity: Number(e.target.value),
                      },
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
                  value={variant.background.blur}
                  onChange={(e) =>
                    updateVariant({
                      background: { ...variant.background, blur: Number(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t("slideshow.layerPadding")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={variant.padding}
                  onChange={(e) => updateVariant({ padding: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("slideshow.layerRadius")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={variant.radius}
                  onChange={(e) => updateVariant({ radius: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>{t("slideshow.verticalAlign")}</Label>
                <select
                  className="h-9 w-full rounded-md border border-slate-600 bg-slate-900/80 px-2 text-sm"
                  value={variant.verticalAlign}
                  onChange={(e) =>
                    updateVariant({
                      verticalAlign: e.target.value as LayerVariantSettings["verticalAlign"],
                    })
                  }
                >
                  <option value="top">top</option>
                  <option value="center">center</option>
                  <option value="bottom">bottom</option>
                </select>
              </div>
            </div>
          ) : null}

          {ribbon === "view" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={ribbonBtn(!sourceMode)}
                onClick={() => setSourceMode(false)}
              >
                {t("slideshow.visualMode")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={ribbonBtn(sourceMode)}
                onClick={() => setSourceMode(true)}
              >
                {t("slideshow.sourceMode")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{t("slideshow.mobileUsesDesktop")}</p>
      )}

      {!editingLocked ? (
        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-2">
          {sourceMode ? (
            <CodeMirror
              value={activeHtml}
              height="200px"
              extensions={[html()]}
              theme="dark"
              onChange={(v) => {
                const clean = sanitizeSlideLayerHtml(v);
                setActiveHtml(clean);
                editor?.commands.setContent(clean || "<p></p>");
              }}
            />
          ) : (
            <EditorContent
              editor={editor}
              className="prose prose-invert min-h-[120px] max-w-none px-2 py-1 text-sm [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none"
            />
          )}
          <p className="mt-1 text-right text-xs text-slate-500">{activeHtml.length} / 20000</p>
        </div>
      ) : null}

      <LayerPreview
        key={playTick}
        variant={variant}
        htmlContent={
          device === "mobile" && !sameAsDesktop ? mobileHtml || desktopHtml : desktopHtml
        }
        previewUrl={previewUrl}
        playing={playTick > 0}
        aspect={device === "mobile" ? "portrait" : "video"}
        showDrag={!editingLocked && (ribbon === "layer" || ribbon === "animation")}
        onRectChange={(rect) => updateVariant({ rect })}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={ribbonBtn(device === "desktop")}
            onClick={() => setDevice("desktop")}
          >
            Desktop
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={ribbonBtn(device === "mobile")}
            onClick={() => setDevice("mobile")}
          >
            Mobile
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {device === "mobile" ? (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-sky-500"
                checked={Boolean(sameAsDesktop)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onLayerChange({ ...layer, mobile: { sameAsDesktop: true } });
                  } else {
                    onLayerChange({
                      ...layer,
                      mobile: { sameAsDesktop: false, ...defaultLayerVariant() },
                    });
                    onMobileHtmlChange(desktopHtml);
                  }
                }}
              />
              {t("slideshow.sameAsDesktop")}
            </label>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={ribbonBtn(!sourceMode)}
            onClick={() => setSourceMode(false)}
          >
            {t("slideshow.visualMode")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={ribbonBtn(sourceMode)}
            onClick={() => setSourceMode(true)}
          >
            {t("slideshow.sourceMode")}
          </Button>
        </div>
      </div>
    </div>
  );
}
