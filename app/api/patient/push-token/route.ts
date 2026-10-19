import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { z } from "zod";

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const bodySchema = z.object({
  userId: z.string().uuid(),
});

/** Staff: create a magic enroll link token for a patient. */
export async function POST(request: Request) {
  try {
    await requireUser();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { DB } = getEnv();
    const user = await DB.prepare(`SELECT id, role FROM users WHERE id = ?`)
      .bind(parsed.data.userId)
      .first<{ id: string; role: string }>();
    if (!user || user.role !== "patient") {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const token = crypto.randomUUID();
    const tokenHash = await hashToken(token);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    await DB.prepare(
      `INSERT INTO patient_push_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
    )
      .bind(tokenHash, user.id, expires)
      .run();

    return NextResponse.json({
      ok: true,
      token,
      enrollPath: `/patient/push?token=${token}`,
      expires,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
