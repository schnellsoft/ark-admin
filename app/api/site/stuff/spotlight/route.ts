import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getStuffSpotlightSettings,
  saveStuffSpotlightSettings,
} from "@/lib/stuff";
import { z } from "zod";

const settingsSchema = z.object({
  autoplay: z.boolean(),
  delayMs: z.number().int().min(500),
  stopOnHover: z.boolean(),
});

export async function GET() {
  try {
    await requireUser();
    const settings = await getStuffSpotlightSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const settings = await saveStuffSpotlightSettings(parsed.data);
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
