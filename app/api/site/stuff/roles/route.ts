import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listStuffRoles, replaceStuffRoles } from "@/lib/stuff";
import type { StuffRole } from "@/lib/stuff-shared";
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
  roles: z.array(rowSchema),
});

export async function GET() {
  try {
    await requireUser();
    const roles = await listStuffRoles();
    return NextResponse.json({ roles });
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
    const rows: StuffRole[] = parsed.data.roles.map((r) => ({
      id: r.id,
      position: r.position,
      name: r.name ?? emptyLocaleMap(),
      enabled: r.enabled,
    }));
    const roles = await replaceStuffRoles(rows);
    return NextResponse.json({ roles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
