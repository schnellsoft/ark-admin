import {
  ACCEPTED_IMAGE_TYPES,
  type LibrarySettings,
} from "./library-shared";

export type PreparedLibraryImage = {
  id: string;
  masterBlob: Blob;
  masterContentType: string;
  webpBlob: Blob | null;
  width: number;
  height: number;
  sourceName: string;
};

const acceptedExtensions = /\.(jpe?g|png|webp)$/i;

export function isAcceptedLibraryImage(file: File): boolean {
  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return true;
  }
  if (!file.type && acceptedExtensions.test(file.name)) return true;
  return false;
}

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
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

/**
 * Resize to max width (preserve aspect). Encodes master in original family
 * (jpeg/png/webp) and optionally a WebP sibling when convertToWebp is on
 * and master is not already WebP.
 */
export async function prepareLibraryImage(
  file: File,
  settings: LibrarySettings,
): Promise<PreparedLibraryImage> {
  if (!isAcceptedLibraryImage(file)) {
    throw new Error("Choose JPG, PNG, or WebP images.");
  }
  if (file.size > settings.maxBytes) {
    throw new Error(
      `Each image must be ${Math.round(settings.maxBytes / (1024 * 1024))} MB or smaller.`,
    );
  }

  const bitmap = await loadImageBitmap(file);
  try {
    const maxWidth = settings.maxWidth;
    const scale =
      bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    ctx.drawImage(bitmap, 0, 0, width, height);

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

    return {
      id: crypto.randomUUID(),
      masterBlob,
      masterContentType: masterType,
      webpBlob,
      width,
      height,
      sourceName: file.name,
    };
  } finally {
    bitmap.close();
  }
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
