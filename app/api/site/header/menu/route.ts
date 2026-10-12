import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getHeaderMenuSettings,
  listHeaderMenuTree,
  saveHeaderMenuSettings,
  saveHeaderMenuTree,
  type HeaderMenuItem,
} from "@/lib/header-menu";
import { asMenuLabel } from "@/lib/header-menu-shared";
import { localeMapSchema } from "@/lib/schemas";
import { z } from "zod";

const settingsSchema = z.object({
  more: z.boolean(),
  maxWidth: z.union([z.string(), z.number()]).transform((v) => String(v)),
  color: z.string().max(32).default(""),
  colorHover: z.string().max(32).default(""),
});

const labelSchema = z.union([localeMapSchema, z.string().max(200)]);

const leafSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  icon_id: z.string().uuid().nullable().optional(),
  name: z.string().max(120).default(""),
  label: labelSchema,
  description: z.string().max(1000).default(""),
  aria_label: z.string().max(200).default(""),
  link: z.string().max(2000).default("#"),
  color: z.string().max(32).default(""),
  color_hover: z.string().max(32).default(""),
  position: z.number().int().positive().optional(),
  svg: z.string().nullable().optional(),
  items: z.array(z.unknown()).optional(),
});

const level2Schema = leafSchema.extend({
  items: z.array(leafSchema).optional(),
});

const level1Schema = leafSchema.extend({
  items: z.array(level2Schema).optional(),
});

const treeSchema = z.object({
  menu: z.array(level1Schema),
});

function normalizeNode(
  item: z.infer<typeof leafSchema> & { items?: unknown[] },
  parentId: string | null,
  index: number,
): HeaderMenuItem {
  const children = Array.isArray(item.items) ? item.items : [];
  return {
    id: item.id,
    parent_id: parentId,
    icon_id: item.icon_id ?? null,
    name: item.name ?? "",
    label: asMenuLabel(item.label),
    description: item.description ?? "",
    aria_label: item.aria_label ?? "",
    link: item.link ?? "#",
    color: item.color ?? "",
    color_hover: item.color_hover ?? "",
    position: index + 1,
    svg: item.svg ?? null,
    items: children.map((child, i) =>
      normalizeNode(child as z.infer<typeof leafSchema> & { items?: unknown[] }, item.id, i),
    ),
  };
}

export async function GET() {
  try {
    await requireUser();
    const [settings, menu] = await Promise.all([
      getHeaderMenuSettings(),
      listHeaderMenuTree(),
    ]);
    return NextResponse.json({ settings, menu });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = treeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const menu = await saveHeaderMenuTree(
      parsed.data.menu.map((item, index) => normalizeNode(item, null, index)),
    );
    return NextResponse.json({ menu });
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
    const settings = await saveHeaderMenuSettings({
      more: parsed.data.more,
      maxWidth: parsed.data.maxWidth,
      color: parsed.data.color,
      colorHover: parsed.data.colorHover,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
