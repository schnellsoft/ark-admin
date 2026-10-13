import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  deleteSlideshowSlide,
  getSlideshowSlide,
  updateSlideshowSlide,
  type SlideFiles,
  type SlideLayer,
} from "@/lib/slideshow";
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

const putSchema = z.object({
  title: z.string().max(200).optional(),
  alt: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  media_kind: z.enum(["image", "video"]).optional(),
  version: z.string().optional(),
  mobileCrop: cropSchema.nullable().optional(),
  desktopCrop: cropSchema.nullable().optional(),
  desktopFocus: z
    .object({ x: z.number(), y: z.number() })
    .nullable()
    .optional(),
  filters: filtersSchema.optional(),
  files: z.unknown().optional(),
  layer: z.unknown().nullable().optional(),
  library_asset_id: z.string().nullable().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const slide = await getSlideshowSlide(id);
    if (!slide) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ slide });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const parsed = putSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const patch: Parameters<typeof updateSlideshowSlide>[1] = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.alt !== undefined) patch.alt = parsed.data.alt;
    if (parsed.data.enabled !== undefined) patch.enabled = parsed.data.enabled;
    if (parsed.data.media_kind !== undefined) patch.media_kind = parsed.data.media_kind;
    if (parsed.data.version !== undefined) patch.version = parsed.data.version;
    if (parsed.data.mobileCrop !== undefined) patch.mobileCrop = parsed.data.mobileCrop;
    if (parsed.data.desktopCrop !== undefined) patch.desktopCrop = parsed.data.desktopCrop;
    if (parsed.data.desktopFocus !== undefined) patch.desktopFocus = parsed.data.desktopFocus;
    if (parsed.data.filters !== undefined) patch.filters = parsed.data.filters;
    if (parsed.data.files !== undefined) patch.files = parsed.data.files as SlideFiles;
    if (parsed.data.layer !== undefined) patch.layer = parsed.data.layer as SlideLayer | null;
    if (parsed.data.library_asset_id !== undefined) {
      patch.library_asset_id = parsed.data.library_asset_id;
    }
    const slide = await updateSlideshowSlide(id, patch);
    return NextResponse.json({ slide });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const existing = await getSlideshowSlide(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await deleteSlideshowSlide(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 },
    );
  }
}
