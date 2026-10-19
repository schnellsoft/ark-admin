import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { ticketCreateSchema } from "@/lib/schemas";
import { notifyStaff } from "@/lib/push";
import { addTicketMessage, countTicketUnread, nextTicketNumber } from "@/lib/tickets";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const parsed = ticketCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { SITE_DB } = getEnv();
  const id = crypto.randomUUID();
  const services = parsed.data.serviceSlugs ?? [];
  const phone = (parsed.data.fromPhone ?? "").trim();
  const ticketNumber = await nextTicketNumber();
  const meta = {
    ticketId: id,
    subject: parsed.data.subject,
    phone: phone || undefined,
    services,
  };

  const bodyParts = [parsed.data.body.trim()];
  if (phone) bodyParts.push(`Phone: ${phone}`);
  if (services.length) bodyParts.push(`Services: ${services.join(", ")}`);
  const body = bodyParts.join("\n\n");

  await SITE_DB.prepare(
    `INSERT INTO tickets (
       id, subject, status, priority, from_name, from_email, from_phone, source,
       body, ticket_number, patient_user_id, due_at
     ) VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      parsed.data.subject,
      parsed.data.priority ?? "normal",
      parsed.data.fromName,
      parsed.data.fromEmail,
      phone,
      parsed.data.source ?? "website",
      body,
      ticketNumber,
      parsed.data.patientUserId ?? null,
      parsed.data.dueAt ?? null,
    )
    .run();

  await addTicketMessage({
    ticketId: id,
    kind: "patient",
    body,
    authorName: parsed.data.fromName,
  });

  await SITE_DB.prepare(
    `INSERT INTO messages (id, type, from_name, from_email, body, meta_json)
     VALUES (?, 'ticket', ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      parsed.data.fromName,
      parsed.data.fromEmail,
      body,
      JSON.stringify(meta),
    )
    .run();

  const unread = await countTicketUnread();
  await notifyStaff({
    title: "New ticket",
    body: parsed.data.subject,
    url: "/users/tickets",
    badge: unread,
  });

  return NextResponse.json({ ok: true, id, ticketNumber }, { headers: CORS_HEADERS });
}
