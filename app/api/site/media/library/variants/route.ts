import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { attachLibraryImageVariants } from "@/lib/library";

export async function POST(request: Request) {
  try {
    await requireUser();
    const form = await request.formData();
    const id = String(form.get("id") ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const webpFile = form.get("webp");
    const portrait800File = form.get("portrait800");
    const webp =
      webpFile instanceof File && webpFile.size > 0
        ? await webpFile.arrayBuffer()
        : null;
    const portrait800 =
      portrait800File instanceof File && portrait800File.size > 0
        ? await portrait800File.arrayBuffer()
        : null;

    if (!webp && !portrait800) {
      return NextResponse.json(
        { error: "Provide webp and/or portrait800" },
        { status: 400 },
      );
    }

    const image = await attachLibraryImageVariants({
      id,
      webp,
      portrait800,
    });
    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Variant upload failed",
      },
      { status: 400 },
    );
  }
}
