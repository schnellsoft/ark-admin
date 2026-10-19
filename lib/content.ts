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

/**
 * Refuse to overwrite a non-empty R2 catalog with an empty publish payload.
 * Protects production when remote D1 is missing rows that still exist in R2.
 */
async function putCatalogUnlessEmptyWipe(
  key: string,
  payload: string,
  isEmpty: (parsed: unknown) => boolean,
): Promise<"written" | "skipped"> {
  const { CONTENT } = getEnv();
  let next: unknown;
  try {
    next = JSON.parse(payload);
  } catch {
    await CONTENT.put(key, payload, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
    return "written";
  }
  if (isEmpty(next)) {
    const existing = await CONTENT.get(key);
    if (existing) {
      try {
        const prev = await existing.json();
        if (!isEmpty(prev)) {
          console.warn(
            `[publish] skip empty wipe for ${key} — remote D1 empty but R2 still has content`,
          );
          return "skipped";
        }
      } catch {
        /* fall through and write */
      }
    }
  }
  await CONTENT.put(key, payload, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return "written";
}

function catalogArrayEmpty(doc: unknown, field: string): boolean {
  if (!doc || typeof doc !== "object") return true;
  const arr = (doc as Record<string, unknown>)[field];
  return !Array.isArray(arr) || arr.length === 0;
}

/** Republish every CMS module catalog into the R2 keys the static site syncs. */
async function republishAllModules() {
  const { listIcons, syncIconsJson, ICONS_CONTENT_KEY } = await import("./icons");
  const {
    listSlideshowSlides,
    getSlideshowSettings,
    buildSlideshowDocument,
    SLIDESHOW_CONTENT_KEY,
  } = await import("./slideshow");
  const { syncHeaderMenuJson } = await import("./header-menu");
  const { refreshHeaderIconsJsonFromDb } = await import("./header-icons");
  const { syncFooterJson } = await import("./footer");
  const { syncLibraryJson } = await import("./library");
  const { publishSchedule } = await import("./schedule");
  const { publishLocation } = await import("./location");
  const { publishContact } = await import("./contact");
  const { publishServicesCatalog, publishAllServicePages } = await import("./services");
  const { buildStuffCatalogDocument } = await import("./stuff");
  const { STUFF_CONTENT_KEY } = await import("./stuff-shared");
  const { listArticles, publishArticlePage, buildArticlesCatalogDocument } =
    await import("./articles");
  const { ARTICLES_CONTENT_KEY } = await import("./articles-shared");
  const { listGalleries, publishGallery } = await import("./galleries");
  const { CONTENT } = getEnv();

  const icons = await listIcons();
  if (icons.length > 0) {
    await syncIconsJson(icons);
  } else {
    await putCatalogUnlessEmptyWipe(
      ICONS_CONTENT_KEY,
      JSON.stringify({ icons: [] }, null, 2),
      (d) => catalogArrayEmpty(d, "icons"),
    );
  }

  {
    const settings = await getSlideshowSettings();
    const slides = await listSlideshowSlides();
    const document = buildSlideshowDocument(settings, slides);
    await putCatalogUnlessEmptyWipe(
      SLIDESHOW_CONTENT_KEY,
      JSON.stringify(document, null, 2),
      (d) => catalogArrayEmpty(d, "slides"),
    );
  }

  await syncHeaderMenuJson();
  await refreshHeaderIconsJsonFromDb();
  await syncFooterJson();
  await syncLibraryJson();
  await publishSchedule();
  await publishLocation();
  await publishContact();
  await publishServicesCatalog();
  await publishAllServicePages();

  {
    const doc = await buildStuffCatalogDocument();
    await putCatalogUnlessEmptyWipe(
      STUFF_CONTENT_KEY,
      JSON.stringify(doc, null, 2),
      (d) => catalogArrayEmpty(d, "members"),
    );
  }

  {
    const doc = await buildArticlesCatalogDocument();
    await putCatalogUnlessEmptyWipe(
      ARTICLES_CONTENT_KEY,
      JSON.stringify(doc, null, 2),
      (d) => catalogArrayEmpty(d, "articles"),
    );
  }
  for (const article of await listArticles()) {
    await publishArticlePage(article.id);
  }
  for (const gallery of await listGalleries()) {
    await publishGallery(gallery.id);
  }

  // Public site settings blob (no secrets) used by ark-site sync:settings.
  const site = (await getSetting<{ domain?: string; adminApiUrl?: string }>("site")) ?? {
    domain: "",
    adminApiUrl: "",
  };
  await CONTENT.put(
    "settings/site.json",
    JSON.stringify(
      {
        domain: String(site.domain ?? "").trim(),
        adminApiUrl: String(site.adminApiUrl ?? "").trim(),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { httpMetadata: { contentType: "application/json; charset=utf-8" } },
  );
}

/**
 * Ask the static site to rebuild from R2.
 * Prefer Cloudflare Workers Builds deploy hook (SITE_DEPLOY_HOOK_URL).
 * Optionally also dispatch a GitHub Actions workflow (SITE_REBUILD_GITHUB_*).
 */
async function triggerSiteRebuild(): Promise<{
  deployHook: "ok" | "skipped" | "failed";
  github: "ok" | "skipped" | "failed";
  detail?: string;
}> {
  const env = getEnv() as ReturnType<typeof getEnv> & {
    SITE_DEPLOY_HOOK_URL?: string;
    SITE_REBUILD_GITHUB_TOKEN?: string;
    SITE_REBUILD_GITHUB_REPO?: string;
  };

  let deployHook: "ok" | "skipped" | "failed" = "skipped";
  let github: "ok" | "skipped" | "failed" = "skipped";
  const details: string[] = [];

  const hookUrl = env.SITE_DEPLOY_HOOK_URL?.trim();
  if (hookUrl && /^https:\/\//i.test(hookUrl)) {
    try {
      const res = await fetch(hookUrl, { method: "POST" });
      if (res.ok) {
        deployHook = "ok";
      } else {
        deployHook = "failed";
        details.push(`deploy-hook HTTP ${res.status}`);
      }
    } catch (error) {
      deployHook = "failed";
      details.push(
        `deploy-hook ${error instanceof Error ? error.message : "request failed"}`,
      );
    }
  }

  const token = env.SITE_REBUILD_GITHUB_TOKEN?.trim();
  const repo = (env.SITE_REBUILD_GITHUB_REPO?.trim() || "schnellsoft/ark-site").replace(
    /^https?:\/\/github\.com\//,
    "",
  );
  // Ignore placeholder secrets used only to satisfy binding requirements.
  if (token && token.length > 20 && !token.startsWith("unset")) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "ark-site-rebuild",
          client_payload: { source: "ark-admin-save-to-cloud" },
        }),
      });
      // GitHub returns 204 No Content on success.
      if (res.status === 204 || res.ok) {
        github = "ok";
      } else {
        github = "failed";
        details.push(`github-dispatch HTTP ${res.status}`);
      }
    } catch (error) {
      github = "failed";
      details.push(
        `github-dispatch ${error instanceof Error ? error.message : "request failed"}`,
      );
    }
  }

  return {
    deployHook,
    github,
    detail: details.length ? details.join("; ") : undefined,
  };
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

  // Ensure module paths the static site syncs are current (not only drafts snapshot).
  await republishAllModules();

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

  const rebuild = await triggerSiteRebuild();

  const id = crypto.randomUUID();
  await SITE_DB.prepare(
    `INSERT INTO publish_log (id, version, r2_prefix, created_by) VALUES (?, ?, ?, ?)`,
  )
    .bind(id, version, prefix, userId ?? null)
    .run();

  return { id, version, prefix, rebuild };
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
