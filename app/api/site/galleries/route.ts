import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listGalleries, saveGalleriesBulk, upsertGallery } from "@/lib/galleries";
import type { GalleryRow } from "@/lib/galleries-shared";

export async function GET() {
  try {
    await requireUser();
    const galleries = await listGalleries();
    return NextResponse.json({ galleries });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const body = (await request.json()) as { galleries?: GalleryRow[] };
    if (!Array.isArray(body.galleries)) {
      return NextResponse.json({ error: "galleries required" }, { status: 400 });
    }
    const galleries = await saveGalleriesBulk(body.galleries);
    return NextResponse.json({ galleries });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = (await request.json()) as Partial<GalleryRow>;
    const gallery = await upsertGallery(body);
    return NextResponse.json({ gallery });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 400 },
    );
  }
}
