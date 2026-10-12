import { getEnv } from "./env";
import {
  asHeaderIconLabel,
  buildHeaderIconsDocument,
  emptyHeaderIconSettings,
  normalizeHeaderIconHex,
  normalizeHeaderIconLink,
  serializeHeaderIconLabel,
  validateHeaderIconDraft,
  type HeaderIconRow,
  type HeaderIconSettings,
  type HeaderIconsDocument,
} from "./header-icons-shared";

export {
  asHeaderIconLabel,
  buildHeaderIconsDocument,
  emptyHeaderIconSettings,
  serializeHeaderIconLabel,
  validateHeaderIconDraft,
  type HeaderIconRow,
  type HeaderIconSettings,
  type HeaderIconsDocument,
};

export const HEADER_ICONS_CONTENT_KEY = "header/icons/header_icons.json";

type HeaderIconDbRow = {
  id: string;
  icon_id: string | null;
  name: string;
  label: string;
  description: string;
  aria_label: string;
  link: string;
  color: string;
  color_hover: string;
  position: number;
  svg: string | null;
};

export async function getHeaderIconSettings(): Promise<HeaderIconSettings> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT more, max_width, color, color_hover FROM header_icon_settings WHERE id = 1`,
  ).first<{ more: number; max_width: string; color?: string; color_hover?: string }>();
  if (!row) return emptyHeaderIconSettings();
  return {
    more: Boolean(row.more),
    maxWidth: String(row.max_width || "200").replace(/px$/i, ""),
    color: row.color ?? "",
    colorHover: row.color_hover ?? "",
  };
}

export async function listHeaderIcons(): Promise<HeaderIconRow[]> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT h.id, h.icon_id, h.name, h.label, h.description, h.aria_label, h.link,
            h.color, h.color_hover, h.position, i.svg AS svg
     FROM header_icons h
     LEFT JOIN icons i ON i.id = h.icon_id
     ORDER BY h.position ASC`,
  ).all<HeaderIconDbRow>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    icon_id: row.icon_id,
    name: row.name ?? "",
    label: asHeaderIconLabel(row.label),
    description: row.description ?? "",
    aria_label: row.aria_label ?? "",
    link: row.link || "#",
    color: row.color ?? "",
    color_hover: row.color_hover ?? "",
    position: row.position,
    svg: row.svg,
  }));
}

export async function syncHeaderIconsJson(
  settings?: HeaderIconSettings,
  icons?: HeaderIconRow[],
) {
  const { CONTENT } = getEnv();
  const resolvedSettings = settings ?? (await getHeaderIconSettings());
  const resolvedIcons = icons ?? (await listHeaderIcons());
  const document = buildHeaderIconsDocument(resolvedSettings, resolvedIcons);
  await CONTENT.put(HEADER_ICONS_CONTENT_KEY, JSON.stringify(document, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return document;
}

export async function saveHeaderIconSettings(settings: HeaderIconSettings) {
  const { SITE_DB } = getEnv();
  const maxWidth = String(settings.maxWidth || "200").replace(/[^\d]/g, "") || "200";
  await SITE_DB.prepare(
    `INSERT INTO header_icon_settings (id, more, max_width, color, color_hover, updated_at)
     VALUES (1, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       more = excluded.more,
       max_width = excluded.max_width,
       color = excluded.color,
       color_hover = excluded.color_hover,
       updated_at = excluded.updated_at`,
  )
    .bind(
      settings.more ? 1 : 0,
      maxWidth,
      normalizeHeaderIconHex(settings.color),
      normalizeHeaderIconHex(settings.colorHover),
    )
    .run();

  const saved = await getHeaderIconSettings();
  await syncHeaderIconsJson(saved);
  return saved;
}

export async function saveHeaderIconsBulk(icons: HeaderIconRow[]) {
  const { SITE_DB } = getEnv();
  const existing = await listHeaderIcons();
  const nextIds = new Set(icons.map((i) => i.id));

  for (const old of existing) {
    if (!nextIds.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM header_icons WHERE id = ?`).bind(old.id).run();
    }
  }

  for (const [index, icon] of icons.entries()) {
    const error = validateHeaderIconDraft(icon);
    if (error) throw new Error(error);
    const position = index + 1;
    await SITE_DB.prepare(
      `INSERT INTO header_icons
         (id, icon_id, name, label, description, aria_label, link, color, color_hover, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         icon_id = excluded.icon_id,
         name = excluded.name,
         label = excluded.label,
         description = excluded.description,
         aria_label = excluded.aria_label,
         link = excluded.link,
         color = excluded.color,
         color_hover = excluded.color_hover,
         position = excluded.position,
         updated_at = datetime('now')`,
    )
      .bind(
        icon.id,
        icon.icon_id || null,
        icon.name?.trim() ?? "",
        serializeHeaderIconLabel(icon.label),
        icon.description?.trim() ?? "",
        icon.aria_label?.trim() ?? "",
        normalizeHeaderIconLink(icon.link),
        normalizeHeaderIconHex(icon.color),
        normalizeHeaderIconHex(icon.color_hover),
        position,
      )
      .run();
  }

  const saved = await listHeaderIcons();
  await syncHeaderIconsJson(undefined, saved);
  return saved;
}

/** Rewrite R2 JSON from current DB state (e.g. after label schema migration). */
export async function refreshHeaderIconsJsonFromDb() {
  return syncHeaderIconsJson();
}

/**
 * Normalize legacy plain-string labels to LocaleMap JSON in D1,
 * then rewrite header_icons.json so Astro always sees { ro, bg, en }.
 */
export async function ensureHeaderIconLabelsI18n() {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(`SELECT id, label FROM header_icons`).all<{
    id: string;
    label: string;
  }>();

  let changed = false;
  for (const row of rows.results ?? []) {
    const serialized = serializeHeaderIconLabel(row.label);
    if (serialized !== (row.label ?? "")) {
      await SITE_DB.prepare(
        `UPDATE header_icons SET label = ?, updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(serialized, row.id)
        .run();
      changed = true;
    }
  }

  if (changed || (rows.results?.length ?? 0) >= 0) {
    await syncHeaderIconsJson();
  }
}
