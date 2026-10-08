import { NextResponse } from "next/server";
import { hashPassword, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { z } from "zod";

const updateBodySchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["admin", "staff", "patient"]).optional(),
  password: z.string().min(6).optional(),
  locale: z.string().min(2).max(10).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const parsed = updateBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { DB } = getEnv();
    const existing = await DB.prepare(`SELECT id FROM users WHERE id = ?`).bind(id).first();
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (parsed.data.email) {
      const clash = await DB.prepare(`SELECT id FROM users WHERE email = ? AND id != ?`)
        .bind(parsed.data.email, id)
        .first();
      if (clash) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    const sets: string[] = [];
    const values: unknown[] = [];

    if (typeof parsed.data.name === "string") {
      sets.push("name = ?");
      values.push(parsed.data.name);
    }
    if (typeof parsed.data.email === "string") {
      sets.push("email = ?");
      values.push(parsed.data.email);
    }
    if (typeof parsed.data.role === "string") {
      sets.push("role = ?");
      values.push(parsed.data.role);
    }
    if (typeof parsed.data.locale === "string") {
      sets.push("locale = ?");
      values.push(parsed.data.locale);
    }
    if (typeof parsed.data.password === "string" && parsed.data.password.length > 0) {
      sets.push("password_hash = ?");
      values.push(await hashPassword(parsed.data.password));
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    await DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();

    const user = await DB.prepare(
      `SELECT id, email, name, role, locale, lat, lng, created_at FROM users WHERE id = ?`,
    )
      .bind(id)
      .first();

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireUser();
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    if (id === me.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const { DB, SITE_DB } = getEnv();
    const existing = await DB.prepare(`SELECT id FROM users WHERE id = ?`).bind(id).first();
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Site DB cleanup (no cross-DB FKs). Extend later for more associations.
    await SITE_DB.prepare(`UPDATE tickets SET assignee_id = NULL WHERE assignee_id = ?`)
      .bind(id)
      .run();
    await SITE_DB.prepare(`DELETE FROM push_subscriptions WHERE user_id = ?`).bind(id).run();
    await DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(id).run();
    await DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 },
    );
  }
}
