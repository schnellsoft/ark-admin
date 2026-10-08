import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { pushSubscribeSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = pushSubscribeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { SITE_DB } = getEnv();
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
        user.id,
        parsed.data.endpoint,
        parsed.data.keys.p256dh,
        parsed.data.keys.auth,
      )
      .run();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
