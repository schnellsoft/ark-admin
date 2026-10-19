import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { HEADER_LOGO_MEDIA_PREFIX } from "@/lib/header-logo";
import { LIBRARY_MEDIA_PREFIX } from "@/lib/library";
import { SLIDESHOW_MEDIA_PREFIX } from "@/lib/slideshow";
import { SERVICES_MEDIA_PREFIX } from "@/lib/services-shared";

/** CMS media keys that admin UI may preview (auth-gated). */
const ALLOWED_PREFIXES = [
  LIBRARY_MEDIA_PREFIX,
  `${HEADER_LOGO_MEDIA_PREFIX}/`,
  SLIDESHOW_MEDIA_PREFIX,
  SERVICES_MEDIA_PREFIX,
  "galleries/",
  "stuff/",
  "location/",
] as const;

function isAllowedMediaKey(key: string): boolean {
  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    return false;
  }
  return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const key = url.searchParams.get("key") ?? "";
    if (!isAllowedMediaKey(key)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const { MEDIA } = getEnv();
    const obj = await MEDIA.get(key);
    if (!obj) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      obj.httpMetadata?.contentType || "application/octet-stream",
    );
    headers.set("Cache-Control", "private, max-age=60");
    if (obj.httpMetadata?.contentDisposition) {
      headers.set("Content-Disposition", obj.httpMetadata.contentDisposition);
    }

    return new NextResponse(obj.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
