import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { countTicketUnread } from "@/lib/tickets";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { SITE_DB } = getEnv();
  const [unread, ticketUnread] = await Promise.all([
    SITE_DB.prepare(
      `SELECT COUNT(*) as c FROM messages WHERE read_at IS NULL AND type IN ('contact', 'chat')`,
    ).first<{ c: number }>(),
    countTicketUnread(),
  ]);

  return (
    <AdminShell
      userName={user.name}
      unreadCount={unread?.c ?? 0}
      ticketUnreadCount={ticketUnread}
    >
      {children}
    </AdminShell>
  );
}
