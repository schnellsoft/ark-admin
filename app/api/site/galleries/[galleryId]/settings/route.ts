import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getGallery, saveGallerySettings } from "@/lib/galleries";
import {
  normalizeSlideshowSettings,
  type SlideshowSettings,
} from "@/lib/slideshow-shared";

export async function GET(
  _request: Request,
  context: { params: Promise<{ galleryId: string }> },
) {
  try {
    await requireUser();
    const { galleryId } = await context.params;
    const gallery = await getGallery(galleryId);
    if (!gallery) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ settings: gallery.settings });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ galleryId: string }> },
) {
  try {
    await requireUser();
    const { galleryId } = await context.params;
    const gallery = await getGallery(galleryId);
    if (!gallery) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = (await request.json()) as Partial<SlideshowSettings>;
    const settings = await saveGallerySettings(
      galleryId,
      normalizeSlideshowSettings(body),
    );
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
