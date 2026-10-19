import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { notifyPatient } from "@/lib/push";
import { ticketMessageSchema } from "@/lib/schemas";
import { addTicketMessage, getTicket } from "@/lib/tickets";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = ticketMessageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const ticket = await getTicket(parsed.data.ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const messageId = await addTicketMessage({
      ticketId: parsed.data.ticketId,
      kind: parsed.data.kind,
      body: parsed.data.body,
      authorUserId: user.id,
      authorName: user.name,
    });

    if (
      parsed.data.notifyPatient !== false &&
      parsed.data.kind === "staff" &&
      ticket.patient_user_id
    ) {
      await notifyPatient(ticket.patient_user_id, {
        title: `Ticket #${ticket.ticket_number || ""}`,
        body: parsed.data.body.slice(0, 140),
        url: "/",
      });
    }

    return NextResponse.json({ ok: true, id: messageId });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
