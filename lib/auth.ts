import { cookies } from "next/headers";
import { getEnv } from "./env";
import { ensureSchema } from "./ensure-schema";

const SESSION_COOKIE = "ark_session";
const PBKDF2_ITERATIONS = 100_000;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "patient";
  locale: string;
};

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return `${toHex(salt.buffer)}.${toHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex] = stored.split(".");
  if (!saltHex) return false;
  const next = await hashPassword(password, saltHex);
  return next === stored;
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(digest);
}

export async function ensureDefaultAdmin() {
  await ensureSchema();
  const { DB } = getEnv();
  const existing = await DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind("admin@ark.local")
    .first();
  if (existing) return;

  const passwordHash = await hashPassword("changeme");
  await DB.prepare(
    `INSERT INTO users (id, email, password_hash, role, name, locale)
     VALUES (?, ?, ?, 'admin', 'Ark Admin', 'en')`,
  )
    .bind(crypto.randomUUID(), "admin@ark.local", passwordHash)
    .run();
}

export async function createSession(userId: string) {
  const { DB, SESSION_SECRET } = getEnv();
  const token = `${crypto.randomUUID()}.${SESSION_SECRET ? SESSION_SECRET.slice(0, 8) : "local"}`;
  const tokenHash = await hashToken(token);
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

  await DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
  )
    .bind(id, userId, tokenHash, expires)
    .run();

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const { DB } = getEnv();
    const tokenHash = await hashToken(token);
    await DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  await ensureDefaultAdmin();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { DB } = getEnv();
  const tokenHash = await hashToken(token);
  const row = await DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.locale
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now')
       AND u.role IN ('admin', 'staff')`,
  )
    .bind(tokenHash)
    .first<AuthUser>();

  return row ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
