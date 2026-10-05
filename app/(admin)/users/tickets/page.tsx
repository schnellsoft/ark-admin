import { getEnv } from "@/lib/env";
import { TicketsBoard } from "@/components/tickets-board";

export default async function TicketsPage() {
  const { DB } = getEnv();
  const tickets = await DB.prepare(
    `SELECT id, subject, status, from_name, from_email, body, created_at, updated_at
     FROM tickets ORDER BY updated_at DESC`,
  ).all<{
    id: string;
    subject: string;
    status: "open" | "in_progress" | "closed";
    from_name: string | null;
    from_email: string | null;
    body: string;
    created_at: string;
    updated_at: string;
  }>();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">Tickets</h1>
        <p className="text-slate-600">Clinic support tickets from the public site.</p>
      </div>
      <TicketsBoard initial={tickets.results ?? []} />
    </div>
  );
}
