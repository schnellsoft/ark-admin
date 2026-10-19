import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isGallerySlugUnique } from "@/lib/galleries";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const slug = req.nextUrl.searchParams.get("slug") || "";
    const excludeId = req.nextUrl.searchParams.get("excludeId") || undefined;
    const unique = await isGallerySlugUnique(slug, excludeId || undefined);
    return NextResponse.json({ unique });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
