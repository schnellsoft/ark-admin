import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { ticketStatusSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    await requireUser();
    const parsed = ticketStatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { DB } = getEnv();
    await DB.prepare(
      `UPDATE tickets
       SET status = ?, assignee_id = COALESCE(?, assignee_id), updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(parsed.data.status, parsed.data.assigneeId ?? null, parsed.data.id)
      .run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
