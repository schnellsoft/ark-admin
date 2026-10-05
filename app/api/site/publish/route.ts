import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { publishToCloud } from "@/lib/content";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await publishToCloud(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publish failed" },
      { status: 500 },
    );
  }
}
