import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  try {
    await requireUser();
    const publicKey = await getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
