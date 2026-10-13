import { getEnv } from "./env";
import {
  SLIDESHOW_CONTENT_KEY,
  SLIDESHOW_HTML_PREFIX,
  SLIDESHOW_MEDIA_PREFIX,
  buildSlideshowDocument,
  emptySlideshowSettings,
  htmlHasLayerContent,
  normalizeSlideshowSettings,
  parseImageFilters,
  parseDesktopCrop,
  parseImageFocus,
  parseMobileCrop,
  parseSlideFiles,
  parseSlideLayer,
  parseSlideshowOutput,
  shortVersionHash,
  validateSlideDraft,
  type DesktopCrop,
  type ImageFilters,
  type ImageFocus,
  type MobileCrop,
  type SlideFiles,
  type SlideLayer,
  type SlideshowDocument,
  type SlideshowSettings,
  type SlideshowSlide,
} from "./slideshow-shared";

export * from "./slideshow-shared";

type SettingsDb = {
  animation: string;
  autoplay: number;
  autoplay_interval: number;
  animation_duration: number | null;
  kenburns: number | null;
  finite: number;
  pause_on_hover: number;
  velocity: number;
  swipe_threshold: number | null;
  ratio: string;
  min_height: string;
  max_height: string;
  idx: number;
  output_json: string | null;
};

type SlideDb = {
  id: string;
  position: number;
  title: string | null;
  alt: string;
  enabled: number | null;
  media_kind: string;
  version: string;
  mobile_crop_json: string;
  desktop_crop_json: string | null;
  desktop_focus_json: string | null;
  filters_json: string | null;
  files_json: string;
  layer_json: string;
  library_asset_id: string | null;
};

function mapSlide(row: SlideDb): SlideshowSlide {
  return {
    id: row.id,
    position: row.position,
    title: row.title ?? "",
    alt: row.alt ?? "",
    enabled: row.enabled == null ? true : Boolean(row.enabled),
    media_kind: row.media_kind === "video" ? "video" : "image",
    version: row.version ?? "",
    mobileCrop: parseMobileCrop(row.mobile_crop_json),
    desktopCrop: parseDesktopCrop(row.desktop_crop_json),
    desktopFocus: parseImageFocus(row.desktop_focus_json),
    filters: parseImageFilters(row.filters_json),
    files: parseSlideFiles(row.files_json),
    layer: parseSlideLayer(row.layer_json),
    library_asset_id: row.library_asset_id,
  };
}

export async function getSlideshowSettings(): Promise<SlideshowSettings> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT animation, autoplay, autoplay_interval, animation_duration, kenburns,
            finite, pause_on_hover, velocity, swipe_threshold,
            ratio, min_height, max_height, idx, output_json
     FROM slideshow_settings WHERE id = 1`,
  ).first<SettingsDb>();
  if (!row) return emptySlideshowSettings();
  return normalizeSlideshowSettings({
    animation: row.animation,
    autoplay: Boolean(row.autoplay),
    autoplayInterval: row.autoplay_interval,
    animationDuration: row.animation_duration ?? 780,
    kenburns: row.kenburns == null ? true : Boolean(row.kenburns),
    finite: Boolean(row.finite),
    pauseOnHover: Boolean(row.pause_on_hover),
    velocity: row.velocity,
    swipeThreshold: row.swipe_threshold ?? 48,
    ratio: row.ratio,
    minHeight: row.min_height,
    maxHeight: row.max_height,
    index: row.idx,
    output: parseSlideshowOutput(row.output_json),
  });
}

async function enrichLayerFlags(slide: SlideshowSlide): Promise<SlideshowSlide> {
  if (!slide.layer) return slide;
  if (
    typeof slide.layer.hasDesktopHtml === "boolean" ||
    typeof slide.layer.hasMobileHtml === "boolean"
  ) {
    return slide;
  }
  const [desktopHtml, mobileHtml] = await Promise.all([
    getSlideLayerHtml(slide.id, false),
    getSlideLayerHtml(slide.id, true),
  ]);
  const hasDesktopHtml = htmlHasLayerContent(desktopHtml);
  const mobileSame =
    slide.layer.mobile &&
    "sameAsDesktop" in slide.layer.mobile &&
    slide.layer.mobile.sameAsDesktop;
  const hasMobileHtml = mobileSame
    ? hasDesktopHtml
    : htmlHasLayerContent(mobileHtml);
  return {
    ...slide,
    layer: {
      ...slide.layer,
      hasDesktopHtml,
      hasMobileHtml,
    },
  };
}

export async function listSlideshowSlides(): Promise<SlideshowSlide[]> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT id, position, title, alt, enabled, media_kind, version, mobile_crop_json,
            desktop_crop_json, desktop_focus_json,
            filters_json, files_json, layer_json, library_asset_id
     FROM slideshow_slides ORDER BY position ASC`,
  ).all<SlideDb>();

  const slides = (rows.results ?? []).map(mapSlide);
  return Promise.all(slides.map(enrichLayerFlags));
}

export async function getSlideshowSlide(id: string): Promise<SlideshowSlide | null> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT id, position, title, alt, enabled, media_kind, version, mobile_crop_json,
            desktop_crop_json, desktop_focus_json,
            filters_json, files_json, layer_json, library_asset_id
     FROM slideshow_slides WHERE id = ?`,
  )
    .bind(id)
    .first<SlideDb>();
  return row ? mapSlide(row) : null;
}

export async function syncSlideshowJson(
  settings?: SlideshowSettings,
  slides?: SlideshowSlide[],
): Promise<SlideshowDocument> {
  const { CONTENT } = getEnv();
  const resolvedSettings = settings ?? (await getSlideshowSettings());
  const resolvedSlides = slides ?? (await listSlideshowSlides());
  const document = buildSlideshowDocument(resolvedSettings, resolvedSlides);
  await CONTENT.put(SLIDESHOW_CONTENT_KEY, JSON.stringify(document, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return document;
}

export async function saveSlideshowSettings(
  settings: SlideshowSettings,
): Promise<SlideshowSettings> {
  const { SITE_DB } = getEnv();
  const next = normalizeSlideshowSettings(settings);
  await SITE_DB.prepare(
    `INSERT INTO slideshow_settings
       (id, animation, autoplay, autoplay_interval, animation_duration, kenburns,
        finite, pause_on_hover, velocity, swipe_threshold, ratio, min_height, max_height,
        idx, output_json, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       animation = excluded.animation,
       autoplay = excluded.autoplay,
       autoplay_interval = excluded.autoplay_interval,
       animation_duration = excluded.animation_duration,
       kenburns = excluded.kenburns,
       finite = excluded.finite,
       pause_on_hover = excluded.pause_on_hover,
       velocity = excluded.velocity,
       swipe_threshold = excluded.swipe_threshold,
       ratio = excluded.ratio,
       min_height = excluded.min_height,
       max_height = excluded.max_height,
       idx = excluded.idx,
       output_json = excluded.output_json,
       updated_at = excluded.updated_at`,
  )
    .bind(
      next.animation,
      next.autoplay ? 1 : 0,
      next.autoplayInterval,
      next.animationDuration,
      next.kenburns ? 1 : 0,
      next.finite ? 1 : 0,
      next.pauseOnHover ? 1 : 0,
      next.velocity,
      next.swipeThreshold,
      next.ratio,
      next.minHeight,
      next.maxHeight,
      next.index,
      JSON.stringify(next.output),
    )
    .run();
  const saved = await getSlideshowSettings();
  await syncSlideshowJson(saved);
  return saved;
}

async function deleteSlideFolder(slideId: string) {
  const { MEDIA } = getEnv();
  const prefix = `${SLIDESHOW_MEDIA_PREFIX}${slideId}/`;
  const listed = await MEDIA.list({ prefix });
  for (const obj of listed.objects) {
    await MEDIA.delete(obj.key);
  }
}

async function deleteSlideHtml(slideId: string) {
  const { CONTENT } = getEnv();
  await CONTENT.delete(`${SLIDESHOW_HTML_PREFIX}${slideId}.html`);
  await CONTENT.delete(`${SLIDESHOW_HTML_PREFIX}${slideId}.mobile.html`);
}

export async function saveSlideshowSlidesBulk(
  slides: SlideshowSlide[],
): Promise<SlideshowSlide[]> {
  const { SITE_DB } = getEnv();
  const existing = await listSlideshowSlides();
  const nextIds = new Set(slides.map((s) => s.id));

  for (const old of existing) {
    if (!nextIds.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM slideshow_slides WHERE id = ?`)
        .bind(old.id)
        .run();
      await deleteSlideFolder(old.id);
      await deleteSlideHtml(old.id);
    }
  }

  for (const [index, slide] of slides.entries()) {
    const error = validateSlideDraft(slide);
    if (error) throw new Error(error);
    const prior = existing.find((e) => e.id === slide.id);
    await SITE_DB.prepare(
      `INSERT INTO slideshow_slides
         (id, position, title, alt, enabled, media_kind, version, mobile_crop_json,
          desktop_crop_json, desktop_focus_json,
          filters_json, files_json, layer_json, library_asset_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         title = excluded.title,
         alt = excluded.alt,
         enabled = excluded.enabled,
         media_kind = excluded.media_kind,
         version = excluded.version,
         mobile_crop_json = excluded.mobile_crop_json,
         desktop_crop_json = excluded.desktop_crop_json,
         desktop_focus_json = excluded.desktop_focus_json,
         filters_json = excluded.filters_json,
         files_json = excluded.files_json,
         layer_json = excluded.layer_json,
         library_asset_id = excluded.library_asset_id,
         updated_at = datetime('now')`,
    )
      .bind(
        slide.id,
        index + 1,
        slide.title?.trim() ?? "",
        slide.alt?.trim() ?? "",
        slide.enabled === false ? 0 : 1,
        slide.media_kind === "video" ? "video" : "image",
        slide.version || prior?.version || "",
        slide.mobileCrop ? JSON.stringify(slide.mobileCrop) : "",
        slide.desktopCrop
          ? JSON.stringify(slide.desktopCrop)
          : prior?.desktopCrop
            ? JSON.stringify(prior.desktopCrop)
            : "",
        slide.desktopFocus
          ? JSON.stringify(slide.desktopFocus)
          : prior?.desktopFocus
            ? JSON.stringify(prior.desktopFocus)
            : "",
        JSON.stringify(slide.filters ?? prior?.filters ?? {}),
        JSON.stringify(slide.files ?? prior?.files ?? {}),
        slide.layer ? JSON.stringify(slide.layer) : prior?.layer ? JSON.stringify(prior.layer) : "",
        slide.library_asset_id ?? prior?.library_asset_id ?? null,
      )
      .run();
  }

  const saved = await listSlideshowSlides();
  await syncSlideshowJson(undefined, saved);
  return saved;
}

export async function updateSlideshowSlide(
  id: string,
  patch: Partial<SlideshowSlide>,
): Promise<SlideshowSlide> {
  const existing = await getSlideshowSlide(id);
  if (!existing) throw new Error("Slide not found");

  // Only apply defined keys — Partial spreads with explicit undefined wipe fields
  // and D1 rejects bind(undefined).
  const next: SlideshowSlide = {
    ...existing,
    id: existing.id,
    position: patch.position ?? existing.position,
    title: patch.title !== undefined ? patch.title : existing.title,
    alt: patch.alt !== undefined ? patch.alt : existing.alt,
    enabled: patch.enabled !== undefined ? patch.enabled : existing.enabled,
    media_kind: patch.media_kind !== undefined ? patch.media_kind : existing.media_kind,
    version: patch.version !== undefined ? patch.version : existing.version,
    filters: patch.filters ?? existing.filters,
    files: patch.files ?? existing.files,
    layer: patch.layer !== undefined ? patch.layer : existing.layer,
    mobileCrop: patch.mobileCrop !== undefined ? patch.mobileCrop : existing.mobileCrop,
    desktopCrop: patch.desktopCrop !== undefined ? patch.desktopCrop : existing.desktopCrop,
    desktopFocus: patch.desktopFocus !== undefined ? patch.desktopFocus : existing.desktopFocus,
    library_asset_id:
      patch.library_asset_id !== undefined
        ? patch.library_asset_id
        : existing.library_asset_id,
  };
  const error = validateSlideDraft(next);
  if (error) throw new Error(error);

  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(
    `UPDATE slideshow_slides SET
       title = ?, alt = ?, enabled = ?, media_kind = ?, version = ?,
       mobile_crop_json = ?, desktop_crop_json = ?, desktop_focus_json = ?,
       filters_json = ?, files_json = ?, layer_json = ?,
       library_asset_id = ?, updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(
      next.title.trim(),
      next.alt.trim(),
      next.enabled ? 1 : 0,
      next.media_kind === "video" ? "video" : "image",
      next.version ?? "",
      next.mobileCrop ? JSON.stringify(next.mobileCrop) : "",
      next.desktopCrop ? JSON.stringify(next.desktopCrop) : "",
      next.desktopFocus ? JSON.stringify(next.desktopFocus) : "",
      JSON.stringify(next.filters ?? {}),
      JSON.stringify(next.files ?? {}),
      next.layer ? JSON.stringify(next.layer) : "",
      next.library_asset_id ?? null,
      id,
    )
    .run();

  await syncSlideshowJson();
  const saved = await getSlideshowSlide(id);
  if (!saved) throw new Error("Slide not found after update");
  return saved;
}

export async function deleteSlideshowSlide(id: string) {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(`DELETE FROM slideshow_slides WHERE id = ?`).bind(id).run();
  await deleteSlideFolder(id);
  await deleteSlideHtml(id);
  const remaining = await listSlideshowSlides();
  for (const [index, slide] of remaining.entries()) {
    if (slide.position !== index + 1) {
      await SITE_DB.prepare(
        `UPDATE slideshow_slides SET position = ?, updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(index + 1, slide.id)
        .run();
    }
  }
  await syncSlideshowJson();
}

export async function reorderSlideshowSlides(ids: string[]): Promise<SlideshowSlide[]> {
  const { SITE_DB } = getEnv();
  const existing = await listSlideshowSlides();
  const byId = new Map(existing.map((s) => [s.id, s]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as SlideshowSlide[];
  for (const slide of existing) {
    if (!ids.includes(slide.id)) ordered.push(slide);
  }
  for (const [index, slide] of ordered.entries()) {
    await SITE_DB.prepare(
      `UPDATE slideshow_slides SET position = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(index + 1, slide.id)
      .run();
  }
  const saved = await listSlideshowSlides();
  await syncSlideshowJson(undefined, saved);
  return saved;
}

export async function upsertSlideMediaMeta(input: {
  id: string;
  title?: string;
  alt?: string;
  enabled?: boolean;
  mediaKind: "image" | "video";
  version: string;
  mobileCrop?: MobileCrop | null;
  desktopCrop?: DesktopCrop | null;
  desktopFocus?: ImageFocus | null;
  filters?: ImageFilters;
  files: SlideFiles;
  libraryAssetId?: string | null;
  layer?: SlideLayer | null;
}): Promise<SlideshowSlide> {
  const { SITE_DB } = getEnv();
  const existing = await listSlideshowSlides();
  const prior = existing.find((s) => s.id === input.id);
  const position = prior?.position ?? existing.length + 1;

  const mobileCropJson =
    input.mobileCrop !== undefined
      ? input.mobileCrop
        ? JSON.stringify(input.mobileCrop)
        : ""
      : prior?.mobileCrop
        ? JSON.stringify(prior.mobileCrop)
        : "";
  const desktopCropJson =
    input.desktopCrop !== undefined
      ? input.desktopCrop
        ? JSON.stringify(input.desktopCrop)
        : ""
      : prior?.desktopCrop
        ? JSON.stringify(prior.desktopCrop)
        : "";
  const desktopFocusJson =
    input.desktopFocus !== undefined
      ? input.desktopFocus
        ? JSON.stringify(input.desktopFocus)
        : ""
      : prior?.desktopFocus
        ? JSON.stringify(prior.desktopFocus)
        : "";

  await SITE_DB.prepare(
    `INSERT INTO slideshow_slides
       (id, position, title, alt, enabled, media_kind, version, mobile_crop_json,
        desktop_crop_json, desktop_focus_json,
        filters_json, files_json, layer_json, library_asset_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       title = COALESCE(NULLIF(excluded.title, ''), slideshow_slides.title),
       alt = excluded.alt,
       enabled = excluded.enabled,
       media_kind = excluded.media_kind,
       version = excluded.version,
       mobile_crop_json = excluded.mobile_crop_json,
       desktop_crop_json = excluded.desktop_crop_json,
       desktop_focus_json = excluded.desktop_focus_json,
       filters_json = COALESCE(NULLIF(excluded.filters_json, ''), slideshow_slides.filters_json),
       files_json = excluded.files_json,
       layer_json = COALESCE(NULLIF(excluded.layer_json, ''), slideshow_slides.layer_json),
       library_asset_id = excluded.library_asset_id,
       updated_at = datetime('now')`,
  )
    .bind(
      input.id,
      position,
      input.title?.trim() ?? prior?.title ?? "",
      input.alt?.trim() ?? prior?.alt ?? "",
      (input.enabled ?? prior?.enabled ?? true) ? 1 : 0,
      input.mediaKind,
      input.version,
      mobileCropJson,
      desktopCropJson,
      desktopFocusJson,
      input.filters ? JSON.stringify(input.filters) : "",
      JSON.stringify(input.files),
      input.layer ? JSON.stringify(input.layer) : "",
      input.libraryAssetId ?? null,
    )
    .run();

  await syncSlideshowJson();
  const slides = await listSlideshowSlides();
  const slide = slides.find((s) => s.id === input.id);
  if (!slide) throw new Error("Slide not found after upsert");
  return slide;
}

export async function clearSlideMedia(slideId: string) {
  const { SITE_DB } = getEnv();
  await deleteSlideFolder(slideId);
  await SITE_DB.prepare(
    `UPDATE slideshow_slides
     SET version = '', mobile_crop_json = '', desktop_crop_json = '', desktop_focus_json = '',
         files_json = '{}', library_asset_id = NULL, updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(slideId)
    .run();
  await syncSlideshowJson();
}

export async function putSlideMediaObject(
  slideId: string,
  fileName: string,
  body: ArrayBuffer,
  contentType: string,
) {
  const { MEDIA } = getEnv();
  const key = `${SLIDESHOW_MEDIA_PREFIX}${slideId}/${fileName}`;
  await MEDIA.put(key, body, { httpMetadata: { contentType } });
  return key;
}

export async function copyLibraryToSlideFolder(input: {
  slideId: string;
  version: string;
  masterKey: string;
  webpKey?: string | null;
  contentType: string;
  kind: "image" | "video";
}): Promise<{ masterKey: string; webpKey: string | null }> {
  const { MEDIA } = getEnv();
  const masterObj = await MEDIA.get(input.masterKey);
  if (!masterObj) throw new Error("Library file not found");
  const masterBuf = await masterObj.arrayBuffer();
  const ext =
    input.kind === "video"
      ? input.contentType.includes("webm")
        ? "webm"
        : "mp4"
      : input.contentType.includes("png")
        ? "png"
        : input.contentType.includes("webp")
          ? "webp"
          : "jpg";

  const masterName =
    input.kind === "video"
      ? `slide-${input.slideId}.${input.version}.${ext}`
      : `slide-${input.slideId}.${input.version}-source.${ext}`;
  const masterDest = await putSlideMediaObject(
    input.slideId,
    masterName,
    masterBuf,
    input.contentType,
  );

  let webpDest: string | null = null;
  if (input.kind === "image" && input.webpKey) {
    const webpObj = await MEDIA.get(input.webpKey);
    if (webpObj) {
      const webpBuf = await webpObj.arrayBuffer();
      webpDest = await putSlideMediaObject(
        input.slideId,
        `slide-${input.slideId}.${input.version}-source.webp`,
        webpBuf,
        "image/webp",
      );
    }
  }

  return { masterKey: masterDest, webpKey: webpDest };
}

export async function saveSlideLayerHtml(
  slideId: string,
  desktopHtml: string,
  mobileHtml: string | null,
) {
  const { CONTENT } = getEnv();
  await CONTENT.put(`${SLIDESHOW_HTML_PREFIX}${slideId}.html`, desktopHtml, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  if (mobileHtml !== null) {
    await CONTENT.put(`${SLIDESHOW_HTML_PREFIX}${slideId}.mobile.html`, mobileHtml, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
  } else {
    await CONTENT.delete(`${SLIDESHOW_HTML_PREFIX}${slideId}.mobile.html`);
  }
}

export async function getSlideLayerHtml(slideId: string, mobile = false) {
  const { CONTENT } = getEnv();
  const key = mobile
    ? `${SLIDESHOW_HTML_PREFIX}${slideId}.mobile.html`
    : `${SLIDESHOW_HTML_PREFIX}${slideId}.html`;
  const obj = await CONTENT.get(key);
  if (!obj) return "";
  return obj.text();
}

export async function getSlideshowMediaObject(key: string) {
  if (!key.startsWith(SLIDESHOW_MEDIA_PREFIX)) {
    throw new Error("Invalid media key");
  }
  const { MEDIA } = getEnv();
  return MEDIA.get(key);
}

export function newSlideVersion(seed?: string) {
  return shortVersionHash(seed);
}
