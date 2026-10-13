import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { reorderSlideshowSlides } from "@/lib/slideshow";
import { z } from "zod";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const slides = await reorderSlideshowSlides(parsed.data.ids);
    return NextResponse.json({ slides });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reorder failed" },
      { status: 400 },
    );
  }
}
