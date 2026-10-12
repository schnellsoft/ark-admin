import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listLibraryCategories,
  saveLibraryCategoriesBulk,
  type LibraryCategory,
} from "@/lib/library";
import { z } from "zod";

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  position: z.number().int().positive(),
  is_system: z.boolean().optional().default(false),
});

const bulkSchema = z.object({
  categories: z.array(categorySchema),
});

export async function GET() {
  try {
    await requireUser();
    const categories = await listLibraryCategories();
    return NextResponse.json({ categories });
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
    const categories = await saveLibraryCategoriesBulk(
      parsed.data.categories.map(
        (c) =>
          ({
            id: c.id,
            name: c.name,
            position: c.position,
            is_system: Boolean(c.is_system),
          }) satisfies LibraryCategory,
      ),
    );
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
