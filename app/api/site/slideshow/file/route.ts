import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSlideshowMediaObject, SLIDESHOW_MEDIA_PREFIX } from "@/lib/slideshow";

export async function GET(request: Request) {
  try {
    await requireUser();
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!key.startsWith(SLIDESHOW_MEDIA_PREFIX)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }
    const obj = await getSlideshowMediaObject(key);
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
