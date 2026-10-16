import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listArticleFirstPage,
  listArticles,
  replaceArticleFirstPage,
} from "@/lib/articles";
import { z } from "zod";

const bulkSchema = z.object({
  slots: z.array(
    z.object({
      article_id: z.string().min(1),
      position: z.number().int().positive(),
    }),
  ),
});

export async function GET() {
  try {
    await requireUser();
    const [slots, articles] = await Promise.all([
      listArticleFirstPage(),
      listArticles(),
    ]);
    return NextResponse.json({ slots, articles });
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
    const slots = await replaceArticleFirstPage(parsed.data.slots);
    return NextResponse.json({ slots });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Save failed",
      },
      { status: 400 },
    );
  }
}
