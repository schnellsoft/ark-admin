import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  generateAndStorePriceListPdf,
  getPriceListPdf,
  SERVICES_PDF_KEY,
} from "@/lib/services";

export async function GET() {
  try {
    await requireUser();
    const buf = await getPriceListPdf();
    if (!buf) {
      return NextResponse.json({ error: "PDF not generated yet" }, { status: 404 });
    }
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="price-list.pdf"`,
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
      bytes: result.bytes,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF export failed" },
      { status: 500 },
    );
  }
}
