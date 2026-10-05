import { NextResponse } from "next/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { geoSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    await requireUser();
    const user = await getCurrentUser();
    const parsed = geoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { DB } = getEnv();
    const id = crypto.randomUUID();
    const userId = parsed.data.userId ?? user?.id ?? null;

    await DB.prepare(
      `INSERT INTO geo_events (id, user_id, lat, lng, label) VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(id, userId, parsed.data.lat, parsed.data.lng, parsed.data.label ?? null)
      .run();

    if (userId) {
      await DB.prepare(
        `UPDATE users SET lat = ?, lng = ?, geo_updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(parsed.data.lat, parsed.data.lng, userId)
        .run();
    }

    const event = {
      id,
      user_id: userId,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      label: parsed.data.label ?? null,
      created_at: new Date().toISOString(),
      name: user?.name ?? null,
    };

    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
