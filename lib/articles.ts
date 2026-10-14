import { getEnv } from "./env";
import { emptyLocaleMap } from "./i18n";
import {
  ARTICLES_CONTENT_KEY,
  normalizeArticleDatetime,
  slugifyArticle,
  type ArticleCategory,
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
    enabled: Boolean(row.enabled),
  };
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

export async function listArticles(): Promise<ArticleRow[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id,
            published_at, enabled
     FROM articles ORDER BY position ASC`,
  ).all<ArticleDb>();
  return (results ?? []).map(mapArticle);
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
  const { SITE_DB } = getEnv();
  const normalized = articles
    .map((a, i) => ({
      ...a,
      position: i + 1,
      slug: a.slug.trim() || slugifyArticle(a.title.en || a.title.ro || a.title.bg),
      title: a.title ?? emptyLocaleMap(),
      category_id: a.category_id || null,
      subcategory_id: a.subcategory_id || null,
      datetime: normalizeArticleDatetime(a.datetime ?? ""),
      enabled: a.enabled !== false,
    }))
    .filter((a) => a.id);

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
    }
  }

  for (const a of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO articles
         (id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id,
          published_at, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         slug = excluded.slug,
         title_ro = excluded.title_ro,
         title_en = excluded.title_en,
         title_bg = excluded.title_bg,
         category_id = excluded.category_id,
         subcategory_id = excluded.subcategory_id,
         published_at = excluded.published_at,
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
        a.enabled ? 1 : 0,
      )
      .run();
  }

  await publishArticlesCatalog();
  return listArticles();
}

export async function buildArticlesCatalogDocument(): Promise<ArticlesCatalogDocument> {
  const [categories, subcategories, articles] = await Promise.all([
    listArticleCategories(),
    listArticleSubcategories(),
    listArticles(),
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
      enabled: a.enabled,
    })),
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
