import { getEnv } from "./env";
import {
  asFooterIconLabel,
  buildFooterDocument,
  normalizeFooterIconLink,
  serializeFooterIconLabel,
  validateFooterIconDraft,
  type FooterDocument,
  type FooterIconRow,
} from "./footer-shared";

export {
  asFooterIconLabel,
  buildFooterDocument,
  serializeFooterIconLabel,
  validateFooterIconDraft,
  type FooterDocument,
  type FooterIconRow,
};

export const FOOTER_CONTENT_KEY = "footer/footer.json";

type FooterIconDbRow = {
  id: string;
  icon_id: string | null;
  name: string;
  label: string;
  aria_label: string;
  link: string;
  position: number;
  svg: string | null;
};

export async function listFooterIcons(): Promise<FooterIconRow[]> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT f.id, f.icon_id, f.name, f.label, f.aria_label, f.link, f.position, i.svg AS svg
     FROM footer_icons f
     LEFT JOIN icons i ON i.id = f.icon_id
     ORDER BY f.position ASC`,
  ).all<FooterIconDbRow>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    icon_id: row.icon_id,
    name: row.name ?? "",
    label: asFooterIconLabel(row.label),
    aria_label: row.aria_label ?? "",
    link: row.link || "#",
    position: row.position,
    svg: row.svg,
  }));
}

export async function syncFooterJson(icons?: FooterIconRow[]) {
  const { CONTENT } = getEnv();
  const resolved = icons ?? (await listFooterIcons());
  const document = buildFooterDocument(resolved);
  await CONTENT.put(FOOTER_CONTENT_KEY, JSON.stringify(document, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return document;
}

export async function saveFooterIconsBulk(icons: FooterIconRow[]) {
  const { SITE_DB } = getEnv();
  const existing = await listFooterIcons();
  const nextIds = new Set(icons.map((i) => i.id));

  for (const old of existing) {
    if (!nextIds.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM footer_icons WHERE id = ?`).bind(old.id).run();
    }
  }

  for (const [index, icon] of icons.entries()) {
    const error = validateFooterIconDraft(icon);
    if (error) throw new Error(error);
    const position = index + 1;
    await SITE_DB.prepare(
      `INSERT INTO footer_icons
         (id, icon_id, name, label, aria_label, link, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         icon_id = excluded.icon_id,
         name = excluded.name,
         label = excluded.label,
         aria_label = excluded.aria_label,
         link = excluded.link,
         position = excluded.position,
         updated_at = datetime('now')`,
    )
      .bind(
        icon.id,
        icon.icon_id || null,
        icon.name?.trim() ?? "",
        serializeFooterIconLabel(icon.label),
        icon.aria_label?.trim() ?? "",
        normalizeFooterIconLink(icon.link),
        position,
      )
      .run();
  }

  const saved = await listFooterIcons();
  await syncFooterJson(saved);
  return saved;
}
