import type { LocaleMap } from "./i18n";
import { emptyLocaleMap } from "./i18n";

export const ARTICLES_CONTENT_KEY = "articles/articles.json";

export type ArticleCategory = {
  id: string;
  position: number;
  slug: string;
  name: LocaleMap;
  icon_key: string;
  icon_svg: string;
  enabled: boolean;
};

export type ArticleSubcategory = {
  id: string;
  category_id: string;
  position: number;
  slug: string;
  name: LocaleMap;
  icon_svg: string;
  enabled: boolean;
};

export type ArticleRow = {
  id: string;
  position: number;
  slug: string;
  title: LocaleMap;
  category_id: string | null;
  subcategory_id: string | null;
  /** Optional publish / display datetime (ISO or datetime-local). Empty when unset. */
  datetime: string;
  enabled: boolean;
};

export type ArticlesCatalogDocument = {
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
  articles: Array<{
    id: string;
    slug: string;
    position: number;
    title: LocaleMap;
    categoryId: string | null;
    subcategoryId: string | null;
    datetime: string | null;
    enabled: boolean;
  }>;
  updatedAt: string;
};

export function slugifyArticle(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "article"
  );
}

export function emptyArticleCategory(): Partial<ArticleCategory> {
  return {
    slug: "",
    name: emptyLocaleMap(),
    icon_key: "",
    icon_svg: "",
    enabled: true,
  };
}

export function emptyArticleSubcategory(
  categoryId = "",
): Partial<ArticleSubcategory> {
  return {
    category_id: categoryId,
    slug: "",
    name: emptyLocaleMap(),
    icon_svg: "",
    enabled: true,
  };
}

export function emptyArticleRow(
  categoryId: string | null = null,
): Partial<ArticleRow> {
  return {
    slug: "",
    title: emptyLocaleMap(),
    category_id: categoryId,
    subcategory_id: null,
    datetime: "",
    enabled: true,
  };
}

export function validateArticleCategoryDraft(
  draft: Partial<ArticleCategory>,
): string | null {
  const nameRo = draft.name?.ro?.trim() ?? "";
  const nameEn = draft.name?.en?.trim() ?? "";
  const nameBg = draft.name?.bg?.trim() ?? "";
  if (!nameRo && !nameEn && !nameBg) {
    return "Name is required in at least one locale";
  }
  const slug =
    (draft.slug ?? "").trim() || slugifyArticle(nameEn || nameRo || nameBg);
  if (!slug) return "Slug is required";
  return null;
}

export function validateArticleSubcategoryDraft(
  draft: Partial<ArticleSubcategory>,
): string | null {
  if (!draft.category_id?.trim()) return "Category is required";
  return validateArticleCategoryDraft(draft as Partial<ArticleCategory>);
}

export function validateArticleDraft(
  draft: Partial<ArticleRow>,
): string | null {
  const titleRo = draft.title?.ro?.trim() ?? "";
  const titleEn = draft.title?.en?.trim() ?? "";
  const titleBg = draft.title?.bg?.trim() ?? "";
  if (!titleRo && !titleEn && !titleBg) {
    return "Article title is required";
  }
  const slug =
    (draft.slug ?? "").trim() ||
    slugifyArticle(titleEn || titleRo || titleBg);
  if (!slug) return "Slug is required";
  return null;
}

/** Normalize datetime-local / ISO / free text; empty stays empty. */
export function normalizeArticleDatetime(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  return raw;
}
