import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { DB } = getEnv();
  const unread = await DB.prepare(
    `SELECT COUNT(*) as c FROM messages WHERE read_at IS NULL AND type IN ('contact', 'chat', 'ticket')`,
  ).first<{ c: number }>();

  return (
    <AdminShell userName={user.name} unreadCount={unread?.c ?? 0}>
      {children}
    </AdminShell>
  );
}
