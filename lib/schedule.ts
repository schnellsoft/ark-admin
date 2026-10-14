import { getEnv } from "./env";
import {
  SCHEDULE_CONTENT_KEY,
  WEEKDAY_ORDER,
  emptyScheduleDays,
  normalizeTimeInput,
  validateScheduleDays,
  type ScheduleDay,
  type ScheduleDocument,
  type WeekdayIndex,
} from "./schedule-shared";

type DayDb = {
  day: number;
  open_time: string;
  close_time: string;
};

async function ensureDefaultRows() {
  const { SITE_DB } = getEnv();
  for (const day of WEEKDAY_ORDER) {
    await SITE_DB.prepare(
      `INSERT OR IGNORE INTO schedule_days (day, open_time, close_time)
       VALUES (?, '', '')`,
    )
      .bind(day)
      .run();
  }
}

export async function getScheduleDays(): Promise<ScheduleDay[]> {
  const { SITE_DB } = getEnv();
  await ensureDefaultRows();
  const { results } = await SITE_DB.prepare(
    `SELECT day, open_time, close_time FROM schedule_days ORDER BY day ASC`,
  ).all<DayDb>();

  const byDay = new Map(
    (results ?? []).map((row) => [
      row.day as WeekdayIndex,
      {
        day: row.day as WeekdayIndex,
        open_time: row.open_time ?? "",
        close_time: row.close_time ?? "",
      } satisfies ScheduleDay,
    ]),
  );

  return WEEKDAY_ORDER.map(
    (day) => byDay.get(day) ?? { day, open_time: "", close_time: "" },
  );
}

export async function saveScheduleDays(
  days: ScheduleDay[],
): Promise<ScheduleDay[]> {
  const error = validateScheduleDays(days);
  if (error) throw new Error(error);

  const { SITE_DB } = getEnv();
  await ensureDefaultRows();

  const normalized = WEEKDAY_ORDER.map((day) => {
    const row = days.find((d) => d.day === day) ?? {
      day,
      open_time: "",
      close_time: "",
    };
    return {
      day,
      open_time: normalizeTimeInput(row.open_time),
      close_time: normalizeTimeInput(row.close_time),
    };
  });

  for (const row of normalized) {
    await SITE_DB.prepare(
      `INSERT INTO schedule_days (day, open_time, close_time, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(day) DO UPDATE SET
         open_time = excluded.open_time,
         close_time = excluded.close_time,
         updated_at = datetime('now')`,
    )
      .bind(row.day, row.open_time, row.close_time)
      .run();
  }

  await publishSchedule();
  return getScheduleDays();
}

export async function buildScheduleDocument(): Promise<ScheduleDocument> {
  const days = await getScheduleDays();
  return {
    days: days.length ? days : emptyScheduleDays(),
    updatedAt: new Date().toISOString(),
  };
}

export async function publishSchedule(): Promise<void> {
  const { CONTENT } = getEnv();
  const doc = await buildScheduleDocument();
  await CONTENT.put(SCHEDULE_CONTENT_KEY, JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}
