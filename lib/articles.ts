import { getEnv } from "./env";
import { emptyLocaleMap } from "./i18n";
import {
  ARTICLES_CONTENT_KEY,
  articlePageDocumentKey,
  emptyArticleSnippet,
  normalizeArticleDatetime,
  rewriteArticleHtmlForSite,
  slugifyArticle,
  type ArticleCategory,
  type ArticleFirstPageSlot,
  type ArticlePage,
  type ArticleRow,
  type ArticleSubcategory,
  type ArticlesCatalogDocument,
} from "./articles-shared";

type CategoryDb = {
  id: string;
  position: number;
  slug: string;
  name_ro: string;
  name_en: string;
  name_bg: string;
  icon_key: string;
  icon_svg: string;
  enabled: number;
};

type SubcategoryDb = {
  id: string;
  category_id: string;
  position: number;
  slug: string;
  name_ro: string;
  name_en: string;
  name_bg: string;
  icon_svg: string;
  enabled: number;
};

type ArticleDb = {
  id: string;
  position: number;
  slug: string;
  title_ro: string;
  title_en: string;
  title_bg: string;
  category_id: string | null;
  subcategory_id: string | null;
  published_at: string;
  snippet_title_ro?: string;
  snippet_title_en?: string;
  snippet_title_bg?: string;
  snippet_text_ro?: string;
  snippet_text_en?: string;
  snippet_text_bg?: string;
  snippet_date?: string;
  snippet_library_id?: string | null;
  snippet_master_key?: string;
  snippet_webp_key?: string | null;
  enabled: number;
};

function mapCategory(row: CategoryDb): ArticleCategory {
  return {
    id: row.id,
    position: row.position,
    slug: row.slug,
    name: { ro: row.name_ro, en: row.name_en, bg: row.name_bg },
    icon_key: row.icon_key ?? "",
    icon_svg: row.icon_svg ?? "",
    enabled: Boolean(row.enabled),
  };
}

function mapSubcategory(row: SubcategoryDb): ArticleSubcategory {
  return {
    id: row.id,
    category_id: row.category_id,
    position: row.position,
    slug: row.slug,
    name: { ro: row.name_ro, en: row.name_en, bg: row.name_bg },
    icon_svg: row.icon_svg ?? "",
    enabled: Boolean(row.enabled),
  };
}

function mapArticle(row: ArticleDb): ArticleRow {
  return {
    id: row.id,
    position: row.position,
    slug: row.slug,
    title: { ro: row.title_ro, en: row.title_en, bg: row.title_bg },
    category_id: row.category_id,
    subcategory_id: row.subcategory_id,
    datetime: row.published_at ?? "",
    snippet: {
      title: {
        ro: row.snippet_title_ro ?? "",
        en: row.snippet_title_en ?? "",
        bg: row.snippet_title_bg ?? "",
      },
      text: {
        ro: row.snippet_text_ro ?? "",
        en: row.snippet_text_en ?? "",
        bg: row.snippet_text_bg ?? "",
      },
      date: row.snippet_date ?? "",
      library_id: row.snippet_library_id ?? null,
      master_key: row.snippet_master_key ?? "",
      webp_key: row.snippet_webp_key ?? null,
    },
    enabled: Boolean(row.enabled),
  };
}

export type ArticleSlugScope = "article" | "category" | "subcategory";

export async function isArticleSlugUnique(
  slug: string,
  excludeId?: string,
  scope: ArticleSlugScope = "article",
  categoryId?: string,
): Promise<boolean> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return false;
  const { SITE_DB } = getEnv();

  if (scope === "category") {
    if (excludeId) {
      const row = await SITE_DB.prepare(
        `SELECT id FROM article_categories WHERE lower(slug) = ? AND id != ? LIMIT 1`,
      )
        .bind(normalized, excludeId)
        .first<{ id: string }>();
      return !row;
    }
    const row = await SITE_DB.prepare(
      `SELECT id FROM article_categories WHERE lower(slug) = ? LIMIT 1`,
    )
      .bind(normalized)
      .first<{ id: string }>();
    return !row;
  }

  if (scope === "subcategory") {
    if (categoryId) {
      if (excludeId) {
        const row = await SITE_DB.prepare(
          `SELECT id FROM article_subcategories
           WHERE lower(slug) = ? AND category_id = ? AND id != ? LIMIT 1`,
        )
          .bind(normalized, categoryId, excludeId)
          .first<{ id: string }>();
        return !row;
      }
      const row = await SITE_DB.prepare(
        `SELECT id FROM article_subcategories
         WHERE lower(slug) = ? AND category_id = ? LIMIT 1`,
      )
        .bind(normalized, categoryId)
        .first<{ id: string }>();
      return !row;
    }
    if (excludeId) {
      const row = await SITE_DB.prepare(
        `SELECT id FROM article_subcategories WHERE lower(slug) = ? AND id != ? LIMIT 1`,
      )
        .bind(normalized, excludeId)
        .first<{ id: string }>();
      return !row;
    }
    const row = await SITE_DB.prepare(
      `SELECT id FROM article_subcategories WHERE lower(slug) = ? LIMIT 1`,
    )
      .bind(normalized)
      .first<{ id: string }>();
    return !row;
  }

  if (excludeId) {
    const row = await SITE_DB.prepare(
      `SELECT id FROM articles WHERE lower(slug) = ? AND id != ? LIMIT 1`,
    )
      .bind(normalized, excludeId)
      .first<{ id: string }>();
    return !row;
  }
  const row = await SITE_DB.prepare(
    `SELECT id FROM articles WHERE lower(slug) = ? LIMIT 1`,
  )
    .bind(normalized)
    .first<{ id: string }>();
  return !row;
}

export async function listArticleCategories(): Promise<ArticleCategory[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT id, position, slug, name_ro, name_en, name_bg, icon_key, icon_svg, enabled
     FROM article_categories ORDER BY position ASC`,
  ).all<CategoryDb>();
  return (results ?? []).map(mapCategory);
}

export async function listArticleSubcategories(
  categoryId?: string,
): Promise<ArticleSubcategory[]> {
  const { SITE_DB } = getEnv();
  if (categoryId) {
    const { results } = await SITE_DB.prepare(
      `SELECT id, category_id, position, slug, name_ro, name_en, name_bg, icon_svg, enabled
       FROM article_subcategories WHERE category_id = ? ORDER BY position ASC`,
    )
      .bind(categoryId)
      .all<SubcategoryDb>();
    return (results ?? []).map(mapSubcategory);
  }
  const { results } = await SITE_DB.prepare(
    `SELECT id, category_id, position, slug, name_ro, name_en, name_bg, icon_svg, enabled
     FROM article_subcategories ORDER BY category_id, position ASC`,
  ).all<SubcategoryDb>();
  return (results ?? []).map(mapSubcategory);
}

const ARTICLE_SELECT = `SELECT id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id,
            published_at,
            snippet_title_ro, snippet_title_en, snippet_title_bg,
            snippet_text_ro, snippet_text_en, snippet_text_bg,
            snippet_date, snippet_library_id, snippet_master_key, snippet_webp_key,
            enabled
     FROM articles`;

export async function listArticles(): Promise<ArticleRow[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `${ARTICLE_SELECT} ORDER BY position ASC`,
  ).all<ArticleDb>();
  return (results ?? []).map(mapArticle);
}

export async function getArticle(id: string): Promise<ArticleRow | null> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(`${ARTICLE_SELECT} WHERE id = ?`)
    .bind(id)
    .first<ArticleDb>();
  return row ? mapArticle(row) : null;
}

type ArticlePageDb = {
  article_id: string;
  body_html_ro: string;
  body_html_en: string;
  body_html_bg: string;
};

export async function getArticlePage(articleId: string): Promise<ArticlePage> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT article_id, body_html_ro, body_html_en, body_html_bg
     FROM article_pages WHERE article_id = ?`,
  )
    .bind(articleId)
    .first<ArticlePageDb>();
  if (!row) {
    return {
      article_id: articleId,
      body: emptyLocaleMap(),
    };
  }
  return {
    article_id: row.article_id,
    body: {
      ro: row.body_html_ro ?? "",
      en: row.body_html_en ?? "",
      bg: row.body_html_bg ?? "",
    },
  };
}

export async function saveArticlePage(page: ArticlePage): Promise<ArticlePage> {
  const { SITE_DB } = getEnv();
  const body = page.body ?? emptyLocaleMap();
  await SITE_DB.prepare(
    `INSERT INTO article_pages
       (article_id, body_html_ro, body_html_en, body_html_bg, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(article_id) DO UPDATE SET
       body_html_ro = excluded.body_html_ro,
       body_html_en = excluded.body_html_en,
       body_html_bg = excluded.body_html_bg,
       updated_at = datetime('now')`,
  )
    .bind(page.article_id, body.ro ?? "", body.en ?? "", body.bg ?? "")
    .run();
  const saved = await getArticlePage(page.article_id);
  await publishArticlePage(page.article_id);
  return saved;
}

export async function publishArticlePage(articleId: string): Promise<void> {
  const { CONTENT } = getEnv();
  const article = await getArticle(articleId);
  if (!article) return;
  const page = await getArticlePage(articleId);
  const body = {
    ro: rewriteArticleHtmlForSite(page.body.ro ?? ""),
    en: rewriteArticleHtmlForSite(page.body.en ?? ""),
    bg: rewriteArticleHtmlForSite(page.body.bg ?? ""),
  };
  const doc = {
    id: article.id,
    slug: article.slug,
    title: article.title,
    datetime: article.datetime || null,
    enabled: article.enabled,
    body,
    updatedAt: new Date().toISOString(),
  };
  await CONTENT.put(articlePageDocumentKey(article.slug), JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export async function replaceArticleCategories(
  categories: ArticleCategory[],
): Promise<ArticleCategory[]> {
  const { SITE_DB } = getEnv();
  const normalized = categories
    .map((c, i) => ({
      ...c,
      position: i + 1,
      slug: c.slug.trim() || slugifyArticle(c.name.en || c.name.ro || c.name.bg),
      enabled: c.enabled !== false,
    }))
    .filter((c) => c.id);

  const existing = await listArticleCategories();
  const keep = new Set(normalized.map((c) => c.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM article_categories WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  for (const c of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO article_categories
         (id, position, slug, name_ro, name_en, name_bg, icon_key, icon_svg, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         slug = excluded.slug,
         name_ro = excluded.name_ro,
         name_en = excluded.name_en,
         name_bg = excluded.name_bg,
         icon_key = excluded.icon_key,
         icon_svg = excluded.icon_svg,
         enabled = excluded.enabled,
         updated_at = datetime('now')`,
    )
      .bind(
        c.id,
        c.position,
        c.slug,
        c.name.ro,
        c.name.en,
        c.name.bg,
        c.icon_key ?? "",
        c.icon_svg ?? "",
        c.enabled ? 1 : 0,
      )
      .run();
  }

  await publishArticlesCatalog();
  return listArticleCategories();
}

export async function replaceArticleSubcategories(
  subcategories: ArticleSubcategory[],
): Promise<ArticleSubcategory[]> {
  const { SITE_DB } = getEnv();
  const normalized = subcategories
    .map((s, i) => ({
      ...s,
      position: i + 1,
      slug: s.slug.trim() || slugifyArticle(s.name.en || s.name.ro || s.name.bg),
      enabled: s.enabled !== false,
    }))
    .filter((s) => s.id && s.category_id);

  const existing = await listArticleSubcategories();
  const keep = new Set(normalized.map((s) => s.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM article_subcategories WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  for (const s of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO article_subcategories
         (id, category_id, position, slug, name_ro, name_en, name_bg, icon_svg, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         category_id = excluded.category_id,
         position = excluded.position,
         slug = excluded.slug,
         name_ro = excluded.name_ro,
         name_en = excluded.name_en,
         name_bg = excluded.name_bg,
         icon_svg = excluded.icon_svg,
         enabled = excluded.enabled,
         updated_at = datetime('now')`,
    )
      .bind(
        s.id,
        s.category_id,
        s.position,
        s.slug,
        s.name.ro,
        s.name.en,
        s.name.bg,
        s.icon_svg ?? "",
        s.enabled ? 1 : 0,
      )
      .run();
  }

  await publishArticlesCatalog();
  return listArticleSubcategories();
}

export async function replaceArticles(
  articles: ArticleRow[],
): Promise<ArticleRow[]> {
  const { SITE_DB, CONTENT } = getEnv();
  const normalized = articles
    .map((a, i) => {
      const snippet = a.snippet ?? emptyArticleSnippet();
      return {
        ...a,
        position: i + 1,
        slug:
          a.slug.trim() ||
          slugifyArticle(a.title.en || a.title.ro || a.title.bg),
        title: a.title ?? emptyLocaleMap(),
        category_id: a.category_id || null,
        subcategory_id: a.subcategory_id || null,
        datetime: normalizeArticleDatetime(a.datetime ?? ""),
        snippet: {
          title: snippet.title ?? emptyLocaleMap(),
          text: snippet.text ?? emptyLocaleMap(),
          date: normalizeArticleDatetime(snippet.date ?? ""),
          library_id: snippet.library_id || null,
          master_key: snippet.master_key ?? "",
          webp_key: snippet.webp_key || null,
        },
        enabled: a.enabled !== false,
      };
    })
    .filter((a) => a.id);

  const slugOwners = new Map<string, string>();
  for (const a of normalized) {
    const key = a.slug.toLowerCase();
    if (slugOwners.has(key)) {
      throw new Error(`Duplicate article slug: ${a.slug}`);
    }
    slugOwners.set(key, a.id);
  }

  const existing = await listArticles();
  const keep = new Set(normalized.map((a) => a.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM articles WHERE id = ?`)
        .bind(old.id)
        .run();
      await SITE_DB.prepare(`DELETE FROM article_pages WHERE article_id = ?`)
        .bind(old.id)
        .run();
      await CONTENT.delete(articlePageDocumentKey(old.slug));
    }
  }

  for (const a of normalized) {
    const prior = existing.find((e) => e.id === a.id);
    if (prior && prior.slug !== a.slug) {
      await CONTENT.delete(articlePageDocumentKey(prior.slug));
    }
  }

  for (const a of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO articles
         (id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id,
          published_at,
          snippet_title_ro, snippet_title_en, snippet_title_bg,
          snippet_text_ro, snippet_text_en, snippet_text_bg,
          snippet_date, snippet_library_id, snippet_master_key, snippet_webp_key,
          enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         slug = excluded.slug,
         title_ro = excluded.title_ro,
         title_en = excluded.title_en,
         title_bg = excluded.title_bg,
         category_id = excluded.category_id,
         subcategory_id = excluded.subcategory_id,
         published_at = excluded.published_at,
         snippet_title_ro = excluded.snippet_title_ro,
         snippet_title_en = excluded.snippet_title_en,
         snippet_title_bg = excluded.snippet_title_bg,
         snippet_text_ro = excluded.snippet_text_ro,
         snippet_text_en = excluded.snippet_text_en,
         snippet_text_bg = excluded.snippet_text_bg,
         snippet_date = excluded.snippet_date,
         snippet_library_id = excluded.snippet_library_id,
         snippet_master_key = excluded.snippet_master_key,
         snippet_webp_key = excluded.snippet_webp_key,
         enabled = excluded.enabled,
         updated_at = datetime('now')`,
    )
      .bind(
        a.id,
        a.position,
        a.slug,
        a.title.ro,
        a.title.en,
        a.title.bg,
        a.category_id,
        a.subcategory_id,
        a.datetime,
        a.snippet.title.ro,
        a.snippet.title.en,
        a.snippet.title.bg,
        a.snippet.text.ro,
        a.snippet.text.en,
        a.snippet.text.bg,
        a.snippet.date,
        a.snippet.library_id,
        a.snippet.master_key,
        a.snippet.webp_key,
        a.enabled ? 1 : 0,
      )
      .run();
  }

  await publishArticlesCatalog();
  for (const a of normalized) {
    const prior = existing.find((e) => e.id === a.id);
    if (prior && prior.slug !== a.slug) {
      await publishArticlePage(a.id);
    }
  }
  return listArticles();
}

export async function listArticleFirstPage(): Promise<ArticleFirstPageSlot[]> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT article_id, position FROM article_first_page ORDER BY position ASC`,
  ).all<{ article_id: string; position: number }>();
  return (rows.results ?? []).map((row) => ({
    id: row.article_id,
    article_id: row.article_id,
    position: row.position,
  }));
}

export async function replaceArticleFirstPage(
  slots: Array<{ article_id: string; position: number }>,
): Promise<ArticleFirstPageSlot[]> {
  const { SITE_DB } = getEnv();
  const articles = await listArticles();
  const known = new Set(articles.map((a) => a.id));

  const cleaned = [...slots]
    .filter((s) => known.has(s.article_id))
    .sort((a, b) => a.position - b.position)
    .map((s, index) => ({
      article_id: s.article_id,
      position: index + 1,
    }));

  // Deduplicate by article_id keeping first occurrence in ordered list.
  const seen = new Set<string>();
  const unique = cleaned.filter((s) => {
    if (seen.has(s.article_id)) return false;
    seen.add(s.article_id);
    return true;
  });

  await SITE_DB.prepare(`DELETE FROM article_first_page`).run();
  for (const [index, slot] of unique.entries()) {
    await SITE_DB.prepare(
      `INSERT INTO article_first_page (article_id, position, updated_at)
       VALUES (?, ?, datetime('now'))`,
    )
      .bind(slot.article_id, index + 1)
      .run();
  }

  await publishArticlesCatalog();
  return listArticleFirstPage();
}

export async function buildArticlesCatalogDocument(): Promise<ArticlesCatalogDocument> {
  const [categories, subcategories, articles, firstPage] = await Promise.all([
    listArticleCategories(),
    listArticleSubcategories(),
    listArticles(),
    listArticleFirstPage(),
  ]);

  return {
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      position: c.position,
      name: c.name,
      iconSvg: c.icon_svg,
      enabled: c.enabled,
    })),
    subcategories: subcategories.map((s) => ({
      id: s.id,
      categoryId: s.category_id,
      slug: s.slug,
      position: s.position,
      name: s.name,
      iconSvg: s.icon_svg,
      enabled: s.enabled,
    })),
    articles: articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      position: a.position,
      title: a.title,
      categoryId: a.category_id,
      subcategoryId: a.subcategory_id,
      datetime: a.datetime || null,
      snippet: {
        title: a.snippet.title,
        text: a.snippet.text,
        date: a.snippet.date || null,
        image: {
          libraryId: a.snippet.library_id,
          master: a.snippet.master_key || null,
          webp: a.snippet.webp_key,
        },
      },
      enabled: a.enabled,
    })),
    firstPage: firstPage.map((s) => s.article_id),
    updatedAt: new Date().toISOString(),
  };
}

export async function publishArticlesCatalog(): Promise<void> {
  const { CONTENT } = getEnv();
  const doc = await buildArticlesCatalogDocument();
  await CONTENT.put(ARTICLES_CONTENT_KEY, JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}
