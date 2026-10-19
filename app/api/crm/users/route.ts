import { NextResponse } from "next/server";
import { hashPassword, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { listCrmUsers, nextUserPosition, type CrmRole } from "@/lib/crm";
import { crmReorderSchema, userCreateSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    await requireUser();
    const role = new URL(request.url).searchParams.get("role");
    if (role !== "patient" && role !== "doctor") {
      return NextResponse.json({ error: "role=patient|doctor required" }, { status: 400 });
    }
    return NextResponse.json({ users: await listCrmUsers(role) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const parsed = userCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    if (parsed.data.role !== "patient" && parsed.data.role !== "doctor") {
      return NextResponse.json({ error: "Only patient or doctor" }, { status: 400 });
    }

    const { DB } = getEnv();
    const id = parsed.data.id ?? crypto.randomUUID();
    const role = parsed.data.role as CrmRole;
    const position = parsed.data.position ?? (await nextUserPosition(role));
    const passwordHash = parsed.data.password
      ? await hashPassword(parsed.data.password)
      : null;

    await DB.prepare(
      `INSERT INTO users (id, email, password_hash, role, name, locale, phone, notes, active, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        parsed.data.email,
        passwordHash,
        role,
        parsed.data.name,
        parsed.data.locale,
        parsed.data.phone ?? "",
        parsed.data.notes ?? "",
        parsed.data.active === false ? 0 : 1,
        position,
      )
      .run();

    const user = await DB.prepare(
      `SELECT id, email, name, role, locale,
              COALESCE(phone,'') AS phone, COALESCE(notes,'') AS notes,
              COALESCE(active,1) AS active, COALESCE(position,1) AS position, created_at
       FROM users WHERE id = ?`,
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

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = crmReorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { DB } = getEnv();
    let pos = 1;
    for (const id of parsed.data.orderedIds) {
      await DB.prepare(`UPDATE users SET position = ? WHERE id = ? AND role = ?`)
        .bind(pos, id, parsed.data.role)
        .run();
      pos += 1;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const patchSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(5000).optional(),
  active: z.boolean().optional(),
  locale: z.string().min(2).max(10).optional(),
  position: z.number().int().positive().optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireUser();
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { DB } = getEnv();
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of ["email", "name", "phone", "notes", "locale"] as const) {
      if (typeof parsed.data[key] === "string") {
        sets.push(`${key} = ?`);
        values.push(parsed.data[key]);
      }
    }
    if (typeof parsed.data.active === "boolean") {
      sets.push("active = ?");
      values.push(parsed.data.active ? 1 : 0);
    }
    if (typeof parsed.data.position === "number") {
      sets.push("position = ?");
      values.push(parsed.data.position);
    }
    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields" }, { status: 400 });
    }
    values.push(parsed.data.id);
    await DB.prepare(
      `UPDATE users SET ${sets.join(", ")} WHERE id = ? AND role IN ('patient', 'doctor')`,
    )
      .bind(...values)
      .run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireUser();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { DB } = getEnv();
    await DB.prepare(`DELETE FROM users WHERE id = ? AND role IN ('patient', 'doctor')`)
      .bind(id)
      .run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
