import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listArticleCategories,
  listArticleSubcategories,
  listArticles,
  replaceArticles,
} from "@/lib/articles";
import {
  emptyArticleSnippet,
  type ArticleRow,
} from "@/lib/articles-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import { z } from "zod";

const localeMapSchema = z.object({
  ro: z.string(),
  en: z.string(),
  bg: z.string(),
});

const snippetSchema = z.object({
  title: localeMapSchema,
  text: localeMapSchema,
  date: z.string().default(""),
  library_id: z.string().nullable().optional(),
  master_key: z.string().default(""),
  webp_key: z.string().nullable().optional(),
});

const articleSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().positive(),
  slug: z.string(),
  title: localeMapSchema,
  category_id: z.string().nullable().optional(),
  subcategory_id: z.string().nullable().optional(),
  datetime: z.string().default(""),
  snippet: snippetSchema.optional(),
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
    const rows: ArticleRow[] = parsed.data.articles.map((a) => {
      const snippet = a.snippet ?? emptyArticleSnippet();
      return {
        id: a.id,
        position: a.position,
        slug: a.slug,
        title: a.title ?? emptyLocaleMap(),
        category_id: a.category_id ?? null,
        subcategory_id: a.subcategory_id ?? null,
        datetime: a.datetime ?? "",
        snippet: {
          title: snippet.title ?? emptyLocaleMap(),
          text: snippet.text ?? emptyLocaleMap(),
          date: snippet.date ?? "",
          library_id: snippet.library_id ?? null,
          master_key: snippet.master_key ?? "",
          webp_key: snippet.webp_key ?? null,
        },
        enabled: a.enabled,
      };
    });
    const articles = await replaceArticles(rows);
    return NextResponse.json({ articles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
