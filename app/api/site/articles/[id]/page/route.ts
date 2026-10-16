import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getArticle,
  getArticlePage,
  saveArticlePage,
} from "@/lib/articles";
import type { ArticlePage } from "@/lib/articles-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import { z } from "zod";

const localeMapSchema = z.object({
  ro: z.string(),
  en: z.string(),
  bg: z.string(),
});

const pageSchema = z.object({
  body: localeMapSchema,
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const article = await getArticle(id);
    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const page = await getArticlePage(id);
    return NextResponse.json({ article, page });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const article = await getArticle(id);
    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const parsed = pageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const page: ArticlePage = {
      article_id: id,
      body: parsed.data.body ?? emptyLocaleMap(),
    };
    const saved = await saveArticlePage(page);
    return NextResponse.json({ article, page: saved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
