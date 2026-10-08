import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getHeaderIconSettings,
  listHeaderIcons,
  saveHeaderIconSettings,
  saveHeaderIconsBulk,
  type HeaderIconRow,
} from "@/lib/header-icons";
import { z } from "zod";

const iconSchema = z.object({
  id: z.string().uuid(),
  icon_id: z.string().uuid().nullable().optional(),
  name: z.string().max(120).default(""),
  label: z.string().max(200).default(""),
  description: z.string().max(1000).default(""),
  aria_label: z.string().max(200).default(""),
  link: z.string().max(2000).default("#"),
  color: z.string().max(32).default(""),
  color_hover: z.string().max(32).default(""),
  position: z.number().int().positive(),
  svg: z.string().nullable().optional(),
});

const bulkSchema = z.object({
  icons: z.array(iconSchema),
});

const settingsSchema = z.object({
  more: z.boolean(),
  maxWidth: z.union([z.string(), z.number()]).transform((v) => String(v)),
});

export async function GET() {
  try {
    await requireUser();
    const [settings, icons] = await Promise.all([
      getHeaderIconSettings(),
      listHeaderIcons(),
    ]);
    return NextResponse.json({ settings, icons });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const icons = await saveHeaderIconsBulk(parsed.data.icons as HeaderIconRow[]);
    return NextResponse.json({ icons });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser();
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const settings = await saveHeaderIconSettings({
      more: parsed.data.more,
      maxWidth: parsed.data.maxWidth,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
