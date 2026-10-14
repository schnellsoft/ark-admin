export const SCHEDULE_CONTENT_KEY = "schedule/schedule.json";

/** ISO weekday: 1 = Monday … 7 = Sunday */
export type WeekdayIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ScheduleDay = {
  day: WeekdayIndex;
  open_time: string;
  close_time: string;
};

export type ScheduleDocument = {
  days: ScheduleDay[];
  updatedAt: string;
};

export const WEEKDAY_ORDER: WeekdayIndex[] = [1, 2, 3, 4, 5, 6, 7];

export const WEEKDAY_I18N_KEYS: Record<WeekdayIndex, string> = {
  1: "schedule.monday",
  2: "schedule.tuesday",
  3: "schedule.wednesday",
  4: "schedule.thursday",
  5: "schedule.friday",
  6: "schedule.saturday",
  7: "schedule.sunday",
};

export function emptyScheduleDays(): ScheduleDay[] {
  return WEEKDAY_ORDER.map((day) => ({
    day,
    open_time: "",
    close_time: "",
  }));
}

/** Normalize HH:mm or HH:mm:ss; empty string allowed (closed / unset). */
export function normalizeTimeInput(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
  if (!match) return raw;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return raw;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function validateScheduleDays(days: ScheduleDay[]): string | null {
  if (days.length !== 7) return "Schedule must have seven days";
  const seen = new Set<number>();
  for (const row of days) {
    if (!WEEKDAY_ORDER.includes(row.day)) return "Invalid weekday";
    if (seen.has(row.day)) return "Duplicate weekday";
    seen.add(row.day);
    const open = normalizeTimeInput(row.open_time);
    const close = normalizeTimeInput(row.close_time);
    if (open && !/^\d{2}:\d{2}$/.test(open)) return "Invalid open time";
    if (close && !/^\d{2}:\d{2}$/.test(close)) return "Invalid closing time";
    if ((open && !close) || (!open && close)) {
      return "Open and closing times must both be set, or both empty";
    }
  }
  return null;
}
