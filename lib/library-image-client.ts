import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  type LibrarySettings,
} from "./library-shared";

export type PrepareLibraryImageOptions = {
  /** Long-edge max for an extra portrait WebP sibling (e.g. staff portraits). */
  portraitMaxEdge?: number;
};

export type PreparedLibraryImage = {
  id: string;
  masterBlob: Blob;
  masterContentType: string;
  webpBlob: Blob | null;
  portrait800Blob: Blob | null;
  width: number;
  height: number;
  sourceName: string;
  kind: "image" | "video";
};

const acceptedImageExtensions = /\.(jpe?g|png|webp)$/i;
const acceptedVideoExtensions = /\.(mp4|webm)$/i;

export function isAcceptedLibraryImage(file: File): boolean {
  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return true;
  }
  if (!file.type && acceptedImageExtensions.test(file.name)) return true;
  return false;
}

export function isAcceptedLibraryVideo(file: File): boolean {
  if ((ACCEPTED_VIDEO_TYPES as readonly string[]).includes(file.type)) {
    return true;
  }
  if (!file.type && acceptedVideoExtensions.test(file.name)) return true;
  return false;
}

export function isAcceptedLibraryFile(file: File): boolean {
  return isAcceptedLibraryImage(file) || isAcceptedLibraryVideo(file);
}

type DecodedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, dw: number, dh: number) => void;
  close: () => void;
};

function loadViaImageElement(file: File): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read image dimensions"));
        return;
      }
      resolve({
        width,
        height,
        draw: (ctx, dw, dh) => {
          ctx.drawImage(img, 0, 0, dw, dh);
        },
        close: () => {
          URL.revokeObjectURL(url);
          img.removeAttribute("src");
        },
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Browser could not decode this image"));
    };
    img.src = url;
  });
}

async function loadViaImageBitmap(
  file: File,
  resizeWidth?: number,
): Promise<DecodedImage> {
  const opts: ImageBitmapOptions = {
    imageOrientation: "from-image",
    resizeQuality: "high",
  };
  if (typeof resizeWidth === "number" && resizeWidth > 0) {
    opts.resizeWidth = resizeWidth;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, opts);
  } catch {
    const fallback: ImageBitmapOptions = { resizeQuality: "high" };
    if (typeof resizeWidth === "number" && resizeWidth > 0) {
      fallback.resizeWidth = resizeWidth;
    }
    bitmap = await createImageBitmap(file, fallback);
  }
  return {
    width: bitmap.width,
    height: bitmap.height,
    draw: (ctx, dw, dh) => {
      ctx.drawImage(bitmap, 0, 0, dw, dh);
    },
    close: () => {
      bitmap.close();
    },
  };
}

/**
 * Prefer createImageBitmap (orientation-aware), decoding already capped by
 * max width for large camera JPEGs. Fall back to HTMLImageElement.
 */
async function loadDecodedImage(
  file: File,
  resizeWidth?: number,
): Promise<DecodedImage> {
  try {
    return await loadViaImageBitmap(file, resizeWidth);
  } catch (err) {
    try {
      return await loadViaImageElement(file);
    } catch {
      throw err instanceof Error
        ? err
        : new Error("Browser could not decode this image");
    }
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode image"));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function masterMimeFromFile(file: File): "image/jpeg" | "image/png" | "image/webp" {
  const type = (file.type || "").toLowerCase();
  if (type === "image/png") return "image/png";
  if (type === "image/webp") return "image/webp";
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function fitWithin(
  srcW: number,
  srcH: number,
  maxEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(srcW, srcH);
  const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

/**
 * Resize to library max width (preserve aspect). Encodes master in original family
 * (jpeg/png/webp) and optionally a WebP sibling when convertToWebp is on
 * and master is not already WebP.
 */
export async function prepareLibraryImage(
  file: File,
  settings: LibrarySettings,
  options?: PrepareLibraryImageOptions,
): Promise<PreparedLibraryImage> {
  if (!isAcceptedLibraryImage(file)) {
    throw new Error("Choose JPG, PNG, or WebP images.");
  }
  if (file.size > settings.maxBytes) {
    throw new Error(
      `Each image must be ${Math.round(settings.maxBytes / (1024 * 1024))} MB or smaller.`,
    );
  }

  // Decode already width-capped so 12–20 MP camera JPEGs never sit full-res in memory.
  const decodeCap = Math.min(settings.maxWidth, 4096);
  const decoded = await loadDecodedImage(file, decodeCap);
  try {
    const sized = fitWithin(decoded.width, decoded.height, 4096);
    const width = sized.width;
    const height = sized.height;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    decoded.draw(ctx, width, height);

    const masterType = masterMimeFromFile(file);
    const masterQuality =
      masterType === "image/png" ? undefined : settings.jpegQuality;
    const masterBlob = await canvasToBlob(
      canvas,
      masterType,
      masterQuality ?? 0.92,
    );

    let webpBlob: Blob | null = null;
    if (settings.convertToWebp && masterType !== "image/webp") {
      webpBlob = await canvasToBlob(canvas, "image/webp", settings.webpQuality);
    }

    let portrait800Blob: Blob | null = null;
    const portraitMax = options?.portraitMaxEdge;
    if (
      typeof portraitMax === "number" &&
      Number.isFinite(portraitMax) &&
      portraitMax > 0
    ) {
      const portrait = fitWithin(width, height, portraitMax);
      const pCanvas = document.createElement("canvas");
      pCanvas.width = portrait.width;
      pCanvas.height = portrait.height;
      const pCtx = pCanvas.getContext("2d");
      if (!pCtx) throw new Error("Canvas is not available");
      // Scale from already-resized master canvas (lower memory than full original).
      pCtx.drawImage(canvas, 0, 0, portrait.width, portrait.height);
      portrait800Blob = await canvasToBlob(
        pCanvas,
        "image/webp",
        settings.webpQuality,
      );
    }

    return {
      id: crypto.randomUUID(),
      masterBlob,
      masterContentType: masterType,
      webpBlob,
      portrait800Blob,
      width,
      height,
      sourceName: file.name,
      kind: "image",
    };
  } finally {
    decoded.close();
  }
}

/** Pass-through for video (no transcoding on free tier). */
export async function prepareLibraryVideo(
  file: File,
  settings: LibrarySettings,
): Promise<PreparedLibraryImage> {
  if (!isAcceptedLibraryVideo(file)) {
    throw new Error("Choose MP4 or WebM videos.");
  }
  if (file.size > settings.maxVideoBytes) {
    throw new Error(
      `Each video must be ${Math.round(settings.maxVideoBytes / (1024 * 1024))} MB or smaller.`,
    );
  }
  const type =
    file.type === "video/webm"
      ? "video/webm"
      : file.name.toLowerCase().endsWith(".webm")
        ? "video/webm"
        : "video/mp4";
  return {
    id: crypto.randomUUID(),
    masterBlob: file,
    masterContentType: type,
    webpBlob: null,
    portrait800Blob: null,
    width: 0,
    height: 0,
    sourceName: file.name,
    kind: "video",
  };
}

export function uploadLibraryImageWithProgress(
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<{ image?: unknown; error?: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/site/media/library/upload");
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      }
    });
    request.upload.addEventListener("load", () => onProgress(100));
    request.addEventListener("load", () => {
      const result = (request.response || {}) as {
        image?: unknown;
        error?: string;
      };
      if (request.status >= 200 && request.status < 300) {
        resolve(result);
      } else if (request.status === 413) {
        reject(
          new Error(
            "Upload too large for the server limit. Try a smaller image or raise serverActions.bodySizeLimit.",
          ),
        );
      } else {
        reject(new Error(result.error || "Upload failed."));
      }
    });
    request.addEventListener("error", () =>
      reject(new Error("Could not reach the server.")),
    );
    request.addEventListener("abort", () =>
      reject(new Error("Upload cancelled.")),
    );
    request.send(form);
  });
}

/** Build a long-edge WebP (and optional full WebP) from an existing library file URL. */
export async function encodePortraitVariantsFromUrl(
  sourceUrl: string,
  settings: LibrarySettings,
  portraitMaxEdge: number,
): Promise<{ webpBlob: Blob | null; portrait800Blob: Blob }> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error("Could not load library image");
  const blob = await res.blob();
  const file = new File([blob], "library-source", {
    type: blob.type || "image/jpeg",
  });
  const prepared = await prepareLibraryImage(file, settings, {
    portraitMaxEdge,
  });
  if (!prepared.portrait800Blob) {
    throw new Error("Could not encode portrait variant");
  }
  return {
    webpBlob: prepared.webpBlob,
    portrait800Blob: prepared.portrait800Blob,
  };
}

export function uploadLibraryVariantsWithProgress(
  form: FormData,
  onProgress?: (percent: number) => void,
): Promise<{ image?: unknown; error?: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/site/media/library/variants");
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      }
    });
    request.addEventListener("load", () => {
      const result = (request.response || {}) as {
        image?: unknown;
        error?: string;
      };
      if (request.status >= 200 && request.status < 300) {
        resolve(result);
      } else {
        reject(new Error(result.error || "Variant upload failed."));
      }
    });
    request.addEventListener("error", () =>
      reject(new Error("Could not reach the server.")),
    );
    request.send(form);
  });
}
