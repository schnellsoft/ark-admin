import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listArticleCategories,
  listArticleSubcategories,
  listArticles,
  replaceArticles,
} from "@/lib/articles";
import type { ArticleRow } from "@/lib/articles-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import { z } from "zod";

const localeMapSchema = z.object({
  ro: z.string(),
  en: z.string(),
  bg: z.string(),
});

const articleSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().positive(),
  slug: z.string(),
  title: localeMapSchema,
  category_id: z.string().nullable().optional(),
  subcategory_id: z.string().nullable().optional(),
  datetime: z.string().default(""),
  enabled: z.boolean().default(true),
});

const bulkSchema = z.object({
  articles: z.array(articleSchema),
});

export async function GET() {
  try {
    await requireUser();
    const [articles, categories, subcategories] = await Promise.all([
      listArticles(),
      listArticleCategories(),
      listArticleSubcategories(),
    ]);
    return NextResponse.json({ articles, categories, subcategories });
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
    const rows: ArticleRow[] = parsed.data.articles.map((a) => ({
      id: a.id,
      position: a.position,
      slug: a.slug,
      title: a.title ?? emptyLocaleMap(),
      category_id: a.category_id ?? null,
      subcategory_id: a.subcategory_id ?? null,
      datetime: a.datetime ?? "",
      enabled: a.enabled,
    }));
    const articles = await replaceArticles(rows);
    return NextResponse.json({ articles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
