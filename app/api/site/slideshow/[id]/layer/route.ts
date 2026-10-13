import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getSlideLayerHtml,
  htmlHasLayerContent,
  listSlideshowSlides,
  saveSlideLayerHtml,
  updateSlideshowSlide,
  type SlideLayer,
} from "@/lib/slideshow";
import { z } from "zod";

const layerSchema = z.object({
  layer: z.unknown(),
  desktopHtml: z.string().max(20000),
  mobileHtml: z.string().max(20000).nullable(),
});

function sanitizeHtml(html: string): string {
  // Lightweight allowlist strip for script/iframe/on*
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const slides = await listSlideshowSlides();
    const slide = slides.find((s) => s.id === id);
    if (!slide) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [desktopHtml, mobileHtml] = await Promise.all([
      getSlideLayerHtml(id, false),
      getSlideLayerHtml(id, true),
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
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const parsed = layerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const slides = await listSlideshowSlides();
    const slide = slides.find((s) => s.id === id);
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

    await saveSlideLayerHtml(id, desktopHtml, mobileHtml);

    const hasDesktopHtml = htmlHasLayerContent(desktopHtml);
    const hasMobileHtml = mobileSame
      ? hasDesktopHtml
      : htmlHasLayerContent(mobileHtml);
    const nextLayer: SlideLayer = {
      ...layer,
      hasDesktopHtml,
      hasMobileHtml,
    };
    await updateSlideshowSlide(id, { layer: nextLayer });

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
