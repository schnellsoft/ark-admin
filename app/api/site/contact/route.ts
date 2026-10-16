import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getContactSettings, saveContactSettings } from "@/lib/contact";
import { emptyContactSettings } from "@/lib/contact-shared";
import { z } from "zod";

const contactSchema = z.object({
  phone: z.string(),
  email: z.string(),
});

export async function GET() {
  try {
    await requireUser();
    const contact = await getContactSettings();
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const contact = await saveContactSettings({
      ...emptyContactSettings(),
      ...parsed.data,
    });
    return NextResponse.json({ contact });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
