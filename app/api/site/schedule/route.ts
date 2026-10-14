import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getScheduleDays, saveScheduleDays } from "@/lib/schedule";
import { WEEKDAY_ORDER, type ScheduleDay } from "@/lib/schedule-shared";
import { z } from "zod";

const daySchema = z.object({
  day: z.number().int().min(1).max(7),
  open_time: z.string(),
  close_time: z.string(),
});

const bulkSchema = z.object({
  days: z.array(daySchema).length(7),
});

export async function GET() {
  try {
    await requireUser();
    const days = await getScheduleDays();
    return NextResponse.json({ days });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = bulkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const byDay = new Map(parsed.data.days.map((d) => [d.day, d]));
    const rows: ScheduleDay[] = WEEKDAY_ORDER.map((day) => {
      const row = byDay.get(day);
      return {
        day,
        open_time: row?.open_time ?? "",
        close_time: row?.close_time ?? "",
      };
    });
    const days = await saveScheduleDays(rows);
    return NextResponse.json({ days });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
