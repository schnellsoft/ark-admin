import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { ticketCreateSchema } from "@/lib/schemas";
import { notifyStaff } from "@/lib/push";

export async function POST(request: Request) {
  const parsed = ticketCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { SITE_DB } = getEnv();
  const id = crypto.randomUUID();
  await SITE_DB.prepare(
    `INSERT INTO tickets (id, subject, status, from_name, from_email, body)
     VALUES (?, ?, 'open', ?, ?, ?)`,
  )
    .bind(id, parsed.data.subject, parsed.data.fromName, parsed.data.fromEmail, parsed.data.body)
    .run();

  await SITE_DB.prepare(
    `INSERT INTO messages (id, type, from_name, from_email, body, meta_json)
     VALUES (?, 'ticket', ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      parsed.data.fromName,
      parsed.data.fromEmail,
      parsed.data.body,
      JSON.stringify({ ticketId: id, subject: parsed.data.subject }),
    )
    .run();

  await notifyStaff({
    title: "New ticket",
    body: parsed.data.subject,
    url: "/users/tickets",
  });

  return NextResponse.json({ ok: true, id });
}
