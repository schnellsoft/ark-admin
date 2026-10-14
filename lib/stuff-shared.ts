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

export type StuffMember = {
  id: string;
  position: number;
  slug: string;
  name: LocaleMap;
  role: LocaleMap;
  snippet: LocaleMap;
  category_id: string;
  subcategory_id: string | null;
  portrait_library_id: string | null;
  portrait_master_key: string;
  portrait_webp_key: string | null;
  portrait_800_key: string | null;
  enabled: boolean;
};

/** Published catalog for the static site */
export type StuffCatalogDocument = {
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
  members: Array<{
    id: string;
    slug: string;
    position: number;
    name: LocaleMap;
    role: LocaleMap;
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
      .slice(0, 120) || "member"
  );
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

export function emptyStuffMember(categoryId = ""): Partial<StuffMember> {
  return {
    slug: "",
    name: emptyLocaleMap(),
    role: emptyLocaleMap(),
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
  const slug =
    (draft.slug ?? "").trim() || slugifyStuff(nameEn || nameRo || nameBg);
  if (!slug) return "Slug is required";
  return null;
}

export function validateStuffSubcategoryDraft(
  draft: Partial<StuffSubcategory>,
): string | null {
  if (!draft.category_id?.trim()) return "Category is required";
  return validateStuffCategoryDraft(draft as Partial<StuffCategory>);
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
  const slug =
    (draft.slug ?? "").trim() || slugifyStuff(nameEn || nameRo || nameBg);
  if (!slug) return "Slug is required";
  return null;
}
