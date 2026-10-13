import { getEnv } from "./env";
import {
  LIBRARY_CONTENT_KEY,
  LIBRARY_MEDIA_PREFIX,
  UNSPECIFIED_CATEGORY_ID,
  UNSPECIFIED_CATEGORY_NAME,
  buildLibraryDocument,
  ensureCategoryIds,
  extensionForContentType,
  normalizeLibraryAlt,
  normalizeLibraryName,
  normalizeLibrarySettings,
  suggestLibraryNameFromFile,
  validateLibraryCategoryDraft,
  validateLibraryImageDraft,
  type LibraryAssetKind,
  type LibraryCategory,
  type LibraryDocument,
  type LibraryImage,
  type LibrarySettings,
} from "./library-shared";

export {
  LIBRARY_CONTENT_KEY,
  LIBRARY_MEDIA_PREFIX,
  UNSPECIFIED_CATEGORY_ID,
  UNSPECIFIED_CATEGORY_NAME,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  buildLibraryDocument,
  emptyLibrarySettings,
  ensureCategoryIds,
  extensionForContentType,
  normalizeLibraryAlt,
  normalizeLibraryName,
  normalizeLibrarySettings,
  suggestLibraryNameFromFile,
  validateLibraryCategoryDraft,
  validateLibraryImageDraft,
  type LibraryAssetKind,
  type LibraryCategory,
  type LibraryDocument,
  type LibraryImage,
  type LibrarySettings,
} from "./library-shared";

type CategoryDbRow = {
  id: string;
  name: string;
  position: number;
  is_system: number;
};

type ImageDbRow = {
  id: string;
  name: string;
  alt: string | null;
  kind: string | null;
  master_key: string;
  master_content_type: string;
  webp_key: string | null;
  width: number;
  height: number;
  bytes: number;
  position: number;
};

export async function getLibrarySettings(): Promise<LibrarySettings> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT max_width, convert_to_webp, jpeg_quality, webp_quality, max_bytes, max_video_bytes, max_files_per_batch
     FROM library_settings WHERE id = 1`,
  ).first<{
    max_width: number;
    convert_to_webp: number;
    jpeg_quality: number;
    webp_quality: number;
    max_bytes: number;
    max_video_bytes?: number;
    max_files_per_batch: number;
  }>();

  if (!row) return normalizeLibrarySettings(null);
  return normalizeLibrarySettings({
    maxWidth: row.max_width,
    convertToWebp: Boolean(row.convert_to_webp),
    jpegQuality: row.jpeg_quality,
    webpQuality: row.webp_quality,
    maxBytes: row.max_bytes,
    maxVideoBytes: row.max_video_bytes,
    maxFilesPerBatch: row.max_files_per_batch,
  });
}

export async function listLibraryCategories(): Promise<LibraryCategory[]> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT id, name, position, is_system FROM library_categories ORDER BY position ASC`,
  ).all<CategoryDbRow>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    position: row.position,
    is_system: Boolean(row.is_system),
  }));
}

async function listImageCategoryMap(): Promise<Map<string, string[]>> {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT image_id, category_id FROM library_image_categories`,
  ).all<{ image_id: string; category_id: string }>();

  const map = new Map<string, string[]>();
  for (const row of rows.results ?? []) {
    const list = map.get(row.image_id) ?? [];
    list.push(row.category_id);
    map.set(row.image_id, list);
  }
  return map;
}

export async function listLibraryImages(): Promise<LibraryImage[]> {
  const { SITE_DB } = getEnv();
  const [rows, categoryMap] = await Promise.all([
    SITE_DB.prepare(
      `SELECT id, name, alt, kind, master_key, master_content_type, webp_key, width, height, bytes, position
       FROM library_images ORDER BY position ASC`,
    ).all<ImageDbRow>(),
    listImageCategoryMap(),
  ]);

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    alt: row.alt ?? "",
    kind: (row.kind === "video" ? "video" : "image") as LibraryAssetKind,
    master_key: row.master_key,
    master_content_type: row.master_content_type,
    webp_key: row.webp_key,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    position: row.position,
    categoryIds: ensureCategoryIds(categoryMap.get(row.id)),
  }));
}

export async function syncLibraryJson(
  settings?: LibrarySettings,
  categories?: LibraryCategory[],
  images?: LibraryImage[],
): Promise<LibraryDocument> {
  const { CONTENT } = getEnv();
  const resolvedSettings = settings ?? (await getLibrarySettings());
  const resolvedCategories = categories ?? (await listLibraryCategories());
  const resolvedImages = images ?? (await listLibraryImages());
  const document = buildLibraryDocument(
    resolvedSettings,
    resolvedCategories,
    resolvedImages,
  );
  await CONTENT.put(LIBRARY_CONTENT_KEY, JSON.stringify(document, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return document;
}

async function deleteMediaKeys(keys: Array<string | null | undefined>) {
  const { MEDIA } = getEnv();
  for (const key of keys) {
    if (!key) continue;
    try {
      await MEDIA.delete(key);
    } catch {
      // ignore missing objects
    }
  }
}

async function setImageCategories(imageId: string, categoryIds: string[]) {
  const { SITE_DB } = getEnv();
  const ids = ensureCategoryIds(categoryIds);
  await SITE_DB.prepare(`DELETE FROM library_image_categories WHERE image_id = ?`)
    .bind(imageId)
    .run();
  for (const categoryId of ids) {
    await SITE_DB.prepare(
      `INSERT OR IGNORE INTO library_image_categories (image_id, category_id) VALUES (?, ?)`,
    )
      .bind(imageId, categoryId)
      .run();
  }
}

export async function saveLibrarySettings(
  settings: LibrarySettings,
): Promise<LibrarySettings> {
  const { SITE_DB } = getEnv();
  const next = normalizeLibrarySettings(settings);
  await SITE_DB.prepare(
    `INSERT INTO library_settings
       (id, max_width, convert_to_webp, jpeg_quality, webp_quality, max_bytes, max_video_bytes, max_files_per_batch, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       max_width = excluded.max_width,
       convert_to_webp = excluded.convert_to_webp,
       jpeg_quality = excluded.jpeg_quality,
       webp_quality = excluded.webp_quality,
       max_bytes = excluded.max_bytes,
       max_video_bytes = excluded.max_video_bytes,
       max_files_per_batch = excluded.max_files_per_batch,
       updated_at = excluded.updated_at`,
  )
    .bind(
      next.maxWidth,
      next.convertToWebp ? 1 : 0,
      next.jpegQuality,
      next.webpQuality,
      next.maxBytes,
      next.maxVideoBytes,
      next.maxFilesPerBatch,
    )
    .run();

  const saved = await getLibrarySettings();
  await syncLibraryJson(saved);
  return saved;
}

export async function saveLibraryCategoriesBulk(
  categories: LibraryCategory[],
): Promise<LibraryCategory[]> {
  const { SITE_DB } = getEnv();
  const existing = await listLibraryCategories();
  const nextIds = new Set(categories.map((c) => c.id));

  const hasUnspecified = categories.some((c) => c.id === UNSPECIFIED_CATEGORY_ID);
  if (!hasUnspecified) {
    throw new Error("Unspecified category is required");
  }

  for (const old of existing) {
    if (!nextIds.has(old.id)) {
      if (old.id === UNSPECIFIED_CATEGORY_ID || old.is_system) {
        throw new Error("Cannot delete system category");
      }
      // Reassign images that would become empty to Unspecified, then drop links
      const linked = await SITE_DB.prepare(
        `SELECT image_id FROM library_image_categories WHERE category_id = ?`,
      )
        .bind(old.id)
        .all<{ image_id: string }>();

      for (const row of linked.results ?? []) {
        await SITE_DB.prepare(
          `DELETE FROM library_image_categories WHERE image_id = ? AND category_id = ?`,
        )
          .bind(row.image_id, old.id)
          .run();

        const remaining = await SITE_DB.prepare(
          `SELECT COUNT(*) AS n FROM library_image_categories WHERE image_id = ?`,
        )
          .bind(row.image_id)
          .first<{ n: number }>();

        if (!remaining || remaining.n === 0) {
          await SITE_DB.prepare(
            `INSERT OR IGNORE INTO library_image_categories (image_id, category_id) VALUES (?, ?)`,
          )
            .bind(row.image_id, UNSPECIFIED_CATEGORY_ID)
            .run();
        }
      }

      await SITE_DB.prepare(`DELETE FROM library_categories WHERE id = ?`)
        .bind(old.id)
        .run();
    }
  }

  const names = new Set<string>();
  for (const [index, category] of categories.entries()) {
    const error = validateLibraryCategoryDraft(category);
    if (error) throw new Error(error);
    const name = normalizeLibraryName(category.name);
    const key = name.toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate category name: ${name}`);
    names.add(key);

    if (category.id === UNSPECIFIED_CATEGORY_ID) {
      await SITE_DB.prepare(
        `INSERT INTO library_categories (id, name, position, is_system, created_at, updated_at)
         VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           position = excluded.position,
           is_system = 1,
           updated_at = datetime('now')`,
      )
        .bind(UNSPECIFIED_CATEGORY_ID, UNSPECIFIED_CATEGORY_NAME, index + 1)
        .run();
      continue;
    }

    await SITE_DB.prepare(
      `INSERT INTO library_categories (id, name, position, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         position = excluded.position,
         is_system = excluded.is_system,
         updated_at = datetime('now')`,
    )
      .bind(category.id, name, index + 1, category.is_system ? 1 : 0)
      .run();
  }

  const saved = await listLibraryCategories();
  await syncLibraryJson(undefined, saved);
  return saved;
}

export async function saveLibraryImagesBulk(
  images: LibraryImage[],
): Promise<LibraryImage[]> {
  const { SITE_DB } = getEnv();
  const existing = await listLibraryImages();
  const nextIds = new Set(images.map((i) => i.id));

  for (const old of existing) {
    if (!nextIds.has(old.id)) {
      await SITE_DB.prepare(`DELETE FROM library_image_categories WHERE image_id = ?`)
        .bind(old.id)
        .run();
      await SITE_DB.prepare(`DELETE FROM library_images WHERE id = ?`)
        .bind(old.id)
        .run();
      await deleteMediaKeys([old.master_key, old.webp_key]);
    }
  }

  const names = new Set<string>();
  for (const [index, image] of images.entries()) {
    const error = validateLibraryImageDraft(image);
    if (error) throw new Error(error);
    const name = normalizeLibraryName(image.name);
    const key = name.toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate image name: ${name}`);
    names.add(key);

    const prior = existing.find((e) => e.id === image.id);
    const masterKey = prior?.master_key ?? image.master_key;
    const webpKey = prior?.webp_key ?? image.webp_key ?? null;
    const masterType = prior?.master_content_type ?? image.master_content_type;
    const width = prior?.width ?? image.width;
    const height = prior?.height ?? image.height;
    const bytes = prior?.bytes ?? image.bytes;
    const alt = normalizeLibraryAlt(image.alt ?? prior?.alt ?? "");
    const kind = image.kind === "video" || prior?.kind === "video" ? "video" : "image";

    await SITE_DB.prepare(
      `INSERT INTO library_images
         (id, name, alt, kind, master_key, master_content_type, webp_key, width, height, bytes, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         alt = excluded.alt,
         kind = excluded.kind,
         master_key = excluded.master_key,
         master_content_type = excluded.master_content_type,
         webp_key = excluded.webp_key,
         width = excluded.width,
         height = excluded.height,
         bytes = excluded.bytes,
         position = excluded.position,
         updated_at = datetime('now')`,
    )
      .bind(
        image.id,
        name,
        alt,
        kind,
        masterKey,
        masterType,
        webpKey,
        width,
        height,
        bytes,
        index + 1,
      )
      .run();

    await setImageCategories(image.id, image.categoryIds);
  }

  const saved = await listLibraryImages();
  await syncLibraryJson(undefined, undefined, saved);
  return saved;
}

export async function deleteLibraryImage(id: string): Promise<void> {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT id, master_key, webp_key FROM library_images WHERE id = ?`,
  )
    .bind(id)
    .first<{ id: string; master_key: string; webp_key: string | null }>();

  if (!row) throw new Error("Image not found");

  await SITE_DB.prepare(`DELETE FROM library_image_categories WHERE image_id = ?`)
    .bind(id)
    .run();
  await SITE_DB.prepare(`DELETE FROM library_images WHERE id = ?`).bind(id).run();
  await deleteMediaKeys([row.master_key, row.webp_key]);

  // Renumber remaining
  const remaining = await listLibraryImages();
  for (const [index, image] of remaining.entries()) {
    await SITE_DB.prepare(
      `UPDATE library_images SET position = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(index + 1, image.id)
      .run();
  }

  await syncLibraryJson();
}

export async function isLibraryImageNameTaken(
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const { SITE_DB } = getEnv();
  const normalized = normalizeLibraryName(name);
  const row = await SITE_DB.prepare(
    `SELECT id FROM library_images WHERE lower(name) = lower(?) LIMIT 1`,
  )
    .bind(normalized)
    .first<{ id: string }>();
  if (!row) return false;
  return excludeId ? row.id !== excludeId : true;
}

/** Pick a unique name from a preferred base (file stem or client hint). */
export async function allocateUniqueLibraryName(
  preferred: string,
): Promise<string> {
  const base =
    normalizeLibraryName(preferred) ||
    suggestLibraryNameFromFile(`image-${crypto.randomUUID()}`);
  if (!(await isLibraryImageNameTaken(base))) return base;
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await isLibraryImageNameTaken(candidate))) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export type CreateLibraryImageInput = {
  id: string;
  name: string;
  alt?: string;
  kind?: LibraryAssetKind;
  master: ArrayBuffer;
  masterContentType: string;
  webp?: ArrayBuffer | null;
  width: number;
  height: number;
  categoryIds: string[];
};

export async function createLibraryImage(
  input: CreateLibraryImageInput,
): Promise<LibraryImage> {
  const { SITE_DB, MEDIA } = getEnv();
  const name = await allocateUniqueLibraryName(input.name);
  const alt = normalizeLibraryAlt(input.alt ?? "");
  const kind: LibraryAssetKind = input.kind === "video" ? "video" : "image";

  const ext = extensionForContentType(input.masterContentType);
  const masterKey = `${LIBRARY_MEDIA_PREFIX}${input.id}.${ext}`;
  const isMasterWebp = ext === "webp";
  const webpKey =
    kind === "image" && input.webp && !isMasterWebp
      ? `${LIBRARY_MEDIA_PREFIX}${input.id}.webp`
      : null;

  await MEDIA.put(masterKey, input.master, {
    httpMetadata: { contentType: input.masterContentType },
  });
  if (webpKey && input.webp) {
    await MEDIA.put(webpKey, input.webp, {
      httpMetadata: { contentType: "image/webp" },
    });
  }

  const maxPos = await SITE_DB.prepare(
    `SELECT COALESCE(MAX(position), 0) AS n FROM library_images`,
  ).first<{ n: number }>();
  const position = (maxPos?.n ?? 0) + 1;
  const bytes = input.master.byteLength + (input.webp?.byteLength ?? 0);

  await SITE_DB.prepare(
    `INSERT INTO library_images
       (id, name, alt, kind, master_key, master_content_type, webp_key, width, height, bytes, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  )
    .bind(
      input.id,
      name,
      alt,
      kind,
      masterKey,
      input.masterContentType,
      webpKey,
      input.width,
      input.height,
      bytes,
      position,
    )
    .run();

  await setImageCategories(input.id, input.categoryIds);
  await syncLibraryJson();

  const images = await listLibraryImages();
  const created = images.find((img) => img.id === input.id);
  if (!created) throw new Error("Failed to create image");
  return created;
}

export async function getLibraryMediaObject(key: string) {
  if (!key.startsWith(LIBRARY_MEDIA_PREFIX)) {
    throw new Error("Invalid media key");
  }
  const { MEDIA } = getEnv();
  return MEDIA.get(key);
}
