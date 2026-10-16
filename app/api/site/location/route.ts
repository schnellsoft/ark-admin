import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getLocationSettings, saveLocationSettings } from "@/lib/location";
import { emptyLocationSettings } from "@/lib/location-shared";
import { z } from "zod";

const locationSchema = z.object({
  latitude: z.string(),
  longitude: z.string(),
  address: z.string().default(""),
  google_maps_key: z.string(),
  building_library_id: z.string().nullable().optional(),
  building_master_key: z.string().default(""),
  building_webp_key: z.string().nullable().optional(),
});

export async function GET() {
  try {
    await requireUser();
    const location = await getLocationSettings();
    return NextResponse.json({ location });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = locationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const base = emptyLocationSettings();
    const location = await saveLocationSettings({
      ...base,
      ...parsed.data,
      building_library_id: parsed.data.building_library_id ?? null,
      building_webp_key: parsed.data.building_webp_key ?? null,
    });
    return NextResponse.json({ location });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
