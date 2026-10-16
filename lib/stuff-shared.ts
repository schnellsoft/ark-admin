import type { LocaleMap } from "./i18n";
import { emptyLocaleMap } from "./i18n";

export const STUFF_CONTENT_KEY = "stuff/stuff.json";
export const STUFF_PORTRAIT_MAX_EDGE = 800;

export type StuffCategory = {
  id: string;
  position: number;
  slug: string;
  name: LocaleMap;
  icon_key: string;
  icon_svg: string;
  enabled: boolean;
};

export type StuffSubcategory = {
  id: string;
  category_id: string;
  position: number;
  slug: string;
  name: LocaleMap;
  icon_svg: string;
  enabled: boolean;
};

/** Shared shape for Roles / Specialties / Provided services catalogs. */
export type StuffNamedCatalog = {
  id: string;
  position: number;
  name: LocaleMap;
  enabled: boolean;
};

export type StuffRole = StuffNamedCatalog;
export type StuffSpecialty = StuffNamedCatalog;
export type StuffProvidedService = StuffNamedCatalog;

export type StuffMember = {
  id: string;
  position: number;
  slug: string;
  name: LocaleMap;
  /** @deprecated Prefer role_id; kept for publish fallback display. */
  role: LocaleMap;
  /** @deprecated Prefer specialty_id; kept for publish fallback display. */
  specialty: LocaleMap;
  role_id: string | null;
  specialty_id: string | null;
  doctor_title: boolean;
  college: string;
  provided_service_ids: string[];
  snippet: LocaleMap;
  category_id: string;
  subcategory_id: string | null;
  portrait_library_id: string | null;
  portrait_master_key: string;
  portrait_webp_key: string | null;
  portrait_800_key: string | null;
  enabled: boolean;
};

export type StuffSpotlightSettings = {
  autoplay: boolean;
  delayMs: number;
  stopOnHover: boolean;
};

export function emptyStuffSpotlightSettings(): StuffSpotlightSettings {
  return {
    autoplay: true,
    delayMs: 3000,
    stopOnHover: true,
  };
}

export function normalizeStuffSpotlightSettings(
  partial: Partial<StuffSpotlightSettings> | null | undefined,
): StuffSpotlightSettings {
  const base = emptyStuffSpotlightSettings();
  if (!partial) return base;
  const delay = Math.round(Number(partial.delayMs));
  return {
    autoplay: partial.autoplay !== false,
    delayMs: Number.isFinite(delay) && delay >= 500 ? delay : base.delayMs,
    stopOnHover: partial.stopOnHover !== false,
  };
}

/** Published catalog for the static site */
export type StuffCatalogDocument = {
  spotlight: StuffSpotlightSettings;
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
  roles: Array<{
    id: string;
    position: number;
    name: LocaleMap;
    enabled: boolean;
  }>;
  specialties: Array<{
    id: string;
    position: number;
    name: LocaleMap;
    enabled: boolean;
  }>;
  providedServices: Array<{
    id: string;
    position: number;
    name: LocaleMap;
    enabled: boolean;
  }>;
  members: Array<{
    id: string;
    slug: string;
    position: number;
    name: LocaleMap;
    roleId: string | null;
    specialtyId: string | null;
    role: LocaleMap;
    specialty: LocaleMap;
    doctorTitle: boolean;
    college: string;
    providedServiceIds: string[];
    snippet: LocaleMap;
    categoryId: string;
    subcategoryId: string | null;
    portrait: {
      libraryId: string | null;
      master: string | null;
      webp: string | null;
      portrait800: string | null;
    };
    enabled: boolean;
  }>;
  updatedAt: string;
};

export function slugifyStuff(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "member"
  );
}

/** 10 hex digits (0-9a-f) for unique slug suffixes. */
export function randomHex10(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Slug from name + random 10-hex suffix when the field is empty. */
export function autoStuffSlug(name: LocaleMap | string): string {
  const raw =
    typeof name === "string"
      ? name
      : name.en?.trim() || name.ro?.trim() || name.bg?.trim() || "";
  return `${slugifyStuff(raw)}-${randomHex10()}`;
}

/** @deprecated Prefer autoStuffSlug */
export function autoStuffMemberSlug(name: LocaleMap | string): string {
  return autoStuffSlug(name);
}

export function autoStuffCategorySlug(name: LocaleMap | string): string {
  return autoStuffSlug(name);
}

export function emptyStuffCategory(): Partial<StuffCategory> {
  return {
    slug: "",
    name: emptyLocaleMap(),
    icon_key: "",
    icon_svg: "",
    enabled: true,
  };
}

export function emptyStuffSubcategory(
  categoryId = "",
): Partial<StuffSubcategory> {
  return {
    category_id: categoryId,
    slug: "",
    name: emptyLocaleMap(),
    icon_svg: "",
    enabled: true,
  };
}

export function emptyStuffNamedCatalog(): Partial<StuffNamedCatalog> {
  return {
    name: emptyLocaleMap(),
    enabled: true,
  };
}

export function emptyStuffMember(categoryId = ""): Partial<StuffMember> {
  return {
    slug: "",
    name: emptyLocaleMap(),
    role: emptyLocaleMap(),
    specialty: emptyLocaleMap(),
    role_id: null,
    specialty_id: null,
    doctor_title: false,
    college: "",
    provided_service_ids: [],
    snippet: emptyLocaleMap(),
    category_id: categoryId,
    subcategory_id: null,
    portrait_library_id: null,
    portrait_master_key: "",
    portrait_webp_key: null,
    portrait_800_key: null,
    enabled: true,
  };
}

export function validateStuffCategoryDraft(
  draft: Partial<StuffCategory>,
): string | null {
  const nameRo = draft.name?.ro?.trim() ?? "";
  const nameEn = draft.name?.en?.trim() ?? "";
  const nameBg = draft.name?.bg?.trim() ?? "";
  if (!nameRo && !nameEn && !nameBg) {
    return "Name is required in at least one locale";
  }
  if (!(draft.slug ?? "").trim()) return "Slug is required";
  return null;
}

export function validateStuffSubcategoryDraft(
  draft: Partial<StuffSubcategory>,
): string | null {
  if (!draft.category_id?.trim()) return "Category is required";
  return validateStuffCategoryDraft(draft as Partial<StuffCategory>);
}

export function validateStuffNamedCatalogDraft(
  draft: Partial<StuffNamedCatalog>,
): string | null {
  const nameRo = draft.name?.ro?.trim() ?? "";
  const nameEn = draft.name?.en?.trim() ?? "";
  const nameBg = draft.name?.bg?.trim() ?? "";
  if (!nameRo && !nameEn && !nameBg) {
    return "Name is required in at least one locale";
  }
  return null;
}

export function validateStuffMemberDraft(
  draft: Partial<StuffMember>,
): string | null {
  if (!draft.category_id?.trim()) return "Category is required";
  const nameRo = draft.name?.ro?.trim() ?? "";
  const nameEn = draft.name?.en?.trim() ?? "";
  const nameBg = draft.name?.bg?.trim() ?? "";
  if (!nameRo && !nameEn && !nameBg) {
    return "Name is required in at least one locale";
  }
  if (!(draft.slug ?? "").trim()) return "Slug is required";
  return null;
}

export function catalogLabel(
  row: { name: LocaleMap } | undefined | null,
  locale: keyof LocaleMap,
): string {
  if (!row) return "";
  return row.name[locale]?.trim() || row.name.ro?.trim() || row.name.en?.trim() || "";
}
