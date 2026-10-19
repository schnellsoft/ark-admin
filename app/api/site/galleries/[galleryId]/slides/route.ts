import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getGallery,
  listGallerySlides,
  saveGallerySlidesBulk,
  type SlideshowSlide,
} from "@/lib/galleries";
import { z } from "zod";

const cropSchema = z.object({
  left: z.number(),
  top: z.number(),
  width: z.number(),
  height: z.number(),
});

const filtersSchema = z.object({
  brightness: z.number(),
  contrast: z.number(),
  saturate: z.number(),
  hueRotate: z.number(),
  grayscale: z.number(),
  sepia: z.number(),
  invert: z.number(),
  blur: z.number(),
});

const slideSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().positive(),
  title: z.string().max(200).default(""),
  alt: z.string().max(500).default(""),
  enabled: z.boolean().default(true),
  media_kind: z.enum(["image", "video"]).default("image"),
  version: z.string().default(""),
  mobileCrop: cropSchema.nullable().optional(),
  desktopCrop: cropSchema.nullable().optional(),
  desktopFocus: z
    .object({ x: z.number(), y: z.number() })
    .nullable()
    .optional(),
  filters: filtersSchema.optional(),
  files: z.record(z.string(), z.unknown()).default({}),
  layer: z.unknown().nullable().optional(),
  library_asset_id: z.string().nullable().optional(),
});

const bulkSchema = z.object({
  slides: z.array(slideSchema),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ galleryId: string }> },
) {
  try {
    await requireUser();
    const { galleryId } = await context.params;
    const gallery = await getGallery(galleryId);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }
    const slides = await listGallerySlides(galleryId);
    return NextResponse.json({ gallery, settings: gallery.settings, slides });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ galleryId: string }> },
) {
  try {
    await requireUser();
    const { galleryId } = await context.params;
    const gallery = await getGallery(galleryId);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }
    const parsed = bulkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const slides = await saveGallerySlidesBulk(
      galleryId,
      parsed.data.slides.map(
        (s) =>
          ({
            id: s.id,
            position: s.position,
            title: s.title,
            alt: s.alt,
            enabled: s.enabled,
            media_kind: s.media_kind,
            version: s.version,
            mobileCrop: s.mobileCrop ?? null,
            desktopCrop: s.desktopCrop ?? null,
            desktopFocus: s.desktopFocus ?? null,
            filters: s.filters ?? {
              brightness: 100,
              contrast: 100,
              saturate: 100,
              hueRotate: 0,
              grayscale: 0,
              sepia: 0,
              invert: 0,
              blur: 0,
            },
            files: (s.files ?? {}) as SlideshowSlide["files"],
            layer: (s.layer ?? null) as SlideshowSlide["layer"],
            library_asset_id: s.library_asset_id ?? null,
          }) satisfies SlideshowSlide,
      ),
    );
    return NextResponse.json({ slides });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
