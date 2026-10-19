import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { ticketCreateSchema } from "@/lib/schemas";
import {
  addTicketMessage,
  enrichTicketsWithCrm,
  listTickets,
  nextTicketNumber,
} from "@/lib/tickets";

export async function GET() {
  try {
    await requireUser();
    const tickets = await enrichTicketsWithCrm(await listTickets());
    return NextResponse.json({ tickets });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = ticketCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { SITE_DB } = getEnv();
    const id = crypto.randomUUID();
    const phone = (parsed.data.fromPhone ?? "").trim();
    const ticketNumber = await nextTicketNumber();
    const body = parsed.data.body.trim();

    await SITE_DB.prepare(
      `INSERT INTO tickets (
         id, subject, status, priority, from_name, from_email, from_phone, source,
         body, ticket_number, patient_user_id, due_at, assignee_id
       ) VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        parsed.data.subject,
        parsed.data.priority ?? "normal",
        parsed.data.fromName,
        parsed.data.fromEmail,
        phone,
        parsed.data.source ?? "admin",
        body,
        ticketNumber,
        parsed.data.patientUserId ?? null,
        parsed.data.dueAt ?? null,
        user.id,
      )
      .run();

    await addTicketMessage({
      ticketId: id,
      kind: "staff",
      body,
      authorUserId: user.id,
      authorName: user.name,
    });

    return NextResponse.json({ ok: true, id, ticketNumber });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
