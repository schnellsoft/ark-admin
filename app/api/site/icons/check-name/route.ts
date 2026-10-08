import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isIconNameUnique } from "@/lib/icons";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const name = url.searchParams.get("name") ?? "";
    const excludeId = url.searchParams.get("excludeId") ?? undefined;
    if (!name.trim()) {
      return NextResponse.json({ unique: false });
    }
    const unique = await isIconNameUnique(name, excludeId || undefined);
    return NextResponse.json({ unique });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
