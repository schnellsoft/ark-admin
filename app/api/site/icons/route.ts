import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listIcons, saveIconsBulk, type IconRow } from "@/lib/icons";
import { z } from "zod";

const iconSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  svg: z.string().min(1).max(200000),
  position: z.number().int().positive(),
});

const bodySchema = z.object({
  icons: z.array(iconSchema),
});

export async function GET() {
  try {
    await requireUser();
    const icons = await listIcons();
    return NextResponse.json({ icons });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const icons = await saveIconsBulk(parsed.data.icons as IconRow[]);
    return NextResponse.json({ icons });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
