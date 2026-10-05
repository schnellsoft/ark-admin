import { NextResponse } from "next/server";
import { createSession, ensureDefaultAdmin, verifyPassword } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  await ensureDefaultAdmin();
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials payload" }, { status: 400 });
  }

  const { DB } = getEnv();
  const user = await DB.prepare(
    `SELECT id, password_hash, role FROM users WHERE email = ?`,
  )
    .bind(parsed.data.email)
    .first<{ id: string; password_hash: string | null; role: string }>();

  if (!user?.password_hash || !["admin", "staff"].includes(user.role)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await verifyPassword(parsed.data.password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
