import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  asFooterIconLabel,
  listFooterIcons,
  saveFooterIconsBulk,
  type FooterIconRow,
} from "@/lib/footer";
import { localeMapSchema } from "@/lib/schemas";
import { z } from "zod";

const iconSchema = z.object({
  id: z.string().min(1),
  icon_id: z.string().min(1).nullable().optional(),
  name: z.string().max(120).default(""),
  label: z.union([localeMapSchema, z.string().max(200)]).default({
    ro: "",
    bg: "",
    en: "",
  }),
  aria_label: z.string().max(200).default(""),
  link: z.string().max(2000).default("#"),
  position: z.number().int().positive(),
  svg: z.string().nullable().optional(),
});

const bulkSchema = z.object({
  icons: z.array(iconSchema),
});

export async function GET() {
  try {
    await requireUser();
    const icons = await listFooterIcons();
    return NextResponse.json({ icons });
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
    const icons = await saveFooterIconsBulk(
      parsed.data.icons.map((icon) => ({
        ...icon,
        icon_id: icon.icon_id ?? null,
        label: asFooterIconLabel(icon.label),
      })) as FooterIconRow[],
    );
    return NextResponse.json({ icons });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
