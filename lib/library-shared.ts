export const LIBRARY_CONTENT_KEY = "library/library.json";
export const LIBRARY_MEDIA_PREFIX = "library/";
export const UNSPECIFIED_CATEGORY_ID = "unspecified";
export const UNSPECIFIED_CATEGORY_NAME = "Unspecified";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

export type LibraryAssetKind = "image" | "video";

export type LibrarySettings = {
  maxWidth: number;
  convertToWebp: boolean;
  jpegQuality: number;
  webpQuality: number;
  maxBytes: number;
  maxVideoBytes: number;
  maxFilesPerBatch: number;
};

export type LibraryCategory = {
  id: string;
  name: string;
  position: number;
  is_system: boolean;
};

export type LibraryImage = {
  id: string;
  name: string;
  alt: string;
  kind: LibraryAssetKind;
  master_key: string;
  master_content_type: string;
  webp_key: string | null;
  /** Optional long-edge ≤800 portrait sibling (WebP). */
  portrait_800_key: string | null;
  width: number;
  height: number;
  bytes: number;
  position: number;
  categoryIds: string[];
};

export type LibraryDocument = {
  settings: LibrarySettings;
  categories: Array<{ id: string; name: string; position: number }>;
  images: Array<{
    id: string;
    name: string;
    alt: string;
    kind: LibraryAssetKind;
    master: string;
    webp: string | null;
    portrait800: string | null;
    width: number;
    height: number;
    bytes: number;
    position: number;
    categoryIds: string[];
  }>;
};

export function emptyLibrarySettings(): LibrarySettings {
  return {
    maxWidth: 1920,
    convertToWebp: true,
    jpegQuality: 0.85,
    webpQuality: 0.82,
    maxBytes: 15 * 1024 * 1024,
    maxVideoBytes: 80 * 1024 * 1024,
    maxFilesPerBatch: 20,
  };
}

export function extensionForContentType(contentType: string): string {
  const ct = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (ct === "image/jpeg" || ct === "image/jpg") return "jpg";
  if (ct === "image/png") return "png";
  if (ct === "image/webp") return "webp";
  if (ct === "video/mp4") return "mp4";
  if (ct === "video/webm") return "webm";
  return "bin";
}

export function normalizeLibraryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeLibraryAlt(alt: string): string {
  return alt.trim().replace(/\s+/g, " ").slice(0, 500);
}

/** Basename without extension, filesystem-safe-ish for library display names. */
export function suggestLibraryNameFromFile(fileName: string): string {
  const base = fileName.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  const cleaned = base
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");
  return cleaned.slice(0, 160) || `asset-${Date.now()}`;
}

export function validateLibraryImageDraft(draft: Partial<LibraryImage>): string | null {
  const name = normalizeLibraryName(draft.name ?? "");
  if (!name) return "Name is required";
  if (name.length > 200) return "Name is too long";
  if ((draft.alt ?? "").length > 500) return "ALT is too long";
  if (!draft.master_key) return "Use the upload zone to add images";
  return null;
}

export function validateLibraryCategoryDraft(
  draft: Partial<LibraryCategory>,
  options?: { allowSystemRename?: boolean },
): string | null {
  const name = normalizeLibraryName(draft.name ?? "");
  if (!name) return "Category name is required";
  if (name.length > 120) return "Category name is too long";
  if (
    draft.id === UNSPECIFIED_CATEGORY_ID &&
    !options?.allowSystemRename &&
    name.toLowerCase() !== UNSPECIFIED_CATEGORY_NAME.toLowerCase()
  ) {
    return "Unspecified cannot be renamed";
  }
  return null;
}

export function ensureCategoryIds(categoryIds: string[] | undefined | null): string[] {
  const unique = [...new Set((categoryIds ?? []).filter(Boolean))];
  if (unique.length === 0) return [UNSPECIFIED_CATEGORY_ID];
  return unique;
}

export function buildLibraryDocument(
  settings: LibrarySettings,
  categories: LibraryCategory[],
  images: LibraryImage[],
): LibraryDocument {
  return {
    settings: { ...settings },
    categories: [...categories]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name, position: c.position })),
    images: [...images]
      .sort((a, b) => a.position - b.position)
      .map((img) => ({
        id: img.id,
        name: img.name,
        alt: img.alt ?? "",
        kind: img.kind === "video" ? "video" : "image",
        master: img.master_key,
        webp: img.webp_key,
        portrait800: img.portrait_800_key ?? null,
        width: img.width,
        height: img.height,
        bytes: img.bytes,
        position: img.position,
        categoryIds: ensureCategoryIds(img.categoryIds),
      })),
  };
}

export function clampQuality(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0.05, value));
}

export function normalizeLibrarySettings(
  partial: Partial<LibrarySettings> | null | undefined,
): LibrarySettings {
  const base = emptyLibrarySettings();
  if (!partial) return base;
  const maxWidth = Math.round(Number(partial.maxWidth));
  const maxBytes = Math.round(Number(partial.maxBytes));
  const maxVideoBytes = Math.round(Number(partial.maxVideoBytes));
  const maxFiles = Math.round(Number(partial.maxFilesPerBatch));
  return {
    maxWidth:
      Number.isFinite(maxWidth) && maxWidth > 0 && maxWidth <= 10000
        ? maxWidth
        : base.maxWidth,
    convertToWebp: Boolean(partial.convertToWebp),
    jpegQuality: clampQuality(Number(partial.jpegQuality), base.jpegQuality),
    webpQuality: clampQuality(Number(partial.webpQuality), base.webpQuality),
    maxBytes:
      Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : base.maxBytes,
    maxVideoBytes:
      Number.isFinite(maxVideoBytes) && maxVideoBytes > 0
        ? maxVideoBytes
        : base.maxVideoBytes,
    maxFilesPerBatch:
      Number.isFinite(maxFiles) && maxFiles > 0 && maxFiles <= 100
        ? maxFiles
        : base.maxFilesPerBatch,
  };
}
