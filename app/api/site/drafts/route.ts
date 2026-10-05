import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { saveDraft } from "@/lib/content";
import {
  draftKeySchema,
  homeContentSchema,
  seoSchema,
  slideshowSchema,
} from "@/lib/schemas";
import { z } from "zod";

const bodySchema = z.object({
  key: draftKeySchema,
  payload: z.unknown(),
});

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const validators = {
      slideshow: slideshowSchema,
      home: homeContentSchema,
      seo: seoSchema,
    } as const;
    const validated = validators[parsed.data.key].safeParse(parsed.data.payload);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.message }, { status: 400 });
    }

    await saveDraft(parsed.data.key, validated.data, user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
