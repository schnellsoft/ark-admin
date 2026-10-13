import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listCategories,
  listRecommended,
  listServices,
  listSubcategories,
  replaceServices,
  type ServiceRow,
} from "@/lib/services";
import { emptyLocaleMap } from "@/lib/i18n";
import { z } from "zod";

const localeMapSchema = z.object({
  ro: z.string(),
  en: z.string(),
  bg: z.string(),
});

const serviceSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().positive(),
  slug: z.string(),
  title: localeMapSchema,
  category_id: z.string().min(1),
  subcategory_id: z.string().nullable().optional(),
  icon_id: z.string().nullable().optional(),
  icon_svg: z.string().default(""),
  price_text: z.string().default(""),
  currency: z.string().default("RON"),
  page_path: z.string().default(""),
  enabled: z.boolean().default(true),
});

const bulkSchema = z.object({
  services: z.array(serviceSchema),
});

export async function GET() {
  try {
    await requireUser();
    const [services, categories, subcategories, recommended] = await Promise.all([
      listServices(),
      listCategories(),
      listSubcategories(),
      listRecommended(),
    ]);
    return NextResponse.json({
      services,
      categories,
      subcategories,
      recommended,
    });
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
    const rows: ServiceRow[] = parsed.data.services.map((s) => ({
      id: s.id,
      position: s.position,
      slug: s.slug,
      title: s.title ?? emptyLocaleMap(),
      category_id: s.category_id,
      subcategory_id: s.subcategory_id ?? null,
      icon_id: s.icon_id ?? null,
      icon_svg: s.icon_svg,
      price_text: s.price_text,
      currency: s.currency,
      page_path: s.page_path,
      enabled: s.enabled,
    }));
    const services = await replaceServices(rows);
    return NextResponse.json({ services });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
