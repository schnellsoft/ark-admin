import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import {
  getHeaderLogoDocument,
  type HeaderLogoSlot,
} from "@/lib/header-logo";

function isSlot(value: string | null): value is HeaderLogoSlot {
  return value === "logo_min" || value === "logo_max";
}

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const slotParam = url.searchParams.get("slot");
    if (!isSlot(slotParam)) {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }

    const document = await getHeaderLogoDocument();
    const entry = document[slotParam];
    if (!entry || entry.type !== "image" || !entry.src) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { MEDIA } = getEnv();
    const obj = await MEDIA.get(entry.src);
    if (!obj) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      obj.httpMetadata?.contentType || "application/octet-stream",
    );
    headers.set("Cache-Control", "private, max-age=30");
    if (document.updated_at) {
      headers.set("ETag", `"${document.updated_at}"`);
    }

    return new NextResponse(obj.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
