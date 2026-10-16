import { getEnv } from "./env";
import { emptyLocaleMap, type LocaleMap } from "./i18n";
import {
  STUFF_CONTENT_KEY,
  autoStuffMemberSlug,
  emptyStuffSpotlightSettings,
  normalizeStuffSpotlightSettings,
  slugifyStuff,
  type StuffCatalogDocument,
  type StuffCategory,
  type StuffMember,
  type StuffNamedCatalog,
  type StuffProvidedService,
  type StuffRole,
  type StuffSpecialty,
  type StuffSpotlightSettings,
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

type NamedCatalogDb = {
  id: string;
  position: number;
  name_ro: string;
  name_en: string;
  name_bg: string;
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
  specialty_ro: string;
  specialty_en: string;
  specialty_bg: string;
  role_id: string | null;
  specialty_id: string | null;
  doctor_title: number;
  college: string;
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

function mapNamedCatalog(row: NamedCatalogDb): StuffNamedCatalog {
  return {
    id: row.id,
    position: row.position,
    name: { ro: row.name_ro, en: row.name_en, bg: row.name_bg },
    enabled: Boolean(row.enabled),
  };
}

function mapMember(
  row: MemberDb,
  providedServiceIds: string[] = [],
): StuffMember {
  return {
    id: row.id,
    position: row.position,
    slug: row.slug,
    name: { ro: row.name_ro, en: row.name_en, bg: row.name_bg },
    role: { ro: row.role_ro, en: row.role_en, bg: row.role_bg },
    specialty: {
      ro: row.specialty_ro ?? "",
      en: row.specialty_en ?? "",
      bg: row.specialty_bg ?? "",
    },
    role_id: row.role_id || null,
    specialty_id: row.specialty_id || null,
    doctor_title: Boolean(row.doctor_title),
    college: row.college ?? "",
    provided_service_ids: providedServiceIds,
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

function resolveCatalogName(
  id: string | null | undefined,
  catalog: StuffNamedCatalog[],
  fallback: LocaleMap,
): LocaleMap {
  if (!id) return fallback;
  const hit = catalog.find((c) => c.id === id);
  return hit?.name ?? fallback;
}

export async function isStuffMemberSlugUnique(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const { SITE_DB } = getEnv();
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return false;
  const row = excludeId
    ? await SITE_DB.prepare(
        `SELECT id FROM stuff_members WHERE lower(slug) = ? AND id != ? LIMIT 1`,
      )
        .bind(normalized, excludeId)
        .first()
    : await SITE_DB.prepare(
        `SELECT id FROM stuff_members WHERE lower(slug) = ? LIMIT 1`,
      )
        .bind(normalized)
        .first();
  return !row;
}

export async function isStuffCategorySlugUnique(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const { SITE_DB } = getEnv();
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return false;
  const row = excludeId
    ? await SITE_DB.prepare(
        `SELECT id FROM stuff_categories WHERE lower(slug) = ? AND id != ? LIMIT 1`,
      )
        .bind(normalized, excludeId)
        .first()
    : await SITE_DB.prepare(
        `SELECT id FROM stuff_categories WHERE lower(slug) = ? LIMIT 1`,
      )
        .bind(normalized)
        .first();
  return !row;
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

async function listNamedCatalog(table: string): Promise<StuffNamedCatalog[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT id, position, name_ro, name_en, name_bg, enabled
     FROM ${table} ORDER BY position ASC`,
  ).all<NamedCatalogDb>();
  return (results ?? []).map(mapNamedCatalog);
}

export async function listStuffRoles(): Promise<StuffRole[]> {
  return listNamedCatalog("stuff_roles");
}

export async function listStuffSpecialties(): Promise<StuffSpecialty[]> {
  return listNamedCatalog("stuff_specialties");
}

export async function listStuffProvidedServices(): Promise<
  StuffProvidedService[]
> {
  return listNamedCatalog("stuff_provided_services");
}

async function listMemberProvidedServiceIds(
  memberId: string,
): Promise<string[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT service_id FROM stuff_member_provided_services
     WHERE member_id = ? ORDER BY position ASC`,
  )
    .bind(memberId)
    .all<{ service_id: string }>();
  return (results ?? []).map((r) => r.service_id);
}

export async function listStuffMembers(): Promise<StuffMember[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT id, position, slug, name_ro, name_en, name_bg, role_ro, role_en, role_bg,
            specialty_ro, specialty_en, specialty_bg, role_id, specialty_id, doctor_title,
            college, snippet_ro, snippet_en, snippet_bg, category_id, subcategory_id,
            portrait_library_id, portrait_master_key, portrait_webp_key, portrait_800_key, enabled
     FROM stuff_members ORDER BY position ASC`,
  ).all<MemberDb>();

  const members: StuffMember[] = [];
  for (const row of results ?? []) {
    const provided = await listMemberProvidedServiceIds(row.id);
    members.push(mapMember(row, provided));
  }
  return members;
}

export async function replaceStuffCategories(
  categories: StuffCategory[],
): Promise<StuffCategory[]> {
  const { SITE_DB } = getEnv();
  const normalized = categories
    .map((c, i) => ({
      ...c,
      position: i + 1,
      name: c.name ?? emptyLocaleMap(),
      slug:
        c.slug.trim() ||
        autoStuffMemberSlug(c.name ?? emptyLocaleMap()),
      enabled: c.enabled !== false,
      icon_key: c.icon_key ?? "",
      icon_svg: c.icon_svg ?? "",
    }))
    .filter((c) => c.id);

  const seenSlugs = new Set<string>();
  for (const c of normalized) {
    const key = c.slug.toLowerCase();
    if (seenSlugs.has(key)) {
      throw new Error(`Duplicate slug in batch: ${c.slug}`);
    }
    seenSlugs.add(key);
    const unique = await isStuffCategorySlugUnique(c.slug, c.id);
    if (!unique) {
      throw new Error(`Slug already used: ${c.slug}`);
    }
  }

  // Upsert first, then delete removed — avoids empty table if a later insert fails.
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
        c.icon_key,
        c.icon_svg,
        c.enabled ? 1 : 0,
      )
      .run();
  }

  const existing = await listStuffCategories();
  const keep = new Set(normalized.map((c) => c.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM stuff_categories WHERE id = ?`)
        .bind(old.id)
        .run();
    }
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

async function replaceNamedCatalog(
  table: string,
  rows: StuffNamedCatalog[],
): Promise<StuffNamedCatalog[]> {
  const { SITE_DB } = getEnv();
  const normalized = rows
    .map((r, i) => ({
      ...r,
      position: i + 1,
      enabled: r.enabled !== false,
      name: r.name ?? emptyLocaleMap(),
    }))
    .filter((r) => r.id);

  const existing = await listNamedCatalog(table);
  const keep = new Set(normalized.map((r) => r.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM ${table} WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  for (const r of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO ${table}
         (id, position, name_ro, name_en, name_bg, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         name_ro = excluded.name_ro,
         name_en = excluded.name_en,
         name_bg = excluded.name_bg,
         enabled = excluded.enabled,
         updated_at = datetime('now')`,
    )
      .bind(
        r.id,
        r.position,
        r.name.ro,
        r.name.en,
        r.name.bg,
        r.enabled ? 1 : 0,
      )
      .run();
  }

  await publishStuffCatalog();
  return listNamedCatalog(table);
}

export async function replaceStuffRoles(
  roles: StuffRole[],
): Promise<StuffRole[]> {
  return replaceNamedCatalog("stuff_roles", roles);
}

export async function replaceStuffSpecialties(
  specialties: StuffSpecialty[],
): Promise<StuffSpecialty[]> {
  return replaceNamedCatalog("stuff_specialties", specialties);
}

export async function replaceStuffProvidedServices(
  services: StuffProvidedService[],
): Promise<StuffProvidedService[]> {
  return replaceNamedCatalog("stuff_provided_services", services);
}

export async function replaceStuffMembers(
  members: StuffMember[],
): Promise<StuffMember[]> {
  const { SITE_DB } = getEnv();
  const normalized = members
    .map((m, i) => ({
      ...m,
      position: i + 1,
      slug: m.slug.trim() || autoStuffMemberSlug(m.name ?? emptyLocaleMap()),
      name: m.name ?? emptyLocaleMap(),
      role: m.role ?? emptyLocaleMap(),
      specialty: m.specialty ?? emptyLocaleMap(),
      role_id: m.role_id || null,
      specialty_id: m.specialty_id || null,
      doctor_title: m.doctor_title === true,
      college: (m.college ?? "").trim(),
      provided_service_ids: Array.isArray(m.provided_service_ids)
        ? m.provided_service_ids.filter(Boolean)
        : [],
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
      await SITE_DB.prepare(
        `DELETE FROM stuff_member_provided_services WHERE member_id = ?`,
      )
        .bind(old.id)
        .run();
      await SITE_DB.prepare(`DELETE FROM stuff_members WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  const seenSlugs = new Set<string>();
  for (const m of normalized) {
    const key = m.slug.toLowerCase();
    if (seenSlugs.has(key)) {
      throw new Error(`Duplicate slug in batch: ${m.slug}`);
    }
    seenSlugs.add(key);
    const unique = await isStuffMemberSlugUnique(m.slug, m.id);
    if (!unique) {
      throw new Error(`Slug already used: ${m.slug}`);
    }
  }

  for (const m of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO stuff_members
         (id, position, slug, name_ro, name_en, name_bg, role_ro, role_en, role_bg,
          specialty_ro, specialty_en, specialty_bg, role_id, specialty_id, doctor_title,
          college, snippet_ro, snippet_en, snippet_bg, category_id, subcategory_id,
          portrait_library_id, portrait_master_key, portrait_webp_key, portrait_800_key,
          enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         slug = excluded.slug,
         name_ro = excluded.name_ro,
         name_en = excluded.name_en,
         name_bg = excluded.name_bg,
         role_ro = excluded.role_ro,
         role_en = excluded.role_en,
         role_bg = excluded.role_bg,
         specialty_ro = excluded.specialty_ro,
         specialty_en = excluded.specialty_en,
         specialty_bg = excluded.specialty_bg,
         role_id = excluded.role_id,
         specialty_id = excluded.specialty_id,
         doctor_title = excluded.doctor_title,
         college = excluded.college,
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
        "",
        "",
        "",
        "",
        "",
        "",
        m.role_id,
        m.specialty_id,
        m.doctor_title ? 1 : 0,
        m.college,
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

    await SITE_DB.prepare(
      `DELETE FROM stuff_member_provided_services WHERE member_id = ?`,
    )
      .bind(m.id)
      .run();

    for (const [index, serviceId] of m.provided_service_ids.entries()) {
      await SITE_DB.prepare(
        `INSERT INTO stuff_member_provided_services (member_id, service_id, position)
         VALUES (?, ?, ?)`,
      )
        .bind(m.id, serviceId, index + 1)
        .run();
    }
  }

  await publishStuffCatalog();
  return listStuffMembers();
}

export async function getStuffSpotlightSettings(): Promise<StuffSpotlightSettings> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT autoplay, delay_ms, stop_on_hover FROM stuff_spotlight_settings WHERE id = 1`,
  ).first<{
    autoplay: number;
    delay_ms: number;
    stop_on_hover: number;
  }>();
  if (!row) return emptyStuffSpotlightSettings();
  return normalizeStuffSpotlightSettings({
    autoplay: Boolean(row.autoplay),
    delayMs: row.delay_ms,
    stopOnHover: Boolean(row.stop_on_hover),
  });
}

export async function saveStuffSpotlightSettings(
  settings: StuffSpotlightSettings,
): Promise<StuffSpotlightSettings> {
  const { SITE_DB } = getEnv();
  const next = normalizeStuffSpotlightSettings(settings);
  await SITE_DB.prepare(
    `INSERT INTO stuff_spotlight_settings
       (id, autoplay, delay_ms, stop_on_hover, updated_at)
     VALUES (1, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       autoplay = excluded.autoplay,
       delay_ms = excluded.delay_ms,
       stop_on_hover = excluded.stop_on_hover,
       updated_at = datetime('now')`,
  )
    .bind(next.autoplay ? 1 : 0, next.delayMs, next.stopOnHover ? 1 : 0)
    .run();
  await publishStuffCatalog();
  return getStuffSpotlightSettings();
}

export async function buildStuffCatalogDocument(): Promise<StuffCatalogDocument> {
  const [
    categories,
    subcategories,
    roles,
    specialties,
    providedServices,
    members,
    spotlight,
  ] = await Promise.all([
    listStuffCategories(),
    listStuffSubcategories(),
    listStuffRoles(),
    listStuffSpecialties(),
    listStuffProvidedServices(),
    listStuffMembers(),
    getStuffSpotlightSettings(),
  ]);

  return {
    spotlight,
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
    roles: roles.map((r) => ({
      id: r.id,
      position: r.position,
      name: r.name,
      enabled: r.enabled,
    })),
    specialties: specialties.map((s) => ({
      id: s.id,
      position: s.position,
      name: s.name,
      enabled: s.enabled,
    })),
    providedServices: providedServices.map((s) => ({
      id: s.id,
      position: s.position,
      name: s.name,
      enabled: s.enabled,
    })),
    members: members.map((m) => ({
      id: m.id,
      slug: m.slug,
      position: m.position,
      name: m.name,
      roleId: m.role_id,
      specialtyId: m.specialty_id,
      role: resolveCatalogName(m.role_id, roles, m.role),
      specialty: resolveCatalogName(m.specialty_id, specialties, m.specialty),
      doctorTitle: m.doctor_title,
      college: m.college ?? "",
      providedServiceIds: m.provided_service_ids,
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
