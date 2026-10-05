import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { translateSchema } from "@/lib/schemas";
import { translateText } from "@/lib/translate";

export async function POST(request: Request) {
  try {
    await requireUser();
    const parsed = translateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const result = await translateText(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ translated: result.translated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
