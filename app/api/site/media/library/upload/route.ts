import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  ACCEPTED_IMAGE_TYPES,
  createLibraryImage,
  getLibrarySettings,
  suggestLibraryNameFromFile,
} from "@/lib/library";

export async function POST(request: Request) {
  try {
    await requireUser();
    const settings = await getLibrarySettings();
    const form = await request.formData();

    const master = form.get("master");
    if (!(master instanceof File)) {
      return NextResponse.json({ error: "Missing master image" }, { status: 400 });
    }

    const contentType = (master.type || "application/octet-stream").toLowerCase();
    if (
      !(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(contentType) &&
      contentType !== "image/jpg"
    ) {
      return NextResponse.json(
        { error: "Only JPG, PNG, or WebP images are accepted" },
        { status: 415 },
      );
    }

    if (master.size > settings.maxBytes) {
      return NextResponse.json(
        {
          error: `Each image must be ${Math.round(settings.maxBytes / (1024 * 1024))} MB or smaller`,
        },
        { status: 400 },
      );
    }

    const width = Number.parseInt(String(form.get("width") ?? "0"), 10);
    const height = Number.parseInt(String(form.get("height") ?? "0"), 10);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      return NextResponse.json({ error: "Invalid dimensions" }, { status: 400 });
    }

    let categoryIds: string[] = [];
    const rawCategories = form.get("categoryIds");
    if (typeof rawCategories === "string" && rawCategories.trim()) {
      try {
        const parsed = JSON.parse(rawCategories) as unknown;
        if (Array.isArray(parsed)) {
          categoryIds = parsed.map(String);
        }
      } catch {
        return NextResponse.json({ error: "Invalid categoryIds" }, { status: 400 });
      }
    }

    const id =
      typeof form.get("id") === "string" && String(form.get("id")).trim()
        ? String(form.get("id")).trim()
        : crypto.randomUUID();

    const preferredName =
      String(form.get("name") ?? "").trim() ||
      suggestLibraryNameFromFile(master.name || `image-${id}`);

    const alt = String(form.get("alt") ?? "").trim();

    const webpFile = form.get("webp");
    const webp =
      webpFile instanceof File && webpFile.size > 0
        ? await webpFile.arrayBuffer()
        : null;

    const masterType =
      contentType === "image/jpg" ? "image/jpeg" : contentType;

    const image = await createLibraryImage({
      id,
      name: preferredName,
      alt,
      master: await master.arrayBuffer(),
      masterContentType: masterType,
      webp: settings.convertToWebp ? webp : null,
      width,
      height,
      categoryIds,
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
