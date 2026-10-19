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
    const { SITE_DB } = getEnv();
    const sets: string[] = ["updated_at = datetime('now')"];
    const values: unknown[] = [];

    if (parsed.data.status) {
      sets.push("status = ?");
      values.push(parsed.data.status);
    }
    if (parsed.data.priority) {
      sets.push("priority = ?");
      values.push(parsed.data.priority);
    }
    if (parsed.data.assigneeId !== undefined) {
      sets.push("assignee_id = ?");
      values.push(parsed.data.assigneeId);
    }
    if (parsed.data.dueAt !== undefined) {
      sets.push("due_at = ?");
      values.push(parsed.data.dueAt);
    }
    if (parsed.data.patientUserId !== undefined) {
      sets.push("patient_user_id = ?");
      values.push(parsed.data.patientUserId);
    }
    if (parsed.data.appointmentId !== undefined) {
      sets.push("appointment_id = ?");
      values.push(parsed.data.appointmentId);
    }

    if (sets.length === 1) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(parsed.data.id);
    await SITE_DB.prepare(`UPDATE tickets SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
