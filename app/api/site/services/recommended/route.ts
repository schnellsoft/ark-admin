import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listRecommended, listServices, replaceRecommended } from "@/lib/services";
import { z } from "zod";

const schema = z.object({
  serviceIds: z.array(z.string().min(1)),
});

export async function GET() {
  try {
    await requireUser();
    const [recommended, services] = await Promise.all([
      listRecommended(),
      listServices(),
    ]);
    return NextResponse.json({ recommended, services });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const recommended = await replaceRecommended(parsed.data.serviceIds);
    return NextResponse.json({ recommended });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
