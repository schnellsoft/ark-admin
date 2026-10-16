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

/** List-card snippet shown on the site (template: title + image + date + text). */
export type ArticleSnippet = {
  title: LocaleMap;
  text: LocaleMap;
  date: string;
  library_id: string | null;
  master_key: string;
  webp_key: string | null;
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
  snippet: ArticleSnippet;
  enabled: boolean;
};

/** Per-locale HTML bodies stored in `article_pages`. */
export type ArticlePage = {
  article_id: string;
  body: LocaleMap;
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
    snippet: {
      title: LocaleMap;
      text: LocaleMap;
      date: string | null;
      image: {
        libraryId: string | null;
        master: string | null;
        webp: string | null;
      };
    };
    enabled: boolean;
  }>;
  updatedAt: string;
};

export function emptyArticleSnippet(): ArticleSnippet {
  return {
    title: emptyLocaleMap(),
    text: emptyLocaleMap(),
    date: "",
    library_id: null,
    master_key: "",
    webp_key: null,
  };
}

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
    snippet: emptyArticleSnippet(),
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

  const snippet = draft.snippet ?? emptyArticleSnippet();
  const snTitle =
    snippet.title?.ro?.trim() ||
    snippet.title?.en?.trim() ||
    snippet.title?.bg?.trim() ||
    titleRo ||
    titleEn ||
    titleBg;
  if (!snTitle) return "Snippet title is required";
  const snText =
    snippet.text?.ro?.trim() ||
    snippet.text?.en?.trim() ||
    snippet.text?.bg?.trim();
  if (!snText) return "Snippet text is required";
  if (!(snippet.master_key || "").trim() && !(snippet.webp_key || "").trim()) {
    return "Snippet image is required";
  }
  return null;
}

/** Normalize datetime-local / ISO / free text; empty stays empty. */
export function normalizeArticleDatetime(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  return raw;
}
