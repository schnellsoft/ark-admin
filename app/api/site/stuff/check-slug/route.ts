import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  isStuffCategorySlugUnique,
  isStuffMemberSlugUnique,
} from "@/lib/stuff";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") ?? "";
    const excludeId = url.searchParams.get("excludeId") ?? undefined;
    const kind = url.searchParams.get("kind") ?? "member";
    if (!slug.trim()) {
      return NextResponse.json({ unique: false });
    }
    const unique =
      kind === "category"
        ? await isStuffCategorySlugUnique(slug, excludeId || undefined)
        : await isStuffMemberSlugUnique(slug, excludeId || undefined);
    return NextResponse.json({ unique });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
