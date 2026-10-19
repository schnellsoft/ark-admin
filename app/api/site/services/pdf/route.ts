import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  generateAndStorePriceListPdf,
  getPriceListPdf,
  SERVICES_PDF_KEY,
  servicesPdfKeyForLocale,
} from "@/lib/services";

function localeFromRequest(req: NextRequest): Locale {
  const raw = req.nextUrl.searchParams.get("lang") || "ro";
  return isLocale(raw) ? raw : "ro";
}

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const locale = localeFromRequest(req);
    const buf = await getPriceListPdf(locale);
    if (!buf) {
      return NextResponse.json({ error: "PDF not generated yet" }, { status: 404 });
    }
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="price-list-${locale}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST() {
  try {
    await requireUser();
    const result = await generateAndStorePriceListPdf();
    return NextResponse.json({
      ok: true,
      key: result.key || SERVICES_PDF_KEY,
      keys: result.keys,
      bytes: result.bytes,
      bytesByLocale: result.bytesByLocale,
      files: (["ro", "en", "bg"] as const).map((lang) => ({
        lang,
        key: servicesPdfKeyForLocale(lang),
        bytes: result.bytesByLocale[lang],
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF export failed" },
      { status: 500 },
    );
  }
}
