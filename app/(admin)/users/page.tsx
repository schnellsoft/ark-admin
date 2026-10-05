import { getEnv } from "@/lib/env";
import { UsersManager } from "@/components/users-manager";

export default async function UsersPage() {
  const { DB } = getEnv();
  const users = await DB.prepare(
    `SELECT id, email, name, role, locale, lat, lng, created_at FROM users ORDER BY created_at DESC`,
  ).all<{
    id: string;
    email: string;
    name: string;
    role: "admin" | "staff" | "patient";
    locale: string;
    lat: number | null;
    lng: number | null;
    created_at: string;
  }>();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">Users</h1>
        <p className="text-slate-600">Manage clinic accounts stored in D1.</p>
      </div>
      <UsersManager initial={users.results ?? []} />
    </div>
  );
}
