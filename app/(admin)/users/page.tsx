import { getEnv } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { UsersManager } from "@/components/users-manager";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

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
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">Users</h1>
        <p className="text-slate-400">Manage clinic accounts — edit name, email, password, or delete.</p>
      </div>
      <UsersManager initial={users.results ?? []} currentUserId={me.id} />
    </div>
  );
}
