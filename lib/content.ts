import { getEnv } from "./env";

export async function getDraft<T>(key: string): Promise<T | null> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare("SELECT payload_json FROM content_drafts WHERE key = ?")
    .bind(key)
    .first<{ payload_json: string }>();
  if (!row) return null;
  return JSON.parse(row.payload_json) as T;
}

export async function saveDraft(key: string, payload: unknown, userId?: string) {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(
    `INSERT INTO content_drafts (key, payload_json, updated_by, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       payload_json = excluded.payload_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`,
  )
    .bind(key, JSON.stringify(payload), userId ?? null)
    .run();
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare("SELECT value_json FROM site_settings WHERE key = ?")
    .bind(key)
    .first<{ value_json: string }>();
  if (!row) return null;
  return JSON.parse(row.value_json) as T;
}

export async function saveSetting(key: string, value: unknown) {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(
    `INSERT INTO site_settings (key, value_json, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at`,
  )
    .bind(key, JSON.stringify(value))
    .run();
}

export async function publishToCloud(userId?: string) {
  const { SITE_DB, CONTENT } = getEnv();
  const { listIcons, syncIconsJson } = await import("./icons");
  const drafts = await SITE_DB.prepare("SELECT key, payload_json FROM content_drafts").all<{
    key: string;
    payload_json: string;
  }>();

  const version = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = `published/${version}`;

  for (const draft of drafts.results ?? []) {
    await CONTENT.put(`${prefix}/${draft.key}.json`, draft.payload_json, {
      httpMetadata: { contentType: "application/json" },
    });
    await CONTENT.put(`published/latest/${draft.key}.json`, draft.payload_json, {
      httpMetadata: { contentType: "application/json" },
    });
  }

  const icons = await listIcons();
  await syncIconsJson(icons);
  const iconsPayload = JSON.stringify(
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
  await CONTENT.put(`${prefix}/icons.json`, iconsPayload, {
    httpMetadata: { contentType: "application/json" },
  });

  const settings = await SITE_DB.prepare("SELECT key, value_json FROM site_settings").all<{
    key: string;
    value_json: string;
  }>();
  const settingsMap: Record<string, unknown> = {};
  for (const row of settings.results ?? []) {
    settingsMap[row.key] = JSON.parse(row.value_json);
  }
  if (settingsMap.ai && typeof settingsMap.ai === "object") {
    settingsMap.ai = { ...(settingsMap.ai as object), apiKey: undefined };
  }
  if (settingsMap.email && typeof settingsMap.email === "object") {
    settingsMap.email = { ...(settingsMap.email as object), resendApiKey: undefined };
  }
  await CONTENT.put(`${prefix}/settings.json`, JSON.stringify(settingsMap), {
    httpMetadata: { contentType: "application/json" },
  });
  await CONTENT.put(`published/latest/settings.json`, JSON.stringify(settingsMap), {
    httpMetadata: { contentType: "application/json" },
  });

  const id = crypto.randomUUID();
  await SITE_DB.prepare(
    `INSERT INTO publish_log (id, version, r2_prefix, created_by) VALUES (?, ?, ?, ?)`,
  )
    .bind(id, version, prefix, userId ?? null)
    .run();

  return { id, version, prefix };
}

export async function listMedia(prefix = "media/") {
  const { MEDIA } = getEnv();
  const listed = await MEDIA.list({ prefix });
  return listed.objects.map((obj) => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded?.toISOString?.() ?? null,
    httpMetadata: obj.httpMetadata,
  }));
}

export async function putMedia(
  key: string,
  body: ArrayBuffer | ReadableStream | string,
  contentType: string,
) {
  const { MEDIA } = getEnv();
  await MEDIA.put(key, body, { httpMetadata: { contentType } });
  return key;
}
