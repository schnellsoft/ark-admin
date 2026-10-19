import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { pushSubscribeSchema } from "@/lib/schemas";
import { z } from "zod";

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const bodySchema = pushSubscribeSchema.extend({
  token: z.string().uuid(),
});

/** Public: patient enrolls push using magic token. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { DB, SITE_DB } = getEnv();
  const tokenHash = await hashToken(parsed.data.token);
  const row = await DB.prepare(
    `SELECT user_id FROM patient_push_tokens
     WHERE token_hash = ? AND expires_at > datetime('now')`,
  )
    .bind(tokenHash)
    .first<{ user_id: string }>();

  if (!row) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  await SITE_DB.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth`,
  )
    .bind(
      crypto.randomUUID(),
      row.user_id,
      parsed.data.endpoint,
      parsed.data.keys.p256dh,
      parsed.data.keys.auth,
    )
    .run();

  return NextResponse.json({ ok: true });
}
