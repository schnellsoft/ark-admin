import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listArticleCategories,
  replaceArticleCategories,
} from "@/lib/articles";
import type { ArticleCategory } from "@/lib/articles-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import { z } from "zod";

const localeMapSchema = z.object({
  ro: z.string(),
  en: z.string(),
  bg: z.string(),
});

const categorySchema = z.object({
  id: z.string().min(1),
  position: z.number().int().positive(),
  slug: z.string(),
  name: localeMapSchema,
  icon_key: z.string().default(""),
  icon_svg: z.string().default(""),
  enabled: z.boolean().default(true),
});

const bulkSchema = z.object({
  categories: z.array(categorySchema),
});

export async function GET() {
  try {
    await requireUser();
    const categories = await listArticleCategories();
    return NextResponse.json({ categories });
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
    const rows: ArticleCategory[] = parsed.data.categories.map((c) => ({
      id: c.id,
      position: c.position,
      slug: c.slug,
      name: c.name ?? emptyLocaleMap(),
      icon_key: c.icon_key,
      icon_svg: c.icon_svg,
      enabled: c.enabled,
    }));
    const categories = await replaceArticleCategories(rows);
    return NextResponse.json({ categories });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
