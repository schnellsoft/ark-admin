import { getEnv } from "./env";

export type IconRow = {
  id: string;
  name: string;
  svg: string;
  position: number;
  created_at?: string;
  updated_at?: string;
};

export async function listIcons(): Promise<IconRow[]> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT id, name, svg, position, created_at, updated_at FROM icons ORDER BY position ASC`,
  ).all<IconRow>();
  return rows.results ?? [];
}

export async function isIconNameUnique(name: string, excludeId?: string) {
  const { SITE_DB } = getEnv();
  const normalized = name.trim();
  if (!normalized) return false;
  const row = excludeId
    ? await SITE_DB.prepare(
        `SELECT id FROM icons WHERE lower(name) = lower(?) AND id != ? LIMIT 1`,
      )
        .bind(normalized, excludeId)
        .first()
    : await SITE_DB.prepare(`SELECT id FROM icons WHERE lower(name) = lower(?) LIMIT 1`)
        .bind(normalized)
        .first();
  return !row;
}

export async function syncIconsJson(icons: IconRow[]) {
  const { CONTENT } = getEnv();
  const payload = JSON.stringify(
    {
      icons: icons.map((i) => ({
        id: i.id,
        name: i.name,
        svg: i.svg,
        position: i.position,
      })),
    },
    null,
    2,
  );
  await CONTENT.put("published/latest/icons.json", payload, {
    httpMetadata: { contentType: "application/json" },
  });
}

/** Remove icon name / svg occurrences from draft JSON and published latest JSON packs. */
export async function scrubIconFromJsonFiles(name: string, svg: string) {
  const { SITE_DB, CONTENT } = getEnv();
  const needleName = name.trim();
  const needleSvg = svg.trim();

  const drafts = await SITE_DB.prepare(`SELECT key, payload_json FROM content_drafts`).all<{
    key: string;
    payload_json: string;
  }>();

  for (const draft of drafts.results ?? []) {
    const cleaned = scrubJsonText(draft.payload_json, needleName, needleSvg);
    if (cleaned !== draft.payload_json) {
      await SITE_DB.prepare(
        `UPDATE content_drafts SET payload_json = ?, updated_at = datetime('now') WHERE key = ?`,
      )
        .bind(cleaned, draft.key)
        .run();
      await CONTENT.put(`published/latest/${draft.key}.json`, cleaned, {
        httpMetadata: { contentType: "application/json" },
      });
    }
  }

  // Also scrub any other latest JSON objects in R2
  const listed = await CONTENT.list({ prefix: "published/latest/" });
  for (const obj of listed.objects) {
    if (!obj.key.endsWith(".json") || obj.key.endsWith("/icons.json")) continue;
    const body = await CONTENT.get(obj.key);
    if (!body) continue;
    const text = await body.text();
    const cleaned = scrubJsonText(text, needleName, needleSvg);
    if (cleaned !== text) {
      await CONTENT.put(obj.key, cleaned, {
        httpMetadata: { contentType: "application/json" },
      });
    }
  }
}

function scrubJsonText(text: string, name: string, svg: string): string {
  let next = text;
  if (svg) {
    next = next.split(svg).join("");
  }
  if (name) {
    // Remove JSON string values equal to the icon name, and bare name tokens in strings
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(`"${escaped}"`, "gi"), '""');
    next = next.replace(new RegExp(`\\\\u003csvg[\\s\\S]*?${escaped}[\\s\\S]*?svg\\\\u003e`, "gi"), "");
  }
  // Collapse empty SVG leftovers
  next = next.replace(/<svg[\s\S]*?<\/svg>/gi, (block) => {
    if (name && block.toLowerCase().includes(name.toLowerCase())) return "";
    if (svg && block.includes(svg.slice(0, Math.min(40, svg.length)))) return "";
    return block;
  });
  return next;
}

export async function saveIconsBulk(icons: IconRow[]) {
  const { SITE_DB } = getEnv();
  const existing = await listIcons();
  const nextIds = new Set(icons.map((i) => i.id));

  for (const old of existing) {
    if (!nextIds.has(old.id)) {
      await scrubIconFromJsonFiles(old.name, old.svg);
      await SITE_DB.prepare(`DELETE FROM icons WHERE id = ?`).bind(old.id).run();
    }
  }

  for (const [index, icon] of icons.entries()) {
    const position = index + 1;
    const unique = await isIconNameUnique(icon.name, icon.id);
    if (!unique) {
      throw new Error(`Icon name not unique: ${icon.name}`);
    }
    await SITE_DB.prepare(
      `INSERT INTO icons (id, name, svg, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         svg = excluded.svg,
         position = excluded.position,
         updated_at = datetime('now')`,
    )
      .bind(icon.id, icon.name.trim(), icon.svg, position)
      .run();
  }

  const saved = await listIcons();
  await syncIconsJson(saved);
  return saved;
}
