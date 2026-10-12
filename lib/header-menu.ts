import { getEnv } from "./env";
import {
  asMenuLabel,
  buildHeaderMenuDocument,
  buildMenuTree,
  emptyHeaderMenuSettings,
  flattenMenuTree,
  serializeMenuLabel,
  validateMenuItemDraft,
  type HeaderMenuItem,
  type HeaderMenuSettings,
} from "./header-menu-shared";
import { normalizeHeaderIconHex, normalizeHeaderIconLink } from "./header-icons-shared";

export {
  buildHeaderMenuDocument,
  buildMenuTree,
  emptyHeaderMenuSettings,
  flattenMenuTree,
  validateMenuItemDraft,
  type HeaderMenuItem,
  type HeaderMenuSettings,
};

export const HEADER_MENU_CONTENT_KEY = "header/menu/header_menu.json";

type MenuDbRow = {
  id: string;
  parent_id: string | null;
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

export async function getHeaderMenuSettings(): Promise<HeaderMenuSettings> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT more, max_width, color, color_hover FROM header_menu_settings WHERE id = 1`,
  ).first<{ more: number; max_width: string; color: string; color_hover: string }>();
  if (!row) return emptyHeaderMenuSettings();
  return {
    more: Boolean(row.more),
    maxWidth: String(row.max_width || "400").replace(/px$/i, ""),
    color: row.color ?? "",
    colorHover: row.color_hover ?? "",
  };
}

export async function listHeaderMenuItemsFlat(): Promise<HeaderMenuItem[]> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT m.id, m.parent_id, m.icon_id, m.name, m.label, m.description, m.aria_label,
            m.link, m.color, m.color_hover, m.position, i.svg AS svg
     FROM header_menu_items m
     LEFT JOIN icons i ON i.id = m.icon_id
     ORDER BY m.position ASC`,
  ).all<MenuDbRow>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    parent_id: row.parent_id,
    icon_id: row.icon_id,
    name: row.name ?? "",
    label: asMenuLabel(row.label),
    description: row.description ?? "",
    aria_label: row.aria_label ?? "",
    link: row.link || "#",
    color: row.color ?? "",
    color_hover: row.color_hover ?? "",
    position: row.position,
    svg: row.svg,
  }));
}

export async function listHeaderMenuTree(): Promise<HeaderMenuItem[]> {
  return buildMenuTree(await listHeaderMenuItemsFlat());
}

export async function syncHeaderMenuJson(
  settings?: HeaderMenuSettings,
  tree?: HeaderMenuItem[],
) {
  const { CONTENT } = getEnv();
  const resolvedSettings = settings ?? (await getHeaderMenuSettings());
  const resolvedTree = tree ?? (await listHeaderMenuTree());
  const document = buildHeaderMenuDocument(resolvedSettings, resolvedTree);
  await CONTENT.put(HEADER_MENU_CONTENT_KEY, JSON.stringify(document, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return document;
}

export async function saveHeaderMenuSettings(settings: HeaderMenuSettings) {
  const { SITE_DB } = getEnv();
  const maxWidth = String(settings.maxWidth || "400").replace(/[^\d]/g, "") || "400";
  await SITE_DB.prepare(
    `INSERT INTO header_menu_settings (id, more, max_width, color, color_hover, updated_at)
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

  const saved = await getHeaderMenuSettings();
  await syncHeaderMenuJson(saved);
  return saved;
}

export async function saveHeaderMenuTree(tree: HeaderMenuItem[]) {
  const { SITE_DB } = getEnv();
  const flat = flattenMenuTree(tree);
  const existing = await listHeaderMenuItemsFlat();
  const nextIds = new Set(flat.map((i) => i.id));

  for (const old of existing) {
    if (!nextIds.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM header_menu_items WHERE id = ?`).bind(old.id).run();
    }
  }

  for (const item of flat) {
    const err = validateMenuItemDraft(item);
    if (err) throw new Error(err);
    const hasChildren = flat.some((c) => c.parent_id === item.id);
    const link = hasChildren ? "#" : normalizeHeaderIconLink(item.link);
    await SITE_DB.prepare(
      `INSERT INTO header_menu_items
         (id, parent_id, icon_id, name, label, description, aria_label, link, color, color_hover, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         parent_id = excluded.parent_id,
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
        item.id,
        item.parent_id,
        item.icon_id || null,
        item.name?.trim() ?? "",
        serializeMenuLabel(item.label),
        item.description?.trim() ?? "",
        item.aria_label?.trim() ?? "",
        link,
        normalizeHeaderIconHex(item.color),
        normalizeHeaderIconHex(item.color_hover),
        item.position,
      )
      .run();
  }

  const saved = await listHeaderMenuTree();
  await syncHeaderMenuJson(undefined, saved);
  return saved;
}
