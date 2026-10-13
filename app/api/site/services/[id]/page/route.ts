import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getService,
  getServicePage,
  saveServicePage,
  type ServicePage,
  type ServicePageImage,
} from "@/lib/services";
import { emptyLocaleMap } from "@/lib/i18n";
import { z } from "zod";

const localeMapSchema = z.object({
  ro: z.string(),
  en: z.string(),
  bg: z.string(),
});

const imageSchema = z.object({
  libraryAssetId: z.string().nullable(),
  masterKey: z.string(),
  webpKey: z.string().nullable(),
  alt: localeMapSchema,
});

const pageSchema = z.object({
  synopsis: localeMapSchema,
  paragraphs: z.object({
    ro: z.array(z.string()),
    en: z.array(z.string()),
    bg: z.array(z.string()),
  }),
  images: z.array(imageSchema).default([]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const service = await getService(id);
    if (!service) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const page = await getServicePage(id);
    return NextResponse.json({ service, page });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const service = await getService(id);
    if (!service) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const parsed = pageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const page: ServicePage = {
      service_id: id,
      synopsis: parsed.data.synopsis ?? emptyLocaleMap(),
      paragraphs: parsed.data.paragraphs,
      images: parsed.data.images as ServicePageImage[],
    };
    const saved = await saveServicePage(page);
    return NextResponse.json({ service, page: saved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
