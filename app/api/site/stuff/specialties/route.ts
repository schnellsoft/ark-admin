import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listStuffSpecialties, replaceStuffSpecialties } from "@/lib/stuff";
import type { StuffSpecialty } from "@/lib/stuff-shared";
import { emptyLocaleMap } from "@/lib/i18n";
import { z } from "zod";

const localeMapSchema = z.object({
  ro: z.string(),
  en: z.string(),
  bg: z.string(),
});

const rowSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().positive(),
  name: localeMapSchema,
  enabled: z.boolean().default(true),
});

const bulkSchema = z.object({
  specialties: z.array(rowSchema),
});

export async function GET() {
  try {
    await requireUser();
    const specialties = await listStuffSpecialties();
    return NextResponse.json({ specialties });
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
    const rows: StuffSpecialty[] = parsed.data.specialties.map((r) => ({
      id: r.id,
      position: r.position,
      name: r.name ?? emptyLocaleMap(),
      enabled: r.enabled,
    }));
    const specialties = await replaceStuffSpecialties(rows);
    return NextResponse.json({ specialties });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
