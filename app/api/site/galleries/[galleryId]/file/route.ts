import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  GALLERY_MEDIA_PREFIX,
  getGallery,
  getGalleryMediaObject,
} from "@/lib/galleries";

export async function GET(
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
    const key = new URL(request.url).searchParams.get("key") ?? "";
    const galleryPrefix = `${GALLERY_MEDIA_PREFIX}${galleryId}/`;
    if (!key.startsWith(galleryPrefix) && !key.startsWith("library/")) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }
    const obj = await getGalleryMediaObject(key);
    if (!obj) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const headers = new Headers();
    headers.set(
      "Content-Type",
      obj.httpMetadata?.contentType || "application/octet-stream",
    );
    headers.set("Cache-Control", "private, max-age=60");
    return new NextResponse(obj.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
