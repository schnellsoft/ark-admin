import { emptyLocaleMap, type LocaleMap } from "./i18n";
import {
  emptySlideshowSettings,
  normalizeSlideshowSettings,
  type SlideshowSettings,
  type SlideshowSlide,
} from "./slideshow-shared";

export const GALLERIES_INDEX_KEY = "galleries/galleries.json";
export const GALLERY_CONTENT_PREFIX = "galleries/";
export const GALLERY_MEDIA_PREFIX = "galleries/";

export type GalleryRow = {
  id: string;
  position: number;
  slug: string;
  name: LocaleMap;
  enabled: boolean;
  settings: SlideshowSettings;
};

export type GalleryDocument = {
  id: string;
  slug: string;
  name: LocaleMap;
  settings: SlideshowSettings;
  slides: Array<{
    id: string;
    position: number;
    title: string;
    alt: string;
    enabled: boolean;
    mediaKind: "image" | "video";
    version: string;
    files: SlideshowSlide["files"];
    desktopFocus: SlideshowSlide["desktopFocus"];
    filters: SlideshowSlide["filters"];
    layer: SlideshowSlide["layer"];
  }>;
  updatedAt: string;
};

export type GalleriesIndexDocument = {
  galleries: Array<{
    id: string;
    slug: string;
    position: number;
    name: LocaleMap;
    enabled: boolean;
  }>;
  updatedAt: string;
};

export function slugifyGallery(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "gallery"
  );
}

export function emptyGalleryRow(): Partial<GalleryRow> {
  return {
    position: 1,
    slug: "",
    name: emptyLocaleMap(),
    enabled: true,
    settings: emptySlideshowSettings(),
  };
}

export function validateGalleryDraft(
  draft: Partial<GalleryRow>,
): string | null {
  const name = draft.name;
  const hasName = Boolean(
    name?.ro?.trim() || name?.en?.trim() || name?.bg?.trim(),
  );
  if (!hasName) return "Name is required";
  const slug = (draft.slug ?? "").trim();
  if (!slug) return "Slug is required";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "Slug must be lowercase letters, numbers, and hyphens";
  }
  return null;
}

export function galleryMediaPrefix(galleryId: string, slideId: string): string {
  return `${GALLERY_MEDIA_PREFIX}${galleryId}/${slideId}/`;
}

export function galleryHtmlKey(
  galleryId: string,
  slideId: string,
  mobile = false,
): string {
  return mobile
    ? `${GALLERY_CONTENT_PREFIX}${galleryId}/html/${slideId}.mobile.html`
    : `${GALLERY_CONTENT_PREFIX}${galleryId}/html/${slideId}.html`;
}

export function galleryDocumentKey(slug: string): string {
  return `${GALLERY_CONTENT_PREFIX}${slug}/gallery.json`;
}

export function galleryThumbKey(
  galleryId: string,
  slide: SlideshowSlide,
): string | null {
  if (slide.files.video?.key) return slide.files.video.key;
  if (slide.files.sourceKey) return slide.files.sourceKey;
  const desktop = slide.files.desktop ?? {};
  const sizes = Object.keys(desktop)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (slide.version && sizes.length > 0) {
    const preferred = sizes.find((w) => w >= 640) ?? sizes[sizes.length - 1]!;
    return `${galleryMediaPrefix(galleryId, slide.id)}slide-${slide.id}.${slide.version}-d-${preferred}.jpg`;
  }
  if (slide.version) {
    return `${galleryMediaPrefix(galleryId, slide.id)}slide-${slide.id}.${slide.version}-source.jpg`;
  }
  return null;
}

export function parseGallerySettings(raw: string | null | undefined): SlideshowSettings {
  if (!raw?.trim()) return emptySlideshowSettings();
  try {
    return normalizeSlideshowSettings(JSON.parse(raw) as Partial<SlideshowSettings>);
  } catch {
    return emptySlideshowSettings();
  }
}
