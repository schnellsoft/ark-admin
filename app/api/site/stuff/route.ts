import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listStuffCategories,
  listStuffMembers,
  listStuffProvidedServices,
  listStuffRoles,
  listStuffSpecialties,
  listStuffSubcategories,
  replaceStuffMembers,
} from "@/lib/stuff";
import type { StuffMember } from "@/lib/stuff-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import { z } from "zod";

const localeMapSchema = z.object({
  ro: z.string(),
  en: z.string(),
  bg: z.string(),
});

const memberSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().positive(),
  slug: z.string().min(1),
  name: localeMapSchema,
  role: localeMapSchema.default({ ro: "", en: "", bg: "" }),
  specialty: localeMapSchema.default({ ro: "", en: "", bg: "" }),
  role_id: z.string().nullable().optional(),
  specialty_id: z.string().nullable().optional(),
  doctor_title: z.boolean().default(false),
  college: z.string().default(""),
  provided_service_ids: z.array(z.string()).default([]),
  snippet: localeMapSchema,
  category_id: z.string().min(1),
  subcategory_id: z.string().nullable().optional(),
  portrait_library_id: z.string().nullable().optional(),
  portrait_master_key: z.string().default(""),
  portrait_webp_key: z.string().nullable().optional(),
  portrait_800_key: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
});

const bulkSchema = z.object({
  members: z.array(memberSchema),
});

export async function GET() {
  try {
    await requireUser();
    const [
      members,
      categories,
      subcategories,
      roles,
      specialties,
      providedServices,
    ] = await Promise.all([
      listStuffMembers(),
      listStuffCategories(),
      listStuffSubcategories(),
      listStuffRoles(),
      listStuffSpecialties(),
      listStuffProvidedServices(),
    ]);
    return NextResponse.json({
      members,
      categories,
      subcategories,
      roles,
      specialties,
      providedServices,
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
    const rows: StuffMember[] = parsed.data.members.map((m) => ({
      id: m.id,
      position: m.position,
      slug: m.slug,
      name: m.name ?? emptyLocaleMap(),
      role: m.role ?? emptyLocaleMap(),
      specialty: m.specialty ?? emptyLocaleMap(),
      role_id: m.role_id ?? null,
      specialty_id: m.specialty_id ?? null,
      doctor_title: m.doctor_title,
      college: m.college ?? "",
      provided_service_ids: m.provided_service_ids ?? [],
      snippet: m.snippet ?? emptyLocaleMap(),
      category_id: m.category_id,
      subcategory_id: m.subcategory_id ?? null,
      portrait_library_id: m.portrait_library_id ?? null,
      portrait_master_key: m.portrait_master_key ?? "",
      portrait_webp_key: m.portrait_webp_key ?? null,
      portrait_800_key: m.portrait_800_key ?? null,
      enabled: m.enabled,
    }));
    const members = await replaceStuffMembers(rows);
    return NextResponse.json({ members });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
