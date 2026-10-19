import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { countTicketUnread } from "@/lib/tickets";

export async function GET() {
  try {
    await requireUser();
    const count = await countTicketUnread();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
