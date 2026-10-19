import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  enrichTicketsWithCrm,
  getTicket,
  listTicketMessages,
  markTicketMessagesRead,
} from "@/lib/tickets";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const ticket = await getTicket(id);
    if (!ticket) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [enriched] = await enrichTicketsWithCrm([ticket]);
    const messages = await listTicketMessages(id);
    return NextResponse.json({ ticket: enriched, messages });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action === "mark-read") {
      await markTicketMessagesRead(id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
