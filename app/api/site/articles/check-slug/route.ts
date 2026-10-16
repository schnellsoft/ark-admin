import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isArticleSlugUnique } from "@/lib/articles";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") ?? "";
    const excludeId = url.searchParams.get("excludeId") ?? undefined;
    if (!slug.trim()) {
      return NextResponse.json({ unique: false });
    }
    const unique = await isArticleSlugUnique(slug, excludeId || undefined);
    return NextResponse.json({ unique });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
