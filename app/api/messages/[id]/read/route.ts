import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const { SITE_DB } = getEnv();
    await SITE_DB.prepare(`UPDATE messages SET read_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
