import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  isArticleSlugUnique,
  type ArticleSlugScope,
} from "@/lib/articles";

const SCOPES = new Set<ArticleSlugScope>([
  "article",
  "category",
  "subcategory",
]);

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") ?? "";
    const excludeId = url.searchParams.get("excludeId") ?? undefined;
    const categoryId = url.searchParams.get("categoryId") ?? undefined;
    const rawScope = url.searchParams.get("scope") ?? "article";
    const scope: ArticleSlugScope = SCOPES.has(rawScope as ArticleSlugScope)
      ? (rawScope as ArticleSlugScope)
      : "article";

    if (!slug.trim()) {
      return NextResponse.json({ unique: false });
    }
    const unique = await isArticleSlugUnique(
      slug,
      excludeId || undefined,
      scope,
      categoryId || undefined,
    );
    return NextResponse.json({ unique });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
