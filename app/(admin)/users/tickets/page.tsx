import { getCurrentUser } from "@/lib/auth";
import { listCrmUsers } from "@/lib/crm";
import { countTicketUnread, enrichTicketsWithCrm, listTickets } from "@/lib/tickets";
import { TicketsBoard } from "@/components/tickets-board";
import { redirect } from "next/navigation";

export default async function TicketsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [tickets, doctors, ticketUnread] = await Promise.all([
    enrichTicketsWithCrm(await listTickets()),
    listCrmUsers("doctor"),
    countTicketUnread(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">Tickets</h1>
        <p className="text-slate-400">
          Receptionist workspace — register patients, thread replies, book appointments, push enroll.
        </p>
      </div>
      <TicketsBoard
        initial={tickets}
        currentUserId={me.id}
        doctors={doctors}
        ticketUnread={ticketUnread}
      />
    </div>
  );
}
