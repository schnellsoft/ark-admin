import type { Locale, LocaleMap } from "./i18n";
import { emptyLocaleMap } from "./i18n";

export const SERVICES_CONTENT_KEY = "services/services.json";
export const SERVICES_PAGES_PREFIX = "services/pages/";
export const SERVICES_PDF_KEY = "services/price-list.pdf";
export const SERVICES_ICONS_PREFIX = "services/icons/";
export const SERVICES_MEDIA_PREFIX = "services/";

export type ServiceCategory = {
  id: string;
  position: number;
  slug: string;
  name: LocaleMap;
  icon_key: string;
  icon_svg: string;
  enabled: boolean;
};

export type ServiceSubcategory = {
  id: string;
  category_id: string;
  position: number;
  slug: string;
  name: LocaleMap;
  icon_svg: string;
  enabled: boolean;
};

export type ServiceRow = {
  id: string;
  position: number;
  slug: string;
  title: LocaleMap;
  category_id: string;
  subcategory_id: string | null;
  icon_id: string | null;
  icon_svg: string;
  price_text: string;
  currency: string;
  page_path: string;
  enabled: boolean;
};

export type ServicePageImage = {
  libraryAssetId: string | null;
  masterKey: string;
  webpKey: string | null;
  alt: LocaleMap;
};

export type ServicePage = {
  service_id: string;
  synopsis: LocaleMap;
  paragraphs: Record<Locale, string[]>;
  images: ServicePageImage[];
};

export type ServiceRecommended = {
  service_id: string;
  position: number;
};

/** Published catalog for Astro card browser */
export type ServicesCatalogDocument = {
  recommended: string[];
  categories: Array<{
    id: string;
    slug: string;
    position: number;
    name: LocaleMap;
    iconSvg: string;
    enabled: boolean;
  }>;
  subcategories: Array<{
    id: string;
    categoryId: string;
    slug: string;
    position: number;
    name: LocaleMap;
    iconSvg: string;
    enabled: boolean;
  }>;
  services: Array<{
    id: string;
    slug: string;
    position: number;
    title: LocaleMap;
    categoryId: string;
    subcategoryId: string | null;
    price: string;
    currency: string;
    iconSvg: string;
    pagePath: string;
    enabled: boolean;
  }>;
  pdfKey: string;
  updatedAt: string;
};

export type ServicePageDocument = {
  slug: string;
  title: LocaleMap;
  synopsis: LocaleMap;
  paragraphs: Record<Locale, string[]>;
  images: Array<{
    master: string;
    webp: string | null;
    alt: LocaleMap;
  }>;
  categoryId: string;
  subcategoryId: string | null;
  price: string;
  currency: string;
  iconSvg: string;
  pagePath: string;
};

export function slugifyService(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "service";
}

export function pagePathForSlug(slug: string): string {
  return `/services/${slug}`;
}

export function emptyServiceCategory(): Partial<ServiceCategory> {
  return {
    slug: "",
    name: emptyLocaleMap(),
    icon_key: "",
    icon_svg: "",
    enabled: true,
  };
}

export function emptyServiceSubcategory(
  categoryId = "",
): Partial<ServiceSubcategory> {
  return {
    category_id: categoryId,
    slug: "",
    name: emptyLocaleMap(),
    icon_svg: "",
    enabled: true,
  };
}

export function emptyServiceRow(categoryId = ""): Partial<ServiceRow> {
  return {
    slug: "",
    title: emptyLocaleMap(),
    category_id: categoryId,
    subcategory_id: null,
    icon_id: null,
    icon_svg: "",
    price_text: "",
    currency: "RON",
    page_path: "",
    enabled: true,
  };
}

export function emptyServicePage(serviceId: string): ServicePage {
  return {
    service_id: serviceId,
    synopsis: emptyLocaleMap(),
    paragraphs: { ro: [], en: [], bg: [] },
    images: [],
  };
}

export function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function priceToText(price: unknown): string {
  if (typeof price === "number" && Number.isFinite(price)) return String(price);
  if (typeof price === "string") return price.trim();
  return "";
}

export function validateCategoryDraft(draft: Partial<ServiceCategory>): string | null {
  const nameRo = draft.name?.ro?.trim() ?? "";
  const nameEn = draft.name?.en?.trim() ?? "";
  const nameBg = draft.name?.bg?.trim() ?? "";
  if (!nameRo && !nameEn && !nameBg) return "Name is required in at least one locale";
  const slug = (draft.slug ?? "").trim() || slugifyService(nameEn || nameRo || nameBg);
  if (!slug) return "Slug is required";
  return null;
}

export function validateSubcategoryDraft(
  draft: Partial<ServiceSubcategory>,
): string | null {
  if (!draft.category_id?.trim()) return "Category is required";
  return validateCategoryDraft(draft as Partial<ServiceCategory>);
}

export function validateServiceDraft(draft: Partial<ServiceRow>): string | null {
  if (!draft.category_id?.trim()) return "Category is required";
  const titleRo = draft.title?.ro?.trim() ?? "";
  const titleEn = draft.title?.en?.trim() ?? "";
  const titleBg = draft.title?.bg?.trim() ?? "";
  if (!titleRo && !titleEn && !titleBg) return "Title is required in at least one locale";
  const slug =
    (draft.slug ?? "").trim() ||
    slugifyService(titleEn || titleRo || titleBg);
  if (!slug) return "Slug is required";
  return null;
}
