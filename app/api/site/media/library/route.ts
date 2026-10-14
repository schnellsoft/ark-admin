import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getLibrarySettings,
  listLibraryCategories,
  listLibraryImages,
  saveLibraryImagesBulk,
  type LibraryImage,
} from "@/lib/library";
import { z } from "zod";

const imageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  alt: z.string().max(500).default(""),
  kind: z.enum(["image", "video"]).default("image"),
  master_key: z.string().min(1),
  master_content_type: z.string().min(1),
  webp_key: z.string().nullable().optional(),
  portrait_800_key: z.string().nullable().optional(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  position: z.number().int().positive(),
  categoryIds: z.array(z.string()).default([]),
});

const bulkSchema = z.object({
  images: z.array(imageSchema),
});

export async function GET() {
  try {
    await requireUser();
    const [settings, categories, images] = await Promise.all([
      getLibrarySettings(),
      listLibraryCategories(),
      listLibraryImages(),
    ]);
    return NextResponse.json({ settings, categories, images });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = bulkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const images = await saveLibraryImagesBulk(
      parsed.data.images.map(
        (image) =>
          ({
            ...image,
            alt: image.alt ?? "",
            kind: image.kind,
            webp_key: image.webp_key ?? null,
            portrait_800_key: image.portrait_800_key ?? null,
            categoryIds: image.categoryIds,
          }) satisfies LibraryImage,
      ),
    );
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
