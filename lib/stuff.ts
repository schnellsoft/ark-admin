import { getEnv } from "./env";
import { emptyLocaleMap } from "./i18n";
import {
  STUFF_CONTENT_KEY,
  slugifyStuff,
  type StuffCatalogDocument,
  type StuffCategory,
  type StuffMember,
  type StuffSubcategory,
} from "./stuff-shared";

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

type MemberDb = {
  id: string;
  position: number;
  slug: string;
  name_ro: string;
  name_en: string;
  name_bg: string;
  role_ro: string;
  role_en: string;
  role_bg: string;
  snippet_ro: string;
  snippet_en: string;
  snippet_bg: string;
  category_id: string;
  subcategory_id: string | null;
  portrait_library_id: string | null;
  portrait_master_key: string;
  portrait_webp_key: string | null;
  portrait_800_key: string | null;
  enabled: number;
};

function mapCategory(row: CategoryDb): StuffCategory {
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

function mapSubcategory(row: SubcategoryDb): StuffSubcategory {
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

function mapMember(row: MemberDb): StuffMember {
  return {
    id: row.id,
    position: row.position,
    slug: row.slug,
    name: { ro: row.name_ro, en: row.name_en, bg: row.name_bg },
    role: { ro: row.role_ro, en: row.role_en, bg: row.role_bg },
    snippet: {
      ro: row.snippet_ro,
      en: row.snippet_en,
      bg: row.snippet_bg,
    },
    category_id: row.category_id,
    subcategory_id: row.subcategory_id,
    portrait_library_id: row.portrait_library_id,
    portrait_master_key: row.portrait_master_key ?? "",
    portrait_webp_key: row.portrait_webp_key,
    portrait_800_key: row.portrait_800_key,
    enabled: Boolean(row.enabled),
  };
}

export async function listStuffCategories(): Promise<StuffCategory[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT id, position, slug, name_ro, name_en, name_bg, icon_key, icon_svg, enabled
     FROM stuff_categories ORDER BY position ASC`,
  ).all<CategoryDb>();
  return (results ?? []).map(mapCategory);
}

export async function listStuffSubcategories(
  categoryId?: string,
): Promise<StuffSubcategory[]> {
  const { SITE_DB } = getEnv();
  if (categoryId) {
    const { results } = await SITE_DB.prepare(
      `SELECT id, category_id, position, slug, name_ro, name_en, name_bg, icon_svg, enabled
       FROM stuff_subcategories WHERE category_id = ? ORDER BY position ASC`,
    )
      .bind(categoryId)
      .all<SubcategoryDb>();
    return (results ?? []).map(mapSubcategory);
  }
  const { results } = await SITE_DB.prepare(
    `SELECT id, category_id, position, slug, name_ro, name_en, name_bg, icon_svg, enabled
     FROM stuff_subcategories ORDER BY category_id, position ASC`,
  ).all<SubcategoryDb>();
  return (results ?? []).map(mapSubcategory);
}

export async function listStuffMembers(): Promise<StuffMember[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT id, position, slug, name_ro, name_en, name_bg, role_ro, role_en, role_bg,
            snippet_ro, snippet_en, snippet_bg, category_id, subcategory_id,
            portrait_library_id, portrait_master_key, portrait_webp_key, portrait_800_key, enabled
     FROM stuff_members ORDER BY position ASC`,
  ).all<MemberDb>();
  return (results ?? []).map(mapMember);
}

export async function replaceStuffCategories(
  categories: StuffCategory[],
): Promise<StuffCategory[]> {
  const { SITE_DB } = getEnv();
  const normalized = categories
    .map((c, i) => ({
      ...c,
      position: i + 1,
      slug: c.slug.trim() || slugifyStuff(c.name.en || c.name.ro || c.name.bg),
      enabled: c.enabled !== false,
    }))
    .filter((c) => c.id);

  const existing = await listStuffCategories();
  const keep = new Set(normalized.map((c) => c.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM stuff_categories WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  for (const c of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO stuff_categories
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

  await publishStuffCatalog();
  return listStuffCategories();
}

export async function replaceStuffSubcategories(
  subcategories: StuffSubcategory[],
): Promise<StuffSubcategory[]> {
  const { SITE_DB } = getEnv();
  const normalized = subcategories
    .map((s, i) => ({
      ...s,
      position: i + 1,
      slug: s.slug.trim() || slugifyStuff(s.name.en || s.name.ro || s.name.bg),
      enabled: s.enabled !== false,
    }))
    .filter((s) => s.id && s.category_id);

  const existing = await listStuffSubcategories();
  const keep = new Set(normalized.map((s) => s.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM stuff_subcategories WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  for (const s of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO stuff_subcategories
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

  await publishStuffCatalog();
  return listStuffSubcategories();
}

export async function replaceStuffMembers(
  members: StuffMember[],
): Promise<StuffMember[]> {
  const { SITE_DB } = getEnv();
  const normalized = members
    .map((m, i) => ({
      ...m,
      position: i + 1,
      slug: m.slug.trim() || slugifyStuff(m.name.en || m.name.ro || m.name.bg),
      name: m.name ?? emptyLocaleMap(),
      role: m.role ?? emptyLocaleMap(),
      snippet: m.snippet ?? emptyLocaleMap(),
      subcategory_id: m.subcategory_id || null,
      portrait_library_id: m.portrait_library_id || null,
      portrait_master_key: m.portrait_master_key ?? "",
      portrait_webp_key: m.portrait_webp_key || null,
      portrait_800_key: m.portrait_800_key || null,
      enabled: m.enabled !== false,
    }))
    .filter((m) => m.id && m.category_id);

  const existing = await listStuffMembers();
  const keep = new Set(normalized.map((m) => m.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM stuff_members WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  for (const m of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO stuff_members
         (id, position, slug, name_ro, name_en, name_bg, role_ro, role_en, role_bg,
          snippet_ro, snippet_en, snippet_bg, category_id, subcategory_id,
          portrait_library_id, portrait_master_key, portrait_webp_key, portrait_800_key,
          enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         slug = excluded.slug,
         name_ro = excluded.name_ro,
         name_en = excluded.name_en,
         name_bg = excluded.name_bg,
         role_ro = excluded.role_ro,
         role_en = excluded.role_en,
         role_bg = excluded.role_bg,
         snippet_ro = excluded.snippet_ro,
         snippet_en = excluded.snippet_en,
         snippet_bg = excluded.snippet_bg,
         category_id = excluded.category_id,
         subcategory_id = excluded.subcategory_id,
         portrait_library_id = excluded.portrait_library_id,
         portrait_master_key = excluded.portrait_master_key,
         portrait_webp_key = excluded.portrait_webp_key,
         portrait_800_key = excluded.portrait_800_key,
         enabled = excluded.enabled,
         updated_at = datetime('now')`,
    )
      .bind(
        m.id,
        m.position,
        m.slug,
        m.name.ro,
        m.name.en,
        m.name.bg,
        m.role.ro,
        m.role.en,
        m.role.bg,
        m.snippet.ro,
        m.snippet.en,
        m.snippet.bg,
        m.category_id,
        m.subcategory_id,
        m.portrait_library_id,
        m.portrait_master_key,
        m.portrait_webp_key,
        m.portrait_800_key,
        m.enabled ? 1 : 0,
      )
      .run();
  }

  await publishStuffCatalog();
  return listStuffMembers();
}

export async function buildStuffCatalogDocument(): Promise<StuffCatalogDocument> {
  const [categories, subcategories, members] = await Promise.all([
    listStuffCategories(),
    listStuffSubcategories(),
    listStuffMembers(),
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
    members: members.map((m) => ({
      id: m.id,
      slug: m.slug,
      position: m.position,
      name: m.name,
      role: m.role,
      snippet: m.snippet,
      categoryId: m.category_id,
      subcategoryId: m.subcategory_id,
      portrait: {
        libraryId: m.portrait_library_id,
        master: m.portrait_master_key || null,
        webp: m.portrait_webp_key,
        portrait800: m.portrait_800_key,
      },
      enabled: m.enabled,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export async function publishStuffCatalog(): Promise<void> {
  const { CONTENT } = getEnv();
  const doc = await buildStuffCatalogDocument();
  await CONTENT.put(STUFF_CONTENT_KEY, JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}
