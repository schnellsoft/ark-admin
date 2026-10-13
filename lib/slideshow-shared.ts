export const SLIDESHOW_CONTENT_KEY = "slideshow/slideshow.json";
export const SLIDESHOW_HTML_PREFIX = "slideshow/html/";
export const SLIDESHOW_MEDIA_PREFIX = "slideshow/";

export type SizePreset = {
  width: number;
  height: number;
  quality: number;
};

export type OutputFormat = "webp" | "jpeg" | "avif";

export type SlideshowOutput = {
  desktop: SizePreset;
  mobileLandscape: SizePreset;
  mobilePortrait: SizePreset;
  mobileViewport: { width: number; height: number };
  mobileMaxWidth: number;
  tabletMaxWidth: number;
  outputFormat: OutputFormat;
};

export type SlideshowSettings = {
  animation: string;
  autoplay: boolean;
  autoplayInterval: number;
  animationDuration: number;
  kenburns: boolean;
  finite: boolean;
  pauseOnHover: boolean;
  velocity: number;
  swipeThreshold: number;
  ratio: string;
  minHeight: string;
  maxHeight: string;
  index: number;
  output: SlideshowOutput;
};

export type ImageFilters = {
  brightness: number;
  contrast: number;
  saturate: number;
  hueRotate: number;
  grayscale: number;
  sepia: number;
  invert: number;
  blur: number;
};

export type MobileCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Same rect shape; used for the locked-ratio desktop crop. */
export type DesktopCrop = MobileCrop;

/** Focal point for object-position (percentages 0–100). */
export type ImageFocus = { x: number; y: number };

export type LayerRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SlideFileSize = { width: number; height: number };

export type SlideFiles = {
  desktop?: Record<string, SlideFileSize>;
  mobile?: Record<string, SlideFileSize>;
  video?: { key: string; contentType: string };
  sourceKey?: string;
};

export type LayerAnimEffect =
  | "none"
  | "fade"
  | "slide"
  | "stagger"
  | "zoom"
  | "reveal-lines"
  | "blur"
  | "underline"
  | "typewriter";

export type LayerAnimDirection = "left" | "right" | "top" | "bottom";

/** once = first show only; always = every slide show; off = no animation */
export type LayerAnimPlayMode = "once" | "always" | "off";

export type LayerAnimation = {
  effect: LayerAnimEffect;
  direction: LayerAnimDirection;
  duration: number;
  delay: number;
  stagger: number;
  playMode: LayerAnimPlayMode;
};

export type LayerVariantSettings = {
  enabled: boolean;
  rect: LayerRect;
  opacity: number;
  background: { color: string; opacity: number; blur: number };
  padding: number;
  radius: number;
  textColor: string;
  verticalAlign: "top" | "center" | "bottom";
  scaleText: boolean;
  animation: LayerAnimation;
  zIndex: number;
};

export type SlideLayer = {
  desktop: LayerVariantSettings;
  mobile: { sameAsDesktop: true } | ({ sameAsDesktop: false } & LayerVariantSettings);
  /** Set when layer HTML is saved — used by the slides list badges. */
  hasDesktopHtml?: boolean;
  hasMobileHtml?: boolean;
};

export type SlideshowSlide = {
  id: string;
  position: number;
  title: string;
  alt: string;
  enabled: boolean;
  media_kind: "image" | "video";
  version: string;
  mobileCrop: MobileCrop | null;
  desktopCrop: DesktopCrop | null;
  desktopFocus: ImageFocus | null;
  filters: ImageFilters;
  files: SlideFiles;
  layer: SlideLayer | null;
  library_asset_id: string | null;
};

export type SlideshowDocument = {
  settings: SlideshowSettings;
  slides: Array<{
    id: string;
    position: number;
    title: string;
    alt: string;
    enabled: boolean;
    mediaKind: "image" | "video";
    version: string;
    mobileCrop: MobileCrop | null;
    desktopCrop: DesktopCrop | null;
    desktopFocus: ImageFocus | null;
    filters: ImageFilters;
    files: SlideFiles;
    layer: SlideLayer | null;
    libraryAssetId: string | null;
  }>;
};

export const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  blur: 0,
};

export function emptySlideshowOutput(): SlideshowOutput {
  return {
    desktop: { width: 1920, height: 1080, quality: 80 },
    mobileLandscape: { width: 1280, height: 720, quality: 80 },
    mobilePortrait: { width: 1080, height: 1440, quality: 80 },
    mobileViewport: { width: 390, height: 844 },
    mobileMaxWidth: 900,
    tabletMaxWidth: 1024,
    outputFormat: "webp",
  };
}

export function emptySlideshowSettings(): SlideshowSettings {
  return {
    animation: "fade",
    autoplay: true,
    autoplayInterval: 7000,
    animationDuration: 780,
    kenburns: true,
    finite: false,
    pauseOnHover: true,
    velocity: 1,
    swipeThreshold: 48,
    ratio: "16:9",
    /** Empty = site uses 100dvh − header. Set a CSS length to override. */
    minHeight: "",
    maxHeight: "",
    index: 0,
    output: emptySlideshowOutput(),
  };
}

export const DEFAULT_LAYER_ANIMATION: LayerAnimation = {
  effect: "slide",
  direction: "left",
  duration: 600,
  delay: 200,
  stagger: 120,
  playMode: "once",
};

const LAYER_EFFECTS: LayerAnimEffect[] = [
  "none",
  "fade",
  "slide",
  "stagger",
  "zoom",
  "reveal-lines",
  "blur",
  "underline",
  "typewriter",
];

const LAYER_DIRS: LayerAnimDirection[] = ["left", "right", "top", "bottom"];
const LAYER_PLAY: LayerAnimPlayMode[] = ["once", "always", "off"];

export function normalizeLayerAnimation(
  partial: Partial<LayerAnimation> | null | undefined,
): LayerAnimation {
  const base = DEFAULT_LAYER_ANIMATION;
  if (!partial) return { ...base };
  const effect = LAYER_EFFECTS.includes(partial.effect as LayerAnimEffect)
    ? (partial.effect as LayerAnimEffect)
    : base.effect;
  const direction = LAYER_DIRS.includes(partial.direction as LayerAnimDirection)
    ? (partial.direction as LayerAnimDirection)
    : base.direction;
  const playMode = LAYER_PLAY.includes(partial.playMode as LayerAnimPlayMode)
    ? (partial.playMode as LayerAnimPlayMode)
    : base.playMode;
  return {
    effect,
    direction,
    duration: Math.max(0, Math.round(Number(partial.duration) || base.duration)),
    delay: Math.max(0, Math.round(Number(partial.delay) || 0)),
    stagger: Math.max(0, Math.round(Number(partial.stagger) || base.stagger)),
    playMode,
  };
}

export function normalizeLayerVariant(
  partial: Partial<LayerVariantSettings> | null | undefined,
): LayerVariantSettings {
  const base = defaultLayerVariant();
  if (!partial) return base;
  return {
    enabled: partial.enabled === undefined ? base.enabled : Boolean(partial.enabled),
    rect: clampLayerRect({
      left: Number(partial.rect?.left ?? base.rect.left),
      top: Number(partial.rect?.top ?? base.rect.top),
      width: Number(partial.rect?.width ?? base.rect.width),
      height: Number(partial.rect?.height ?? base.rect.height),
    }),
    opacity: Math.min(1, Math.max(0, Number(partial.opacity ?? base.opacity))),
    background: {
      color: String(partial.background?.color || base.background.color),
      opacity: Math.min(
        1,
        Math.max(0, Number(partial.background?.opacity ?? base.background.opacity)),
      ),
      blur: Math.max(0, Math.round(Number(partial.background?.blur ?? base.background.blur))),
    },
    padding: Math.max(0, Math.round(Number(partial.padding ?? base.padding))),
    radius: Math.max(0, Math.round(Number(partial.radius ?? base.radius))),
    textColor: String(partial.textColor || base.textColor),
    verticalAlign:
      partial.verticalAlign === "top" ||
      partial.verticalAlign === "bottom" ||
      partial.verticalAlign === "center"
        ? partial.verticalAlign
        : base.verticalAlign,
    scaleText: partial.scaleText === undefined ? base.scaleText : Boolean(partial.scaleText),
    animation: normalizeLayerAnimation(partial.animation),
    zIndex: Math.round(Number(partial.zIndex ?? base.zIndex)),
  };
}

export function defaultLayerVariant(): LayerVariantSettings {
  return {
    enabled: true,
    rect: { left: 8, top: 12, width: 40, height: 60 },
    opacity: 1,
    background: { color: "#000000", opacity: 0.45, blur: 4 },
    padding: 4,
    radius: 12,
    textColor: "#ffffff",
    verticalAlign: "center",
    scaleText: true,
    animation: { ...DEFAULT_LAYER_ANIMATION },
    zIndex: 2,
  };
}

export function emptySlideLayer(): SlideLayer {
  return {
    desktop: defaultLayerVariant(),
    mobile: { sameAsDesktop: true },
  };
}

function clampInt(n: unknown, min: number, fallback: number) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, v);
}

function normalizeSizePreset(
  partial: Partial<SizePreset> | null | undefined,
  fallback: SizePreset,
): SizePreset {
  return {
    width: clampInt(partial?.width, 320, fallback.width),
    height: clampInt(partial?.height, 320, fallback.height),
    quality: Math.min(100, Math.max(40, clampInt(partial?.quality, 40, fallback.quality))),
  };
}

export function normalizeSlideshowOutput(
  partial: Partial<SlideshowOutput> | null | undefined,
): SlideshowOutput {
  const base = emptySlideshowOutput();
  if (!partial) return base;
  const format = partial.outputFormat;
  return {
    desktop: normalizeSizePreset(partial.desktop, base.desktop),
    mobileLandscape: normalizeSizePreset(partial.mobileLandscape, base.mobileLandscape),
    mobilePortrait: normalizeSizePreset(partial.mobilePortrait, base.mobilePortrait),
    mobileViewport: {
      width: clampInt(partial.mobileViewport?.width, 240, base.mobileViewport.width),
      height: clampInt(partial.mobileViewport?.height, 320, base.mobileViewport.height),
    },
    mobileMaxWidth: clampInt(partial.mobileMaxWidth, 480, base.mobileMaxWidth),
    tabletMaxWidth: clampInt(partial.tabletMaxWidth, 768, base.tabletMaxWidth),
    outputFormat:
      format === "jpeg" || format === "avif" || format === "webp" ? format : base.outputFormat,
  };
}

export function normalizeSlideshowSettings(
  partial: Partial<SlideshowSettings> | null | undefined,
): SlideshowSettings {
  const base = emptySlideshowSettings();
  if (!partial) return base;
  return {
    animation: String(partial.animation || base.animation),
    autoplay: partial.autoplay === undefined ? base.autoplay : Boolean(partial.autoplay),
    autoplayInterval: Math.max(
      1000,
      Math.round(Number(partial.autoplayInterval) || base.autoplayInterval),
    ),
    animationDuration: Math.max(
      200,
      Math.round(Number(partial.animationDuration) || base.animationDuration),
    ),
    kenburns: partial.kenburns === undefined ? base.kenburns : Boolean(partial.kenburns),
    finite: partial.finite === undefined ? base.finite : Boolean(partial.finite),
    pauseOnHover:
      partial.pauseOnHover === undefined ? base.pauseOnHover : Boolean(partial.pauseOnHover),
    velocity: Number.isFinite(Number(partial.velocity))
      ? Number(partial.velocity)
      : base.velocity,
    swipeThreshold: Math.max(
      16,
      Math.round(Number(partial.swipeThreshold) || base.swipeThreshold),
    ),
    ratio: String(partial.ratio || base.ratio),
    minHeight: String(partial.minHeight ?? ""),
    maxHeight: String(partial.maxHeight ?? ""),
    index: Math.max(0, Math.round(Number(partial.index) || 0)),
    output: normalizeSlideshowOutput(partial.output),
  };
}

export function parseMobileCrop(raw: string | null | undefined): MobileCrop | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as MobileCrop;
    if (
      Number.isFinite(obj.left) &&
      Number.isFinite(obj.top) &&
      Number.isFinite(obj.width) &&
      Number.isFinite(obj.height)
    ) {
      return {
        left: Math.round(obj.left),
        top: Math.round(obj.top),
        width: Math.round(obj.width),
        height: Math.round(obj.height),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const parseDesktopCrop = parseMobileCrop;

export function parseImageFocus(raw: string | null | undefined): ImageFocus | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as ImageFocus;
    if (Number.isFinite(obj.x) && Number.isFinite(obj.y)) {
      return {
        x: Math.min(100, Math.max(0, Math.round(obj.x * 10) / 10)),
        y: Math.min(100, Math.max(0, Math.round(obj.y * 10) / 10)),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function parseSlideshowRatio(ratio: string): { w: number; h: number } {
  const parts = String(ratio || "16:9")
    .split(":")
    .map((n) => Number.parseFloat(n));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    return { w: parts[0], h: parts[1] };
  }
  return { w: 16, h: 9 };
}

export function focusFromCrop(
  crop: MobileCrop,
  naturalW: number,
  naturalH: number,
): ImageFocus {
  if (!naturalW || !naturalH) return { x: 50, y: 50 };
  return {
    x: Math.min(100, Math.max(0, Math.round(((crop.left + crop.width / 2) / naturalW) * 1000) / 10)),
    y: Math.min(100, Math.max(0, Math.round(((crop.top + crop.height / 2) / naturalH) * 1000) / 10)),
  };
}

export function parseSlideFiles(raw: string | null | undefined): SlideFiles {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SlideFiles;
  } catch {
    return {};
  }
}

export function parseSlideLayer(raw: string | null | undefined): SlideLayer | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Partial<SlideLayer>;
    if (!obj || typeof obj !== "object") return null;
    const desktop = normalizeLayerVariant(obj.desktop);
    let mobile: SlideLayer["mobile"];
    if (
      obj.mobile &&
      typeof obj.mobile === "object" &&
      "sameAsDesktop" in obj.mobile &&
      obj.mobile.sameAsDesktop
    ) {
      mobile = { sameAsDesktop: true };
    } else if (obj.mobile && typeof obj.mobile === "object") {
      const { sameAsDesktop: _s, ...rest } = obj.mobile as Partial<LayerVariantSettings> & {
        sameAsDesktop?: boolean;
      };
      mobile = { sameAsDesktop: false, ...normalizeLayerVariant(rest) };
    } else {
      mobile = { sameAsDesktop: true };
    }
    return {
      desktop,
      mobile,
      hasDesktopHtml: Boolean(obj.hasDesktopHtml),
      hasMobileHtml: Boolean(obj.hasMobileHtml),
    };
  } catch {
    return null;
  }
}

export function ensureSlideLayer(layer: SlideLayer | null | undefined): SlideLayer {
  if (!layer) return emptySlideLayer();
  return parseSlideLayer(JSON.stringify(layer)) ?? emptySlideLayer();
}

export function parseImageFilters(raw: string | null | undefined): ImageFilters {
  if (!raw) return { ...DEFAULT_FILTERS };
  try {
    const obj = JSON.parse(raw) as Partial<ImageFilters>;
    return {
      brightness: Number.isFinite(obj.brightness) ? Number(obj.brightness) : DEFAULT_FILTERS.brightness,
      contrast: Number.isFinite(obj.contrast) ? Number(obj.contrast) : DEFAULT_FILTERS.contrast,
      saturate: Number.isFinite(obj.saturate) ? Number(obj.saturate) : DEFAULT_FILTERS.saturate,
      hueRotate: Number.isFinite(obj.hueRotate) ? Number(obj.hueRotate) : DEFAULT_FILTERS.hueRotate,
      grayscale: Number.isFinite(obj.grayscale) ? Number(obj.grayscale) : DEFAULT_FILTERS.grayscale,
      sepia: Number.isFinite(obj.sepia) ? Number(obj.sepia) : DEFAULT_FILTERS.sepia,
      invert: Number.isFinite(obj.invert) ? Number(obj.invert) : DEFAULT_FILTERS.invert,
      blur: Number.isFinite(obj.blur) ? Number(obj.blur) : DEFAULT_FILTERS.blur,
    };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

export function parseSlideshowOutput(raw: string | null | undefined): SlideshowOutput {
  if (!raw) return emptySlideshowOutput();
  try {
    return normalizeSlideshowOutput(JSON.parse(raw) as Partial<SlideshowOutput>);
  } catch {
    return emptySlideshowOutput();
  }
}

export function cssFilters(filters: ImageFilters) {
  return [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturate}%)`,
    `hue-rotate(${filters.hueRotate}deg)`,
    `grayscale(${filters.grayscale}%)`,
    `sepia(${filters.sepia}%)`,
    `invert(${filters.invert}%)`,
    `blur(${filters.blur}px)`,
  ].join(" ");
}

export function clampLayerRect(rect: LayerRect): LayerRect {
  const width = Math.min(100, Math.max(10, rect.width));
  const height = Math.min(100, Math.max(10, rect.height));
  const left = Math.min(100 - width, Math.max(0, rect.left));
  const top = Math.min(100 - height, Math.max(0, rect.top));
  return {
    left: Math.round(left * 100) / 100,
    top: Math.round(top * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };
}

export function buildSlideshowDocument(
  settings: SlideshowSettings,
  slides: SlideshowSlide[],
): SlideshowDocument {
  return {
    settings: { ...settings, output: { ...settings.output } },
    slides: [...slides]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        id: s.id,
        position: s.position,
        title: s.title,
        alt: s.alt,
        enabled: s.enabled,
        mediaKind: s.media_kind,
        version: s.version,
        mobileCrop: s.mobileCrop,
        desktopCrop: s.desktopCrop,
        desktopFocus: s.desktopFocus,
        filters: s.filters,
        files: s.files,
        layer: s.layer,
        libraryAssetId: s.library_asset_id,
      })),
  };
}

export function validateSlideDraft(draft: Partial<SlideshowSlide>): string | null {
  if ((draft.alt ?? "").length > 500) return "ALT is too long";
  if ((draft.title ?? "").length > 200) return "Title is too long";
  return null;
}

export function shortVersionHash(seed = ""): string {
  const raw = `${seed}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(4, "0").slice(0, 4);
}

export function slideThumbKey(slide: SlideshowSlide): string | null {
  if (slide.files.video?.key) return slide.files.video.key;

  // Prefer source for admin list — always written with the slide's current version.
  // Desktop variants can lag when an older pipeline minting bug renamed versions.
  if (slide.files.sourceKey) return slide.files.sourceKey;

  const desktop = slide.files.desktop ?? {};
  const sizes = Object.keys(desktop)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (slide.version && sizes.length > 0) {
    const preferred = sizes.find((w) => w >= 640) ?? sizes[sizes.length - 1]!;
    return `${SLIDESHOW_MEDIA_PREFIX}${slide.id}/slide-${slide.id}.${slide.version}-d-${preferred}.jpg`;
  }

  if (slide.version) {
    return `${SLIDESHOW_MEDIA_PREFIX}${slide.id}/slide-${slide.id}.${slide.version}-source.jpg`;
  }
  return null;
}

export function slideSourceKey(slide: SlideshowSlide): string | null {
  if (slide.files.sourceKey) return slide.files.sourceKey;
  if (slide.files.video?.key) return slide.files.video.key;
  if (!slide.version) return null;
  return `${SLIDESHOW_MEDIA_PREFIX}${slide.id}/slide-${slide.id}.${slide.version}-source.jpg`;
}

/** True when HTML has visible text or media (not just empty tags). */
export function htmlHasLayerContent(html: string | null | undefined): boolean {
  if (!html) return false;
  if (/<(img|svg|video|iframe)\b/i.test(html)) return true;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}

export function slideLayerFlags(slide: SlideshowSlide): {
  desktop: boolean;
  mobile: boolean;
} {
  const layer = slide.layer;
  if (!layer) return { desktop: false, mobile: false };
  return {
    desktop: Boolean(layer.hasDesktopHtml),
    mobile: Boolean(layer.hasMobileHtml),
  };
}
