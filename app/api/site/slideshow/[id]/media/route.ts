import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  createLibraryImage,
  getLibrarySettings,
  listLibraryImages,
  suggestLibraryNameFromFile,
  UNSPECIFIED_CATEGORY_ID,
} from "@/lib/library";
import {
  clearSlideMedia,
  copyLibraryToSlideFolder,
  getSlideshowSlide,
  newSlideVersion,
  putSlideMediaObject,
  upsertSlideMediaMeta,
  type DesktopCrop,
  type ImageFocus,
  type MobileCrop,
  type SlideFiles,
} from "@/lib/slideshow";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    await clearSlideMedia(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 },
    );
  }
}

async function wipeSlideFolder(slideId: string) {
  const { MEDIA } = await import("@/lib/env").then((m) => m.getEnv());
  const prefix = `slideshow/${slideId}/`;
  const listed = await MEDIA.list({ prefix });
  for (const obj of listed.objects) {
    await MEDIA.delete(obj.key);
  }
}

function parseJsonField<T>(form: FormData, key: string): T | null {
  const raw = form.get(key);
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseCrop(form: FormData): MobileCrop | null {
  return parseJsonField<MobileCrop>(form, "mobileCrop");
}

function parseDesktopCrop(form: FormData): DesktopCrop | null {
  return parseJsonField<DesktopCrop>(form, "desktopCrop");
}

function parseDesktopFocus(form: FormData): ImageFocus | null {
  return parseJsonField<ImageFocus>(form, "desktopFocus");
}

async function putVariants(slideId: string, form: FormData) {
  for (const [key, value] of form.entries()) {
    if (!(value instanceof File)) continue;
    if (!key.startsWith("variant:")) continue;
    const fileName = key.slice("variant:".length);
    await putSlideMediaObject(
      slideId,
      fileName,
      await value.arrayBuffer(),
      value.type || "application/octet-stream",
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id: slideId } = await context.params;
    const form = await request.formData();
    const mode = String(form.get("mode") ?? "upload");
    const alt = String(form.get("alt") ?? "");
    const title = String(form.get("title") ?? "");

    // Attach cropped variants to an existing slide version without wiping source.
    if (mode === "variants") {
      const existing = await getSlideshowSlide(slideId);
      if (!existing?.version) {
        return NextResponse.json({ error: "Slide has no media version" }, { status: 400 });
      }
      const version = existing.version;
      const sourceKey = existing.files.sourceKey ?? null;
      let files: SlideFiles = {
        desktop: existing.files.desktop ?? {},
        mobile: existing.files.mobile ?? {},
        sourceKey: sourceKey ?? undefined,
        video: existing.files.video,
      };
      const variantMetaRaw = form.get("filesJson");
      if (typeof variantMetaRaw === "string" && variantMetaRaw) {
        try {
          const parsed = JSON.parse(variantMetaRaw) as SlideFiles;
          files = {
            ...parsed,
            sourceKey: sourceKey ?? parsed.sourceKey,
            video: existing.files.video ?? parsed.video,
          };
        } catch {
          /* keep */
        }
      }
      await putVariants(slideId, form);
      const slide = await upsertSlideMediaMeta({
        id: slideId,
        title: title || undefined,
        alt: alt || existing.alt,
        mediaKind: existing.media_kind,
        version,
        mobileCrop: parseCrop(form) ?? existing.mobileCrop,
        desktopCrop: parseDesktopCrop(form) ?? existing.desktopCrop,
        desktopFocus: parseDesktopFocus(form) ?? existing.desktopFocus,
        files,
        libraryAssetId: existing.library_asset_id,
      });
      return NextResponse.json({ slide, sourceKey: files.sourceKey ?? null });
    }

    const version = newSlideVersion(slideId);
    await wipeSlideFolder(slideId);

    if (mode === "import") {
      const libraryId = String(form.get("libraryId") ?? "");
      const assets = await listLibraryImages();
      const asset = assets.find((a) => a.id === libraryId);
      if (!asset) {
        return NextResponse.json({ error: "Library asset not found" }, { status: 404 });
      }

      const copied = await copyLibraryToSlideFolder({
        slideId,
        version,
        masterKey: asset.master_key,
        webpKey: asset.webp_key,
        contentType: asset.master_content_type,
        kind: asset.kind,
      });

      let files: SlideFiles =
        asset.kind === "video"
          ? {
              video: {
                key: copied.masterKey,
                contentType: asset.master_content_type,
              },
              sourceKey: copied.masterKey,
            }
          : {
              desktop: {},
              mobile: {},
              sourceKey: copied.masterKey,
            };

      const variantMetaRaw = form.get("filesJson");
      if (typeof variantMetaRaw === "string" && variantMetaRaw) {
        try {
          files = {
            ...(JSON.parse(variantMetaRaw) as SlideFiles),
            sourceKey: copied.masterKey,
          };
        } catch {
          /* keep */
        }
      }

      await putVariants(slideId, form);

      const slide = await upsertSlideMediaMeta({
        id: slideId,
        title: title || undefined,
        alt: alt || asset.alt,
        mediaKind: asset.kind,
        version,
        mobileCrop: parseCrop(form),
        desktopCrop: parseDesktopCrop(form),
        desktopFocus: parseDesktopFocus(form),
        files,
        libraryAssetId: asset.id,
      });

      return NextResponse.json({
        slide,
        sourceKey: copied.masterKey,
        sourceWebpKey: copied.webpKey,
      });
    }

    // upload mode: also create library asset
    const master = form.get("master");
    if (!(master instanceof File)) {
      return NextResponse.json({ error: "Missing master file" }, { status: 400 });
    }
    const kind = String(form.get("kind") ?? "image") === "video" ? "video" : "image";
    const width = Number.parseInt(String(form.get("width") ?? "0"), 10) || 0;
    const height = Number.parseInt(String(form.get("height") ?? "0"), 10) || 0;
    const settings = await getLibrarySettings();
    const webpFile = form.get("webp");
    const webp =
      webpFile instanceof File && webpFile.size > 0
        ? await webpFile.arrayBuffer()
        : null;

    const libraryId = crypto.randomUUID();
    const libraryAsset = await createLibraryImage({
      id: libraryId,
      name: suggestLibraryNameFromFile(master.name || `slide-${slideId}`),
      alt,
      kind,
      master: await master.arrayBuffer(),
      masterContentType: master.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
      webp: kind === "image" && settings.convertToWebp ? webp : null,
      width,
      height,
      categoryIds: [UNSPECIFIED_CATEGORY_ID],
    });

    const copied = await copyLibraryToSlideFolder({
      slideId,
      version,
      masterKey: libraryAsset.master_key,
      webpKey: libraryAsset.webp_key,
      contentType: libraryAsset.master_content_type,
      kind,
    });

    let files: SlideFiles = { sourceKey: copied.masterKey };
    const variantMetaRaw = form.get("filesJson");
    if (typeof variantMetaRaw === "string" && variantMetaRaw) {
      try {
        files = {
          ...(JSON.parse(variantMetaRaw) as SlideFiles),
          sourceKey: copied.masterKey,
        };
      } catch {
        files = { sourceKey: copied.masterKey };
      }
    }
    if (kind === "video") {
      files = {
        video: {
          key: copied.masterKey,
          contentType: libraryAsset.master_content_type,
        },
        sourceKey: copied.masterKey,
      };
    }

    await putVariants(slideId, form);

    const slide = await upsertSlideMediaMeta({
      id: slideId,
      title: title || undefined,
      alt,
      mediaKind: kind,
      version,
      mobileCrop: parseCrop(form),
      desktopCrop: parseDesktopCrop(form),
      desktopFocus: parseDesktopFocus(form),
      files,
      libraryAssetId: libraryAsset.id,
    });

    return NextResponse.json({
      slide,
      libraryAsset,
      sourceKey: copied.masterKey,
      sourceWebpKey: copied.webpKey,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
