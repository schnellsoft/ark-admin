import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getGallery, reorderGallerySlides } from "@/lib/galleries";
import { z } from "zod";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function POST(
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
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const slides = await reorderGallerySlides(galleryId, parsed.data.ids);
    return NextResponse.json({ slides });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reorder failed" },
      { status: 400 },
    );
  }
}
