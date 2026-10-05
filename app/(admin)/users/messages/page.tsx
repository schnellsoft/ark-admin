import { getEnv } from "@/lib/env";
import { MessagesInbox } from "@/components/messages-inbox";

export default async function MessagesPage() {
  const { DB } = getEnv();
  const messages = await DB.prepare(
    `SELECT id, type, from_name, from_email, body, read_at, created_at
     FROM messages
     ORDER BY created_at DESC
     LIMIT 200`,
  ).all<{
    id: string;
    type: string;
    from_name: string | null;
    from_email: string | null;
    body: string;
    read_at: string | null;
    created_at: string;
  }>();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">Messages</h1>
        <p className="text-slate-600">Contact form, chat, and ticket messages.</p>
      </div>
      <MessagesInbox initial={messages.results ?? []} />
    </div>
  );
}
