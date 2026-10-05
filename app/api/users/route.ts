import { NextResponse } from "next/server";
import { hashPassword, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { userCreateSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    await requireUser();
    const parsed = userCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { DB } = getEnv();
    const id = crypto.randomUUID();
    const passwordHash = parsed.data.password
      ? await hashPassword(parsed.data.password)
      : null;

    await DB.prepare(
      `INSERT INTO users (id, email, password_hash, role, name, locale)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        parsed.data.email,
        passwordHash,
        parsed.data.role,
        parsed.data.name,
        parsed.data.locale,
      )
      .run();

    const user = await DB.prepare(
      `SELECT id, email, name, role, locale, lat, lng, created_at FROM users WHERE id = ?`,
    )
      .bind(id)
      .first();

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 400 },
    );
  }
}
