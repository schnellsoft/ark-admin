import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getLibrarySettings,
  normalizeLibrarySettings,
  saveLibrarySettings,
} from "@/lib/library";
import { z } from "zod";

const settingsSchema = z.object({
  maxWidth: z.union([z.string(), z.number()]),
  convertToWebp: z.boolean(),
  jpegQuality: z.union([z.string(), z.number()]).optional(),
  webpQuality: z.union([z.string(), z.number()]).optional(),
  maxBytes: z.union([z.string(), z.number()]).optional(),
  maxFilesPerBatch: z.union([z.string(), z.number()]).optional(),
});

export async function GET() {
  try {
    await requireUser();
    const settings = await getLibrarySettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser();
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const current = await getLibrarySettings();
    const settings = await saveLibrarySettings(
      normalizeLibrarySettings({
        ...current,
        maxWidth: Number(parsed.data.maxWidth),
        convertToWebp: parsed.data.convertToWebp,
        ...(parsed.data.jpegQuality !== undefined
          ? { jpegQuality: Number(parsed.data.jpegQuality) }
          : {}),
        ...(parsed.data.webpQuality !== undefined
          ? { webpQuality: Number(parsed.data.webpQuality) }
          : {}),
        ...(parsed.data.maxBytes !== undefined
          ? { maxBytes: Number(parsed.data.maxBytes) }
          : {}),
        ...(parsed.data.maxFilesPerBatch !== undefined
          ? { maxFilesPerBatch: Number(parsed.data.maxFilesPerBatch) }
          : {}),
      }),
    );
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
