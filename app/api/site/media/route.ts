import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { putMedia } from "@/lib/content";

export async function POST(request: Request) {
  try {
    await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `media/${Date.now()}-${safeName}`;
    const buffer = await file.arrayBuffer();
    await putMedia(key, buffer, file.type || "application/octet-stream");
    return NextResponse.json({ key });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
