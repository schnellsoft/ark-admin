import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listArticleSubcategories,
  replaceArticleSubcategories,
} from "@/lib/articles";
import type { ArticleSubcategory } from "@/lib/articles-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import { z } from "zod";

const localeMapSchema = z.object({
  ro: z.string(),
  en: z.string(),
  bg: z.string(),
});

const subcategorySchema = z.object({
  id: z.string().min(1),
  category_id: z.string().min(1),
  position: z.number().int().positive(),
  slug: z.string(),
  name: localeMapSchema,
  icon_svg: z.string().default(""),
  enabled: z.boolean().default(true),
});

const bulkSchema = z.object({
  subcategories: z.array(subcategorySchema),
});

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const categoryId = url.searchParams.get("categoryId") ?? undefined;
    const subcategories = await listArticleSubcategories(
      categoryId || undefined,
    );
    return NextResponse.json({ subcategories });
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
    const rows: ArticleSubcategory[] = parsed.data.subcategories.map((s) => ({
      id: s.id,
      category_id: s.category_id,
      position: s.position,
      slug: s.slug,
      name: s.name ?? emptyLocaleMap(),
      icon_svg: s.icon_svg,
      enabled: s.enabled,
    }));
    const subcategories = await replaceArticleSubcategories(rows);
    return NextResponse.json({ subcategories });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
