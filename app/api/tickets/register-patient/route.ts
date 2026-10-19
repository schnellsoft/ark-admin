import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { nextUserPosition } from "@/lib/crm";
import { ticketRegisterPatientSchema } from "@/lib/schemas";
import { getTicket } from "@/lib/tickets";

export async function POST(request: Request) {
  try {
    await requireUser();
    const parsed = ticketRegisterPatientSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const ticket = await getTicket(parsed.data.ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (ticket.patient_user_id) {
      return NextResponse.json({ ok: true, userId: ticket.patient_user_id, existing: true });
    }

    const email = (parsed.data.email ?? ticket.from_email ?? "").trim().toLowerCase();
    const name = (parsed.data.name ?? ticket.from_name ?? email).trim();
    const phone = (parsed.data.phone ?? ticket.from_phone ?? "").trim();
    if (!email || !name) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    const { DB, SITE_DB } = getEnv();
    const existing = await DB.prepare(`SELECT id, role FROM users WHERE email = ?`)
      .bind(email)
      .first<{ id: string; role: string }>();

    let userId: string;
    if (existing) {
      if (existing.role !== "patient" && existing.role !== "doctor") {
        return NextResponse.json(
          { error: "Email belongs to a staff account" },
          { status: 409 },
        );
      }
      userId = existing.id;
      if (phone) {
        await DB.prepare(`UPDATE users SET phone = ?, name = COALESCE(NULLIF(name, ''), ?) WHERE id = ?`)
          .bind(phone, name, userId)
          .run();
      }
    } else {
      userId = crypto.randomUUID();
      const position = await nextUserPosition("patient");
      await DB.prepare(
        `INSERT INTO users (id, email, password_hash, role, name, locale, phone, notes, active, position)
         VALUES (?, ?, NULL, 'patient', ?, 'en', ?, '', 1, ?)`,
      )
        .bind(userId, email, name, phone, position)
        .run();
    }

    await SITE_DB.prepare(
      `UPDATE tickets SET patient_user_id = ?, from_phone = COALESCE(NULLIF(?, ''), from_phone),
         updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(userId, phone, ticket.id)
      .run();

    return NextResponse.json({ ok: true, userId });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
