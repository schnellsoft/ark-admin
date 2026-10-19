import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getGallerySlide,
  getGallerySlideLayerHtml,
  saveGallerySlideLayerHtml,
  updateGallerySlide,
  type SlideLayer,
} from "@/lib/galleries";
import { htmlHasLayerContent } from "@/lib/slideshow-shared";
import { z } from "zod";

const layerSchema = z.object({
  layer: z.unknown(),
  desktopHtml: z.string().max(20000),
  mobileHtml: z.string().max(20000).nullable(),
});

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ galleryId: string; slideId: string }> },
) {
  try {
    await requireUser();
    const { galleryId, slideId } = await context.params;
    const slide = await getGallerySlide(galleryId, slideId);
    if (!slide) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [desktopHtml, mobileHtml] = await Promise.all([
      getGallerySlideLayerHtml(galleryId, slideId, false),
      getGallerySlideLayerHtml(galleryId, slideId, true),
    ]);
    return NextResponse.json({
      layer: slide.layer,
      desktopHtml,
      mobileHtml,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ galleryId: string; slideId: string }> },
) {
  try {
    await requireUser();
    const { galleryId, slideId } = await context.params;
    const parsed = layerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const slide = await getGallerySlide(galleryId, slideId);
    if (!slide) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const layer = parsed.data.layer as SlideLayer;
    const desktopHtml = sanitizeHtml(parsed.data.desktopHtml);
    const mobileSame =
      layer?.mobile &&
      typeof layer.mobile === "object" &&
      "sameAsDesktop" in layer.mobile &&
      layer.mobile.sameAsDesktop === true;
    const mobileHtml = mobileSame
      ? null
      : sanitizeHtml(parsed.data.mobileHtml ?? "");

    await saveGallerySlideLayerHtml(galleryId, slideId, desktopHtml, mobileHtml);

    const hasDesktopHtml = htmlHasLayerContent(desktopHtml);
    const hasMobileHtml = mobileSame
      ? hasDesktopHtml
      : htmlHasLayerContent(mobileHtml);
    const nextLayer: SlideLayer = {
      ...layer,
      hasDesktopHtml,
      hasMobileHtml,
    };
    await updateGallerySlide(galleryId, slideId, { layer: nextLayer });

    return NextResponse.json({
      layer: nextLayer,
      desktopHtml,
      mobileHtml: mobileHtml ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
