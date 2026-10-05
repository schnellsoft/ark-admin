import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { saveSetting } from "@/lib/content";
import { aiSettingsSchema, emailSettingsSchema, localeSettingsSchema } from "@/lib/schemas";
import { z } from "zod";

const bodySchema = z.object({
  ai: aiSettingsSchema,
  email: emailSettingsSchema,
  locale: localeSettingsSchema,
});

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    await saveSetting("ai", parsed.data.ai);
    await saveSetting("email", parsed.data.email);
    await saveSetting("locale", parsed.data.locale);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
