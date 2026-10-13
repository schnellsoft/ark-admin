import {
  cssFilters,
  parseSlideshowRatio,
  type DesktopCrop,
  type ImageFilters,
  type MobileCrop,
  type SlideFileSize,
  type SlideFiles,
  type SlideshowOutput,
  DEFAULT_FILTERS,
  emptySlideshowOutput,
} from "./slideshow-shared";

export type EncodedSlideVariant = {
  fileName: string;
  blob: Blob;
  contentType: string;
  bucket: "desktop" | "mobile";
  sizeKey: string;
  meta: SlideFileSize;
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encode failed"))),
      type,
      quality,
    );
  });
}

async function resizeBitmap(
  source: ImageBitmap | HTMLCanvasElement,
  targetW: number,
  targetH: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.imageSmoothingQuality = "high";
  const srcW = "width" in source ? source.width : (source as HTMLCanvasElement).width;
  const srcH = "height" in source ? source.height : (source as HTMLCanvasElement).height;
  if (srcW > targetW * 2 || srcH > targetH * 2) {
    const mid = document.createElement("canvas");
    mid.width = Math.round(srcW / 2);
    mid.height = Math.round(srcH / 2);
    const midCtx = mid.getContext("2d");
    if (!midCtx) throw new Error("No canvas");
    midCtx.imageSmoothingQuality = "high";
    midCtx.drawImage(source as CanvasImageSource, 0, 0, mid.width, mid.height);
    ctx.drawImage(mid, 0, 0, targetW, targetH);
  } else {
    ctx.drawImage(source as CanvasImageSource, 0, 0, targetW, targetH);
  }
  return canvas;
}

function applyFiltersToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  filters: ImageFilters,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.filter = cssFilters(filters);
  ctx.drawImage(source, 0, 0, width, height);
  ctx.filter = "none";
  return canvas;
}

export function defaultMobileCrop(naturalW: number, naturalH: number): MobileCrop {
  const targetRatio = 3 / 4;
  let width = naturalW;
  let height = Math.round(width / targetRatio);
  if (height > naturalH) {
    height = naturalH;
    width = Math.round(height * targetRatio);
  }
  return {
    left: Math.round((naturalW - width) / 2),
    top: Math.round((naturalH - height) / 2),
    width,
    height,
  };
}

/** Largest centered crop matching slideshow ratio (e.g. 16:9). */
export function defaultDesktopCrop(
  naturalW: number,
  naturalH: number,
  ratio = "16:9",
): DesktopCrop {
  const { w: rw, h: rh } = parseSlideshowRatio(ratio);
  const targetRatio = rw / rh;
  let width = naturalW;
  let height = Math.round(width / targetRatio);
  if (height > naturalH) {
    height = naturalH;
    width = Math.round(height * targetRatio);
  }
  return {
    left: Math.round((naturalW - width) / 2),
    top: Math.round((naturalH - height) / 2),
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

function extractCrop(
  source: HTMLCanvasElement,
  crop: MobileCrop,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, crop.width);
  canvas.height = Math.max(1, crop.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(
    source,
    crop.left,
    crop.top,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );
  return canvas;
}

/**
 * Produce desktop (from desktop crop) + mobile (from mobile crop) jpeg+webp.
 * Never upscales desktop. Applies CSS-equivalent filters during encode.
 */
export async function encodeSlideVariants(input: {
  file: Blob;
  slideId: string;
  version: string;
  crop: MobileCrop;
  desktopCrop?: DesktopCrop | null;
  desktopRatio?: string;
  filters?: ImageFilters;
  output?: SlideshowOutput;
  jpegQuality?: number;
  webpQuality?: number;
}): Promise<{ variants: EncodedSlideVariant[]; files: SlideFiles }> {
  const output = input.output ?? emptySlideshowOutput();
  const filters = input.filters ?? DEFAULT_FILTERS;
  const jpegQ = input.jpegQuality ?? output.desktop.quality / 100;
  const webpQ = input.webpQuality ?? output.desktop.quality / 100;
  const bitmap = await createImageBitmap(input.file, {
    imageOrientation: "from-image",
  } as ImageBitmapOptions);

  const variants: EncodedSlideVariant[] = [];
  const files: SlideFiles = { desktop: {}, mobile: {} };

  try {
    const filtered = applyFiltersToCanvas(bitmap, bitmap.width, bitmap.height, filters);
    const desktopCrop =
      input.desktopCrop ??
      defaultDesktopCrop(bitmap.width, bitmap.height, input.desktopRatio ?? "16:9");
    const desktopSource = extractCrop(filtered, desktopCrop);

    let desktopWidths = [output.desktop.width, output.mobileLandscape.width]
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .filter((w) => desktopSource.width >= w)
      .sort((a, b) => b - a);
    // Never upscale — but always keep at least one desktop file at crop width
    // so list/editor previews have a stable key.
    if (desktopWidths.length === 0 && desktopSource.width > 0) {
      desktopWidths = [desktopSource.width];
    }

    for (const w of desktopWidths) {
      const h = Math.max(1, Math.round((desktopSource.height / desktopSource.width) * w));
      const canvas = await resizeBitmap(desktopSource, w, h);
      const base = `slide-${input.slideId}.${input.version}-d-${w}`;
      const jpg = await canvasToBlob(canvas, "image/jpeg", jpegQ);
      const webp = await canvasToBlob(canvas, "image/webp", webpQ);
      variants.push({
        fileName: `${base}.jpg`,
        blob: jpg,
        contentType: "image/jpeg",
        bucket: "desktop",
        sizeKey: String(w),
        meta: { width: w, height: h },
      });
      variants.push({
        fileName: `${base}.webp`,
        blob: webp,
        contentType: "image/webp",
        bucket: "desktop",
        sizeKey: String(w),
        meta: { width: w, height: h },
      });
      files.desktop![String(w)] = { width: w, height: h };
    }

    const cropCanvas = extractCrop(filtered, input.crop);

    const portrait = output.mobilePortrait;
    const mediumW = Math.round(portrait.width * (2 / 3));
    const mediumH = Math.round(portrait.height * (2 / 3));
    const mobileTargets = [
      { w: portrait.width, h: portrait.height },
      { w: mediumW, h: mediumH },
    ].filter((t, i, arr) => arr.findIndex((x) => x.w === t.w) === i);

    for (const t of mobileTargets) {
      const canvas = await resizeBitmap(cropCanvas, t.w, t.h);
      const base = `slide-${input.slideId}.${input.version}-m-${t.w}`;
      const jpg = await canvasToBlob(canvas, "image/jpeg", jpegQ);
      const webp = await canvasToBlob(canvas, "image/webp", webpQ);
      variants.push({
        fileName: `${base}.jpg`,
        blob: jpg,
        contentType: "image/jpeg",
        bucket: "mobile",
        sizeKey: String(t.w),
        meta: { width: t.w, height: t.h },
      });
      variants.push({
        fileName: `${base}.webp`,
        blob: webp,
        contentType: "image/webp",
        bucket: "mobile",
        sizeKey: String(t.w),
        meta: { width: t.w, height: t.h },
      });
      files.mobile![String(t.w)] = { width: t.w, height: t.h };
    }
  } finally {
    bitmap.close();
  }

  return { variants, files };
}
