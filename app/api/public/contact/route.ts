import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { contactSchema } from "@/lib/schemas";
import { sendContactEmail } from "@/lib/email";
import { notifyStaff } from "@/lib/push";

export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { SITE_DB } = getEnv();
  const id = crypto.randomUUID();
  await SITE_DB.prepare(
    `INSERT INTO messages (id, type, from_name, from_email, body, meta_json)
     VALUES (?, 'contact', ?, ?, ?, ?)`,
  )
    .bind(
      id,
      parsed.data.name,
      parsed.data.email,
      parsed.data.message,
      JSON.stringify({ phone: parsed.data.phone ?? null }),
    )
    .run();

  const emailResult = await sendContactEmail(parsed.data);
  await notifyStaff({
    title: "New contact message",
    body: `${parsed.data.name}: ${parsed.data.message.slice(0, 80)}`,
    url: "/users/messages",
  });

  return NextResponse.json({ ok: true, id, email: emailResult });
}
