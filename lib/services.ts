import { getEnv } from "./env";
import type { Locale, LocaleMap } from "./i18n";
import { emptyLocaleMap, LOCALES } from "./i18n";
import { buildPriceListPdf } from "./services-pdf";
import {
  SERVICES_CONTENT_KEY,
  SERVICES_PAGES_PREFIX,
  SERVICES_PDF_KEY,
  emptyServicePage,
  pagePathForSlug,
  parseJsonArray,
  priceToText,
  servicesPdfKeyForLocale,
  slugifyService,
  type ServiceCategory,
  type ServicePage,
  type ServicePageDocument,
  type ServicePageImage,
  type ServiceRecommended,
  type ServiceRow,
  type ServiceSubcategory,
  type ServicesCatalogDocument,
} from "./services-shared";

function pickLocaleText(map: LocaleMap | undefined, locale: Locale): string {
  if (!map) return "";
  return (map[locale] || map.ro || map.en || map.bg || "").trim();
}

const PDF_TITLES: Record<Locale, string> = {
  ro: "Ark Dental — Lista de preturi",
  en: "Ark Dental — Price list",
  bg: "Ark Dental — Ценова листа",
};

const PDF_GENERATED: Record<Locale, string> = {
  ro: "Generat",
  en: "Generated",
  bg: "Генерирано",
};

export * from "./services-shared";

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

type ServiceDb = {
  id: string;
  position: number;
  slug: string;
  title_ro: string;
  title_en: string;
  title_bg: string;
  category_id: string;
  subcategory_id: string | null;
  icon_id: string | null;
  icon_svg: string;
  price_text: string;
  currency: string;
  page_path: string;
  enabled: number;
};

type PageDb = {
  service_id: string;
  synopsis_ro: string;
  synopsis_en: string;
  synopsis_bg: string;
  body_json_ro: string;
  body_json_en: string;
  body_json_bg: string;
  images_json: string;
};

function localeMap(ro: string, en: string, bg: string): LocaleMap {
  return { ro: ro ?? "", en: en ?? "", bg: bg ?? "" };
}

function mapCategory(row: CategoryDb): ServiceCategory {
  return {
    id: row.id,
    position: row.position,
    slug: row.slug,
    name: localeMap(row.name_ro, row.name_en, row.name_bg),
    icon_key: row.icon_key ?? "",
    icon_svg: row.icon_svg ?? "",
    enabled: Boolean(row.enabled),
  };
}

function mapSubcategory(row: SubcategoryDb): ServiceSubcategory {
  return {
    id: row.id,
    category_id: row.category_id,
    position: row.position,
    slug: row.slug,
    name: localeMap(row.name_ro, row.name_en, row.name_bg),
    icon_svg: row.icon_svg ?? "",
    enabled: Boolean(row.enabled),
  };
}

function mapService(row: ServiceDb): ServiceRow {
  return {
    id: row.id,
    position: row.position,
    slug: row.slug,
    title: localeMap(row.title_ro, row.title_en, row.title_bg),
    category_id: row.category_id,
    subcategory_id: row.subcategory_id,
    icon_id: row.icon_id,
    icon_svg: row.icon_svg ?? "",
    price_text: row.price_text ?? "",
    currency: row.currency || "RON",
    page_path: row.page_path || pagePathForSlug(row.slug),
    enabled: Boolean(row.enabled),
  };
}

function mapPage(row: PageDb): ServicePage {
  return {
    service_id: row.service_id,
    synopsis: localeMap(row.synopsis_ro, row.synopsis_en, row.synopsis_bg),
    paragraphs: {
      ro: parseJsonArray<string>(row.body_json_ro, []),
      en: parseJsonArray<string>(row.body_json_en, []),
      bg: parseJsonArray<string>(row.body_json_bg, []),
    },
    images: parseJsonArray<ServicePageImage>(row.images_json, []),
  };
}

export async function listCategories(): Promise<ServiceCategory[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT id, position, slug, name_ro, name_en, name_bg, icon_key, icon_svg, enabled
     FROM service_categories ORDER BY position ASC`,
  ).all<CategoryDb>();
  return (results ?? []).map(mapCategory);
}

export async function listSubcategories(
  categoryId?: string,
): Promise<ServiceSubcategory[]> {
  const { SITE_DB } = getEnv();
  if (categoryId) {
    const { results } = await SITE_DB.prepare(
      `SELECT id, category_id, position, slug, name_ro, name_en, name_bg, icon_svg, enabled
       FROM service_subcategories WHERE category_id = ? ORDER BY position ASC`,
    )
      .bind(categoryId)
      .all<SubcategoryDb>();
    return (results ?? []).map(mapSubcategory);
  }
  const { results } = await SITE_DB.prepare(
    `SELECT id, category_id, position, slug, name_ro, name_en, name_bg, icon_svg, enabled
     FROM service_subcategories ORDER BY category_id, position ASC`,
  ).all<SubcategoryDb>();
  return (results ?? []).map(mapSubcategory);
}

export async function listServices(): Promise<ServiceRow[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id,
            icon_id, icon_svg, price_text, currency, page_path, enabled
     FROM services ORDER BY position ASC`,
  ).all<ServiceDb>();
  return (results ?? []).map(mapService);
}

export async function getService(id: string): Promise<ServiceRow | null> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id,
            icon_id, icon_svg, price_text, currency, page_path, enabled
     FROM services WHERE id = ?`,
  )
    .bind(id)
    .first<ServiceDb>();
  return row ? mapService(row) : null;
}

export async function getServiceBySlug(slug: string): Promise<ServiceRow | null> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id,
            icon_id, icon_svg, price_text, currency, page_path, enabled
     FROM services WHERE slug = ?`,
  )
    .bind(slug)
    .first<ServiceDb>();
  return row ? mapService(row) : null;
}

export async function listRecommended(): Promise<ServiceRecommended[]> {
  const { SITE_DB } = getEnv();
  const { results } = await SITE_DB.prepare(
    `SELECT service_id, position FROM service_recommended ORDER BY position ASC`,
  ).all<{ service_id: string; position: number }>();
  return results ?? [];
}

export async function getServicePage(serviceId: string): Promise<ServicePage> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT service_id, synopsis_ro, synopsis_en, synopsis_bg,
            body_json_ro, body_json_en, body_json_bg, images_json
     FROM service_pages WHERE service_id = ?`,
  )
    .bind(serviceId)
    .first<PageDb>();
  return row ? mapPage(row) : emptyServicePage(serviceId);
}

export async function replaceCategories(
  categories: ServiceCategory[],
): Promise<ServiceCategory[]> {
  const { SITE_DB } = getEnv();
  const normalized = categories
    .map((c, i) => ({
      ...c,
      position: i + 1,
      slug: c.slug.trim() || slugifyService(c.name.en || c.name.ro || c.name.bg),
      enabled: c.enabled !== false,
    }))
    .filter((c) => c.id);

  const existing = await listCategories();
  const keep = new Set(normalized.map((c) => c.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM service_categories WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  for (const c of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO service_categories
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

  await publishServicesCatalog();
  return listCategories();
}

export async function replaceSubcategories(
  subcategories: ServiceSubcategory[],
): Promise<ServiceSubcategory[]> {
  const { SITE_DB } = getEnv();
  const byCat = new Map<string, ServiceSubcategory[]>();
  for (const s of subcategories) {
    if (!s.id || !s.category_id) continue;
    const list = byCat.get(s.category_id) ?? [];
    list.push(s);
    byCat.set(s.category_id, list);
  }
  const normalized: ServiceSubcategory[] = [];
  for (const [, list] of byCat) {
    list.forEach((s, i) => {
      normalized.push({
        ...s,
        position: i + 1,
        slug: s.slug.trim() || slugifyService(s.name.en || s.name.ro || s.name.bg),
        enabled: s.enabled !== false,
      });
    });
  }
  // Also include ones that came already ordered globally
  if (normalized.length === 0) {
    subcategories.forEach((s, i) => {
      if (!s.id || !s.category_id) return;
      normalized.push({
        ...s,
        position: s.position || i + 1,
        slug: s.slug.trim() || slugifyService(s.name.en || s.name.ro || s.name.bg),
        enabled: s.enabled !== false,
      });
    });
  }

  const existing = await listSubcategories();
  const keep = new Set(normalized.map((s) => s.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM service_subcategories WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  for (const s of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO service_subcategories
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

  await publishServicesCatalog();
  return listSubcategories();
}

export async function replaceServices(services: ServiceRow[]): Promise<ServiceRow[]> {
  const { SITE_DB } = getEnv();
  const normalized = services
    .map((s, i) => {
      const slug =
        s.slug.trim() || slugifyService(s.title.en || s.title.ro || s.title.bg);
      return {
        ...s,
        position: i + 1,
        slug,
        page_path: s.page_path?.trim() || pagePathForSlug(slug),
        currency: s.currency?.trim() || "RON",
        price_text: priceToText(s.price_text),
        enabled: s.enabled !== false,
      };
    })
    .filter((s) => s.id && s.category_id);

  const existing = await listServices();
  const keep = new Set(normalized.map((s) => s.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM services WHERE id = ?`).bind(old.id).run();
    }
  }

  for (const s of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO services
         (id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id,
          icon_id, icon_svg, price_text, currency, page_path, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         slug = excluded.slug,
         title_ro = excluded.title_ro,
         title_en = excluded.title_en,
         title_bg = excluded.title_bg,
         category_id = excluded.category_id,
         subcategory_id = excluded.subcategory_id,
         icon_id = excluded.icon_id,
         icon_svg = excluded.icon_svg,
         price_text = excluded.price_text,
         currency = excluded.currency,
         page_path = excluded.page_path,
         enabled = excluded.enabled,
         updated_at = datetime('now')`,
    )
      .bind(
        s.id,
        s.position,
        s.slug,
        s.title.ro,
        s.title.en,
        s.title.bg,
        s.category_id,
        s.subcategory_id,
        s.icon_id,
        s.icon_svg ?? "",
        s.price_text,
        s.currency,
        s.page_path,
        s.enabled ? 1 : 0,
      )
      .run();

    // Ensure page row exists
    await SITE_DB.prepare(
      `INSERT OR IGNORE INTO service_pages (service_id) VALUES (?)`,
    )
      .bind(s.id)
      .run();
  }

  await publishServicesCatalog();
  await publishAllServicePages();
  return listServices();
}

export async function replaceRecommended(
  orderedServiceIds: string[],
): Promise<ServiceRecommended[]> {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(`DELETE FROM service_recommended`).run();
  let pos = 1;
  for (const id of orderedServiceIds) {
    await SITE_DB.prepare(
      `INSERT INTO service_recommended (service_id, position) VALUES (?, ?)`,
    )
      .bind(id, pos++)
      .run();
  }
  await publishServicesCatalog();
  return listRecommended();
}

export async function saveServicePage(page: ServicePage): Promise<ServicePage> {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(
    `INSERT INTO service_pages
       (service_id, synopsis_ro, synopsis_en, synopsis_bg,
        body_json_ro, body_json_en, body_json_bg, images_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(service_id) DO UPDATE SET
       synopsis_ro = excluded.synopsis_ro,
       synopsis_en = excluded.synopsis_en,
       synopsis_bg = excluded.synopsis_bg,
       body_json_ro = excluded.body_json_ro,
       body_json_en = excluded.body_json_en,
       body_json_bg = excluded.body_json_bg,
       images_json = excluded.images_json,
       updated_at = datetime('now')`,
  )
    .bind(
      page.service_id,
      page.synopsis.ro,
      page.synopsis.en,
      page.synopsis.bg,
      JSON.stringify(page.paragraphs.ro ?? []),
      JSON.stringify(page.paragraphs.en ?? []),
      JSON.stringify(page.paragraphs.bg ?? []),
      JSON.stringify(page.images ?? []),
    )
    .run();

  const service = await getService(page.service_id);
  if (service) await publishServicePage(service);
  return getServicePage(page.service_id);
}

export async function buildCatalogDocument(): Promise<ServicesCatalogDocument> {
  const [categories, subcategories, services, recommended] = await Promise.all([
    listCategories(),
    listSubcategories(),
    listServices(),
    listRecommended(),
  ]);
  const byId = new Map(services.map((s) => [s.id, s]));
  return {
    recommended: recommended
      .map((r) => byId.get(r.service_id)?.slug)
      .filter((s): s is string => Boolean(s)),
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
    services: services.map((s) => ({
      id: s.id,
      slug: s.slug,
      position: s.position,
      title: s.title,
      categoryId: s.category_id,
      subcategoryId: s.subcategory_id,
      price: s.price_text,
      currency: s.currency,
      iconSvg: s.icon_svg,
      pagePath: s.page_path,
      enabled: s.enabled,
    })),
    pdfKey: SERVICES_PDF_KEY,
    pdfKeys: {
      ro: servicesPdfKeyForLocale("ro"),
      en: servicesPdfKeyForLocale("en"),
      bg: servicesPdfKeyForLocale("bg"),
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function publishServicesCatalog(): Promise<void> {
  const { CONTENT } = getEnv();
  const doc = await buildCatalogDocument();
  await CONTENT.put(SERVICES_CONTENT_KEY, JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}

export async function publishServicePage(service: ServiceRow): Promise<void> {
  const { CONTENT } = getEnv();
  const page = await getServicePage(service.id);
  const doc: ServicePageDocument = {
    slug: service.slug,
    title: service.title,
    synopsis: page.synopsis,
    paragraphs: page.paragraphs,
    images: page.images.map((img) => ({
      master: img.masterKey,
      webp: img.webpKey,
      alt: img.alt,
    })),
    categoryId: service.category_id,
    subcategoryId: service.subcategory_id,
    price: service.price_text,
    currency: service.currency,
    iconSvg: service.icon_svg,
    pagePath: service.page_path,
  };
  await CONTENT.put(
    `${SERVICES_PAGES_PREFIX}${service.slug}.json`,
    JSON.stringify(doc, null, 2),
    { httpMetadata: { contentType: "application/json" } },
  );
}

export async function publishAllServicePages(): Promise<void> {
  const services = await listServices();
  for (const s of services) {
    await publishServicePage(s);
  }
}

function buildPriceListLinesForLocale(
  locale: Locale,
  categories: ServiceCategory[],
  subcategories: ServiceSubcategory[],
  services: ServiceRow[],
): Array<{ text: string; size: number; bold?: boolean }> {
  const enabledCats = categories.filter((c) => c.enabled);
  const enabledServices = services.filter((s) => s.enabled);
  const date = new Date().toISOString().slice(0, 10);
  const lines: Array<{ text: string; size: number; bold?: boolean }> = [
    { text: PDF_TITLES[locale], size: 16, bold: true },
    { text: `${PDF_GENERATED[locale]}: ${date}`, size: 10 },
    { text: "", size: 8 },
  ];

  for (const cat of enabledCats) {
    lines.push({
      text: pickLocaleText(cat.name, locale),
      size: 13,
      bold: true,
    });
    const subs = subcategories.filter(
      (s) => s.category_id === cat.id && s.enabled,
    );
    const direct = enabledServices.filter(
      (s) => s.category_id === cat.id && !s.subcategory_id,
    );
    for (const svc of direct) {
      lines.push({
        text: `  ${pickLocaleText(svc.title, locale)} — ${svc.price_text} ${svc.currency}`,
        size: 10,
      });
    }
    for (const sub of subs) {
      lines.push({
        text: `  ${pickLocaleText(sub.name, locale)}`,
        size: 11,
        bold: true,
      });
      const under = enabledServices.filter(
        (s) => s.category_id === cat.id && s.subcategory_id === sub.id,
      );
      for (const svc of under) {
        lines.push({
          text: `    ${pickLocaleText(svc.title, locale)} — ${svc.price_text} ${svc.currency}`,
          size: 10,
        });
      }
    }
    lines.push({ text: "", size: 8 });
  }
  return lines;
}

export async function generateAndStorePriceListPdf(): Promise<{
  key: string;
  bytes: number;
  keys: Record<Locale, string>;
  bytesByLocale: Record<Locale, number>;
}> {
  const { CONTENT } = getEnv();
  const [categories, subcategories, services] = await Promise.all([
    listCategories(),
    listSubcategories(),
    listServices(),
  ]);

  const keys = {} as Record<Locale, string>;
  const bytesByLocale = {} as Record<Locale, number>;
  let primaryBytes = 0;

  for (const locale of LOCALES) {
    const lines = buildPriceListLinesForLocale(
      locale,
      categories,
      subcategories,
      services,
    );
    const bytes = buildPriceListPdf(lines);
    const key = servicesPdfKeyForLocale(locale);
    await CONTENT.put(key, bytes, {
      httpMetadata: { contentType: "application/pdf" },
    });
    keys[locale] = key;
    bytesByLocale[locale] = bytes.byteLength;
    if (locale === "ro") {
      primaryBytes = bytes.byteLength;
      await CONTENT.put(SERVICES_PDF_KEY, bytes, {
        httpMetadata: { contentType: "application/pdf" },
      });
    }
  }

  await publishServicesCatalog();
  return {
    key: SERVICES_PDF_KEY,
    bytes: primaryBytes,
    keys,
    bytesByLocale,
  };
}

export async function getPriceListPdf(
  locale: Locale = "ro",
): Promise<ArrayBuffer | null> {
  const { CONTENT } = getEnv();
  const key = servicesPdfKeyForLocale(locale);
  let obj = await CONTENT.get(key);
  if (!obj && locale === "ro") {
    obj = await CONTENT.get(SERVICES_PDF_KEY);
  }
  if (!obj) return null;
  return obj.arrayBuffer();
}

/** Upsert helpers for import script / API */
export async function upsertCategory(c: ServiceCategory): Promise<void> {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(
    `INSERT INTO service_categories
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

export async function upsertSubcategory(s: ServiceSubcategory): Promise<void> {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(
    `INSERT INTO service_subcategories
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

export async function upsertService(s: ServiceRow): Promise<void> {
  const { SITE_DB } = getEnv();
  const slug = s.slug.trim() || slugifyService(s.title.en || s.title.ro || s.title.bg);
  await SITE_DB.prepare(
    `INSERT INTO services
       (id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id,
        icon_id, icon_svg, price_text, currency, page_path, enabled, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       position = excluded.position,
       slug = excluded.slug,
       title_ro = excluded.title_ro,
       title_en = excluded.title_en,
       title_bg = excluded.title_bg,
       category_id = excluded.category_id,
       subcategory_id = excluded.subcategory_id,
       icon_id = excluded.icon_id,
       icon_svg = excluded.icon_svg,
       price_text = excluded.price_text,
       currency = excluded.currency,
       page_path = excluded.page_path,
       enabled = excluded.enabled,
       updated_at = datetime('now')`,
  )
    .bind(
      s.id,
      s.position,
      slug,
      s.title.ro,
      s.title.en,
      s.title.bg,
      s.category_id,
      s.subcategory_id,
      s.icon_id,
      s.icon_svg ?? "",
      priceToText(s.price_text),
      s.currency || "RON",
      s.page_path || pagePathForSlug(slug),
      s.enabled !== false ? 1 : 0,
    )
    .run();
  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO service_pages (service_id) VALUES (?)`,
  )
    .bind(s.id)
    .run();
}

export async function upsertIconByName(
  name: string,
  svg: string,
): Promise<string> {
  const { SITE_DB } = getEnv();
  const existing = await SITE_DB.prepare(
    `SELECT id FROM icons WHERE name = ? COLLATE NOCASE`,
  )
    .bind(name)
    .first<{ id: string }>();
  if (existing?.id) {
    await SITE_DB.prepare(
      `UPDATE icons SET svg = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(svg, existing.id)
      .run();
    return existing.id;
  }
  const id = crypto.randomUUID();
  const maxPos = await SITE_DB.prepare(
    `SELECT COALESCE(MAX(position), 0) AS m FROM icons`,
  ).first<{ m: number }>();
  await SITE_DB.prepare(
    `INSERT INTO icons (id, name, svg, position) VALUES (?, ?, ?, ?)`,
  )
    .bind(id, name, svg, (maxPos?.m ?? 0) + 1)
    .run();
  return id;
}
