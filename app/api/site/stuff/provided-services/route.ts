import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listStuffProvidedServices,
  replaceStuffProvidedServices,
} from "@/lib/stuff";
import type { StuffProvidedService } from "@/lib/stuff-shared";
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
  services: z.array(rowSchema),
});

export async function GET() {
  try {
    await requireUser();
    const services = await listStuffProvidedServices();
    return NextResponse.json({ services });
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
    const rows: StuffProvidedService[] = parsed.data.services.map((r) => ({
      id: r.id,
      position: r.position,
      name: r.name ?? emptyLocaleMap(),
      enabled: r.enabled,
    }));
    const services = await replaceStuffProvidedServices(rows);
    return NextResponse.json({ services });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
