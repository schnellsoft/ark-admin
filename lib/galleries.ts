import { getEnv } from "./env";
import { emptyLocaleMap, type LocaleMap } from "./i18n";
import {
  GALLERIES_INDEX_KEY,
  GALLERY_CONTENT_PREFIX,
  GALLERY_MEDIA_PREFIX,
  galleryDocumentKey,
  galleryHtmlKey,
  galleryMediaPrefix,
  parseGallerySettings,
  slugifyGallery,
  validateGalleryDraft,
  type GalleriesIndexDocument,
  type GalleryDocument,
  type GalleryRow,
} from "./galleries-shared";
import {
  emptySlideshowSettings,
  htmlHasLayerContent,
  normalizeSlideshowSettings,
  parseDesktopCrop,
  parseImageFilters,
  parseImageFocus,
  parseMobileCrop,
  parseSlideFiles,
  parseSlideLayer,
  shortVersionHash,
  validateSlideDraft,
  type DesktopCrop,
  type ImageFilters,
  type ImageFocus,
  type MobileCrop,
  type SlideFiles,
  type SlideLayer,
  type SlideshowSettings,
  type SlideshowSlide,
} from "./slideshow-shared";

export * from "./galleries-shared";

type GalleryDb = {
  id: string;
  position: number;
  slug: string;
  name_ro: string;
  name_en: string;
  name_bg: string;
  enabled: number;
  settings_json: string | null;
};

type SlideDb = {
  id: string;
  gallery_id: string;
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

function mapName(row: GalleryDb): LocaleMap {
  return {
    ro: row.name_ro ?? "",
    en: row.name_en ?? "",
    bg: row.name_bg ?? "",
  };
}

function mapGallery(row: GalleryDb): GalleryRow {
  return {
    id: row.id,
    position: row.position,
    slug: row.slug,
    name: mapName(row),
    enabled: Boolean(row.enabled),
    settings: parseGallerySettings(row.settings_json),
  };
}

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

export async function listGalleries(): Promise<GalleryRow[]> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT id, position, slug, name_ro, name_en, name_bg, enabled, settings_json
     FROM galleries ORDER BY position ASC`,
  ).all<GalleryDb>();
  return (rows.results ?? []).map(mapGallery);
}

export async function getGallery(id: string): Promise<GalleryRow | null> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT id, position, slug, name_ro, name_en, name_bg, enabled, settings_json
     FROM galleries WHERE id = ?`,
  )
    .bind(id)
    .first<GalleryDb>();
  return row ? mapGallery(row) : null;
}

export async function getGalleryBySlug(slug: string): Promise<GalleryRow | null> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT id, position, slug, name_ro, name_en, name_bg, enabled, settings_json
     FROM galleries WHERE lower(slug) = lower(?)`,
  )
    .bind(slug.trim())
    .first<GalleryDb>();
  return row ? mapGallery(row) : null;
}

export async function isGallerySlugUnique(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const { SITE_DB } = getEnv();
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return false;
  const row = excludeId
    ? await SITE_DB.prepare(
        `SELECT id FROM galleries WHERE lower(slug) = ? AND id != ? LIMIT 1`,
      )
        .bind(normalized, excludeId)
        .first<{ id: string }>()
    : await SITE_DB.prepare(
        `SELECT id FROM galleries WHERE lower(slug) = ? LIMIT 1`,
      )
        .bind(normalized)
        .first<{ id: string }>();
  return !row;
}

async function syncGalleriesIndex(): Promise<GalleriesIndexDocument> {
  const { CONTENT } = getEnv();
  const galleries = await listGalleries();
  const doc: GalleriesIndexDocument = {
    galleries: galleries.map((g) => ({
      id: g.id,
      slug: g.slug,
      position: g.position,
      name: g.name,
      enabled: g.enabled,
    })),
    updatedAt: new Date().toISOString(),
  };
  await CONTENT.put(GALLERIES_INDEX_KEY, JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return doc;
}

export async function publishGallery(galleryId: string): Promise<GalleryDocument> {
  const { CONTENT } = getEnv();
  const gallery = await getGallery(galleryId);
  if (!gallery) throw new Error("Gallery not found");
  const slides = await listGallerySlides(galleryId);
  const doc: GalleryDocument = {
    id: gallery.id,
    slug: gallery.slug,
    name: gallery.name,
    settings: gallery.settings,
    slides: slides.map((s) => ({
      id: s.id,
      position: s.position,
      title: s.title,
      alt: s.alt,
      enabled: s.enabled,
      mediaKind: s.media_kind,
      version: s.version,
      files: s.files,
      desktopFocus: s.desktopFocus,
      filters: s.filters,
      layer: s.layer,
    })),
    updatedAt: new Date().toISOString(),
  };
  await CONTENT.put(galleryDocumentKey(gallery.slug), JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  await syncGalleriesIndex();
  return doc;
}

export async function saveGalleriesBulk(rows: GalleryRow[]): Promise<GalleryRow[]> {
  const { SITE_DB } = getEnv();
  const existing = await listGalleries();
  const nextIds = new Set(rows.map((r) => r.id));

  for (const old of existing) {
    if (!nextIds.has(old.id)) {
      await deleteGallery(old.id);
    }
  }

  for (const [index, row] of rows.entries()) {
    const err = validateGalleryDraft(row);
    if (err) throw new Error(err);
    const unique = await isGallerySlugUnique(row.slug, row.id);
    if (!unique) throw new Error(`Slug already exists: ${row.slug}`);
    const settings = normalizeSlideshowSettings(
      row.settings ?? emptySlideshowSettings(),
    );
    await SITE_DB.prepare(
      `INSERT INTO galleries
         (id, position, slug, name_ro, name_en, name_bg, enabled, settings_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         slug = excluded.slug,
         name_ro = excluded.name_ro,
         name_en = excluded.name_en,
         name_bg = excluded.name_bg,
         enabled = excluded.enabled,
         settings_json = excluded.settings_json,
         updated_at = datetime('now')`,
    )
      .bind(
        row.id,
        index + 1,
        row.slug.trim(),
        row.name?.ro?.trim() ?? "",
        row.name?.en?.trim() ?? "",
        row.name?.bg?.trim() ?? "",
        row.enabled === false ? 0 : 1,
        JSON.stringify(settings),
      )
      .run();
    await publishGallery(row.id);
  }

  return listGalleries();
}

export async function upsertGallery(
  input: Partial<GalleryRow> & { id?: string },
): Promise<GalleryRow> {
  const { SITE_DB, CONTENT } = getEnv();
  const id = input.id || crypto.randomUUID();
  const existing = await getGallery(id);
  const name = input.name ?? existing?.name ?? emptyLocaleMap();
  let slug = (input.slug ?? existing?.slug ?? "").trim();
  if (!slug) {
    slug = slugifyGallery(name.ro || name.en || name.bg || "gallery");
  }
  const draft: GalleryRow = {
    id,
    position: input.position ?? existing?.position ?? 1,
    slug,
    name,
    enabled: input.enabled ?? existing?.enabled ?? true,
    settings: normalizeSlideshowSettings(
      input.settings ?? existing?.settings ?? emptySlideshowSettings(),
    ),
  };
  const err = validateGalleryDraft(draft);
  if (err) throw new Error(err);
  if (!(await isGallerySlugUnique(draft.slug, id))) {
    throw new Error("Slug already exists");
  }

  if (!existing) {
    const count = (await listGalleries()).length;
    draft.position = count + 1;
  }

  await SITE_DB.prepare(
    `INSERT INTO galleries
       (id, position, slug, name_ro, name_en, name_bg, enabled, settings_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       position = excluded.position,
       slug = excluded.slug,
       name_ro = excluded.name_ro,
       name_en = excluded.name_en,
       name_bg = excluded.name_bg,
       enabled = excluded.enabled,
       settings_json = excluded.settings_json,
       updated_at = datetime('now')`,
  )
    .bind(
      draft.id,
      draft.position,
      draft.slug,
      draft.name.ro,
      draft.name.en,
      draft.name.bg,
      draft.enabled ? 1 : 0,
      JSON.stringify(draft.settings),
    )
    .run();

  if (existing && existing.slug !== draft.slug) {
    await CONTENT.delete(galleryDocumentKey(existing.slug));
  }

  await publishGallery(draft.id);
  const saved = await getGallery(draft.id);
  if (!saved) throw new Error("Gallery not found after save");
  return saved;
}

export async function deleteGallery(id: string): Promise<void> {
  const { SITE_DB, CONTENT, MEDIA } = getEnv();
  const gallery = await getGallery(id);
  const slides = await listGallerySlides(id);
  for (const slide of slides) {
    await deleteGallerySlideFolder(id, slide.id);
    await CONTENT.delete(galleryHtmlKey(id, slide.id, false));
    await CONTENT.delete(galleryHtmlKey(id, slide.id, true));
  }
  await SITE_DB.prepare(`DELETE FROM gallery_slides WHERE gallery_id = ?`)
    .bind(id)
    .run();
  await SITE_DB.prepare(`DELETE FROM galleries WHERE id = ?`).bind(id).run();
  if (gallery) {
    await CONTENT.delete(galleryDocumentKey(gallery.slug));
  }
  const prefix = `${GALLERY_MEDIA_PREFIX}${id}/`;
  const listed = await MEDIA.list({ prefix });
  for (const obj of listed.objects) {
    await MEDIA.delete(obj.key);
  }
  await syncGalleriesIndex();
}

export async function saveGallerySettings(
  galleryId: string,
  settings: SlideshowSettings,
): Promise<SlideshowSettings> {
  const gallery = await getGallery(galleryId);
  if (!gallery) throw new Error("Gallery not found");
  const next = normalizeSlideshowSettings(settings);
  await upsertGallery({ ...gallery, settings: next });
  return next;
}

async function enrichLayerFlags(
  galleryId: string,
  slide: SlideshowSlide,
): Promise<SlideshowSlide> {
  if (!slide.layer) return slide;
  if (
    typeof slide.layer.hasDesktopHtml === "boolean" ||
    typeof slide.layer.hasMobileHtml === "boolean"
  ) {
    return slide;
  }
  const [desktopHtml, mobileHtml] = await Promise.all([
    getGallerySlideLayerHtml(galleryId, slide.id, false),
    getGallerySlideLayerHtml(galleryId, slide.id, true),
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

export async function listGallerySlides(
  galleryId: string,
): Promise<SlideshowSlide[]> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT id, gallery_id, position, title, alt, enabled, media_kind, version,
            mobile_crop_json, desktop_crop_json, desktop_focus_json,
            filters_json, files_json, layer_json, library_asset_id
     FROM gallery_slides WHERE gallery_id = ? ORDER BY position ASC`,
  )
    .bind(galleryId)
    .all<SlideDb>();
  const slides = (rows.results ?? []).map(mapSlide);
  return Promise.all(slides.map((s) => enrichLayerFlags(galleryId, s)));
}

export async function getGallerySlide(
  galleryId: string,
  slideId: string,
): Promise<SlideshowSlide | null> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT id, gallery_id, position, title, alt, enabled, media_kind, version,
            mobile_crop_json, desktop_crop_json, desktop_focus_json,
            filters_json, files_json, layer_json, library_asset_id
     FROM gallery_slides WHERE gallery_id = ? AND id = ?`,
  )
    .bind(galleryId, slideId)
    .first<SlideDb>();
  return row ? mapSlide(row) : null;
}

async function deleteGallerySlideFolder(galleryId: string, slideId: string) {
  const { MEDIA } = getEnv();
  const prefix = galleryMediaPrefix(galleryId, slideId);
  const listed = await MEDIA.list({ prefix });
  for (const obj of listed.objects) {
    await MEDIA.delete(obj.key);
  }
}

export async function deleteGallerySlide(
  galleryId: string,
  slideId: string,
): Promise<void> {
  const { SITE_DB, CONTENT } = getEnv();
  await SITE_DB.prepare(
    `DELETE FROM gallery_slides WHERE gallery_id = ? AND id = ?`,
  )
    .bind(galleryId, slideId)
    .run();
  await deleteGallerySlideFolder(galleryId, slideId);
  await CONTENT.delete(galleryHtmlKey(galleryId, slideId, false));
  await CONTENT.delete(galleryHtmlKey(galleryId, slideId, true));
  await publishGallery(galleryId);
}

export async function reorderGallerySlides(
  galleryId: string,
  ids: string[],
): Promise<SlideshowSlide[]> {
  const { SITE_DB } = getEnv();
  for (const [index, id] of ids.entries()) {
    await SITE_DB.prepare(
      `UPDATE gallery_slides SET position = ?, updated_at = datetime('now')
       WHERE gallery_id = ? AND id = ?`,
    )
      .bind(index + 1, galleryId, id)
      .run();
  }
  await publishGallery(galleryId);
  return listGallerySlides(galleryId);
}

export async function updateGallerySlide(
  galleryId: string,
  slideId: string,
  patch: Partial<SlideshowSlide>,
): Promise<SlideshowSlide> {
  const existing = await getGallerySlide(galleryId, slideId);
  if (!existing) throw new Error("Slide not found");
  const next: SlideshowSlide = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ),
    id: existing.id,
  } as SlideshowSlide;
  const err = validateSlideDraft(next);
  if (err) throw new Error(err);
  await upsertGallerySlideMeta(galleryId, next);
  await publishGallery(galleryId);
  const saved = await getGallerySlide(galleryId, slideId);
  if (!saved) throw new Error("Slide not found after update");
  return enrichLayerFlags(galleryId, saved);
}

export async function upsertGallerySlideMeta(
  galleryId: string,
  input: SlideshowSlide,
): Promise<SlideshowSlide> {
  const { SITE_DB } = getEnv();
  const gallery = await getGallery(galleryId);
  if (!gallery) throw new Error("Gallery not found");
  const err = validateSlideDraft(input);
  if (err) throw new Error(err);

  const existing = await getGallerySlide(galleryId, input.id);
  const position =
    input.position ||
    existing?.position ||
    (await listGallerySlides(galleryId)).length + 1;

  await SITE_DB.prepare(
    `INSERT INTO gallery_slides
       (id, gallery_id, position, title, alt, enabled, media_kind, version,
        mobile_crop_json, desktop_crop_json, desktop_focus_json,
        filters_json, files_json, layer_json, library_asset_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       gallery_id = excluded.gallery_id,
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
      input.id,
      galleryId,
      position,
      input.title?.trim() ?? "",
      input.alt?.trim() ?? "",
      input.enabled === false ? 0 : 1,
      input.media_kind === "video" ? "video" : "image",
      input.version || existing?.version || "",
      input.mobileCrop ? JSON.stringify(input.mobileCrop) : "",
      input.desktopCrop ? JSON.stringify(input.desktopCrop) : "",
      input.desktopFocus ? JSON.stringify(input.desktopFocus) : "",
      JSON.stringify(input.filters ?? {}),
      JSON.stringify(input.files ?? {}),
      input.layer ? JSON.stringify(input.layer) : "",
      input.library_asset_id ?? null,
    )
    .run();

  await publishGallery(galleryId);
  const saved = await getGallerySlide(galleryId, input.id);
  if (!saved) throw new Error("Slide not found after upsert");
  return saved;
}


export async function upsertGallerySlideMediaMeta(
  galleryId: string,
  input: {
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
  },
): Promise<SlideshowSlide> {
  const existing = await getGallerySlide(galleryId, input.id);
  const slides = await listGallerySlides(galleryId);
  const position = existing?.position ?? slides.length + 1;

  const next: SlideshowSlide = {
    id: input.id,
    position,
    title: input.title?.trim() ?? existing?.title ?? "",
    alt: input.alt?.trim() ?? existing?.alt ?? "",
    enabled: input.enabled ?? existing?.enabled ?? true,
    media_kind: input.mediaKind,
    version: input.version,
    mobileCrop:
      input.mobileCrop !== undefined ? input.mobileCrop : existing?.mobileCrop ?? null,
    desktopCrop:
      input.desktopCrop !== undefined
        ? input.desktopCrop
        : existing?.desktopCrop ?? null,
    desktopFocus:
      input.desktopFocus !== undefined
        ? input.desktopFocus
        : existing?.desktopFocus ?? null,
    filters: input.filters ?? existing?.filters ?? {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hueRotate: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
      blur: 0,
    },
    files: input.files,
    layer: input.layer !== undefined ? input.layer : existing?.layer ?? null,
    library_asset_id:
      input.libraryAssetId !== undefined
        ? input.libraryAssetId
        : existing?.library_asset_id ?? null,
  };

  await upsertGallerySlideMeta(galleryId, next);
  const saved = await getGallerySlide(galleryId, input.id);
  if (!saved) throw new Error("Slide not found after media upsert");
  return enrichLayerFlags(galleryId, saved);
}

export async function saveGallerySlidesBulk(
  galleryId: string,
  slides: SlideshowSlide[],
): Promise<SlideshowSlide[]> {
  const { SITE_DB } = getEnv();
  const existing = await listGallerySlides(galleryId);
  const nextIds = new Set(slides.map((s) => s.id));

  for (const old of existing) {
    if (!nextIds.has(old.id)) {
      await deleteGallerySlide(galleryId, old.id);
    }
  }

  for (const [index, slide] of slides.entries()) {
    const err = validateSlideDraft(slide);
    if (err) throw new Error(err);
    const prior = existing.find((e) => e.id === slide.id);
    await SITE_DB.prepare(
      `INSERT INTO gallery_slides
         (id, gallery_id, position, title, alt, enabled, media_kind, version,
          mobile_crop_json, desktop_crop_json, desktop_focus_json,
          filters_json, files_json, layer_json, library_asset_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         gallery_id = excluded.gallery_id,
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
        galleryId,
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
        slide.layer
          ? JSON.stringify(slide.layer)
          : prior?.layer
            ? JSON.stringify(prior.layer)
            : "",
        slide.library_asset_id ?? prior?.library_asset_id ?? null,
      )
      .run();
  }

  await publishGallery(galleryId);
  return listGallerySlides(galleryId);
}

export async function clearGallerySlideMedia(
  galleryId: string,
  slideId: string,
) {
  const { SITE_DB } = getEnv();
  await deleteGallerySlideFolder(galleryId, slideId);
  await SITE_DB.prepare(
    `UPDATE gallery_slides
     SET version = '', mobile_crop_json = '', desktop_crop_json = '', desktop_focus_json = '',
         files_json = '{}', library_asset_id = NULL, updated_at = datetime('now')
     WHERE gallery_id = ? AND id = ?`,
  )
    .bind(galleryId, slideId)
    .run();
  await publishGallery(galleryId);
}

export async function putGallerySlideMediaObject(
  galleryId: string,
  slideId: string,
  fileName: string,
  body: ArrayBuffer,
  contentType: string,
) {
  const { MEDIA } = getEnv();
  const key = `${galleryMediaPrefix(galleryId, slideId)}${fileName}`;
  await MEDIA.put(key, body, { httpMetadata: { contentType } });
  return key;
}

export async function copyLibraryToGallerySlideFolder(input: {
  galleryId: string;
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
  const masterDest = await putGallerySlideMediaObject(
    input.galleryId,
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
      webpDest = await putGallerySlideMediaObject(
        input.galleryId,
        input.slideId,
        `slide-${input.slideId}.${input.version}-source.webp`,
        webpBuf,
        "image/webp",
      );
    }
  }

  return { masterKey: masterDest, webpKey: webpDest };
}

export async function saveGallerySlideLayerHtml(
  galleryId: string,
  slideId: string,
  desktopHtml: string,
  mobileHtml: string | null,
) {
  const { CONTENT } = getEnv();
  await CONTENT.put(galleryHtmlKey(galleryId, slideId, false), desktopHtml, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  if (mobileHtml !== null) {
    await CONTENT.put(galleryHtmlKey(galleryId, slideId, true), mobileHtml, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
  } else {
    await CONTENT.delete(galleryHtmlKey(galleryId, slideId, true));
  }
}

export async function getGallerySlideLayerHtml(
  galleryId: string,
  slideId: string,
  mobile = false,
) {
  const { CONTENT } = getEnv();
  const obj = await CONTENT.get(galleryHtmlKey(galleryId, slideId, mobile));
  if (!obj) return "";
  return obj.text();
}

export async function getGalleryMediaObject(key: string) {
  if (!key.startsWith(GALLERY_MEDIA_PREFIX) && !key.startsWith("library/")) {
    throw new Error("Invalid media key");
  }
  const { MEDIA } = getEnv();
  return MEDIA.get(key);
}

export function newGallerySlideVersion(seed?: string) {
  return shortVersionHash(seed);
}

export type {
  DesktopCrop,
  ImageFilters,
  ImageFocus,
  MobileCrop,
  SlideFiles,
  SlideLayer,
  SlideshowSettings,
  SlideshowSlide,
};
