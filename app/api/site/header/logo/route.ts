import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getHeaderLogoDocument,
  putHeaderLogoDocument,
  putHeaderLogoImage,
  type HeaderLogoDocument,
  type HeaderLogoEntry,
  type HeaderLogoSlot,
} from "@/lib/header-logo";

function readSvgField(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readFileField(form: FormData, name: string): File | null {
  const value = form.get(name);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

async function resolveSlot(
  form: FormData,
  slot: HeaderLogoSlot,
  previous: HeaderLogoEntry | null,
): Promise<HeaderLogoEntry | null> {
  const file = readFileField(form, `${slot}_file`);
  if (file) {
    return putHeaderLogoImage(slot, file);
  }

  const svg = readSvgField(form, `${slot}_svg`);
  if (svg !== null) {
    return { type: "svg", svg };
  }

  return previous;
}

export async function GET() {
  try {
    await requireUser();
    const document = await getHeaderLogoDocument();
    return NextResponse.json(document);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const form = await request.formData();
    const previous = await getHeaderLogoDocument();

    const logo_min = await resolveSlot(form, "logo_min", previous.logo_min);
    const logo_max = await resolveSlot(form, "logo_max", previous.logo_max);

    const touched =
      readFileField(form, "logo_min_file") !== null ||
      readSvgField(form, "logo_min_svg") !== null ||
      readFileField(form, "logo_max_file") !== null ||
      readSvgField(form, "logo_max_svg") !== null;

    if (!touched) {
      return NextResponse.json(
        { error: "Provide an image file and/or SVG for at least one logo slot." },
        { status: 400 },
      );
    }

    const document: HeaderLogoDocument = {
      logo_min,
      logo_max,
      updated_at: new Date().toISOString(),
    };

    await putHeaderLogoDocument(document);
    return NextResponse.json({ ok: true, document });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
