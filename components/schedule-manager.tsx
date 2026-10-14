"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import {
  WEEKDAY_I18N_KEYS,
  type ScheduleDay,
} from "@/lib/schedule-shared";

export function ScheduleManager({
  initialDays,
}: {
  initialDays: ScheduleDay[];
}) {
  const { t } = useI18n();
  const [days, setDays] = useState(initialDays);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  function updateDay(
    day: ScheduleDay["day"],
    patch: Partial<Pick<ScheduleDay, "open_time" | "close_time">>,
  ) {
    setDays((prev) =>
      prev.map((row) => (row.day === day ? { ...row, ...patch } : row)),
    );
  }

  async function save() {
    setPending(true);
    setStatus("");
    try {
      const res = await fetch("/api/site/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = (await res.json()) as {
        days?: ScheduleDay[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
      if (data.days) setDays(data.days);
      setStatus(t("grid.saved"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("grid.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.schedule.title")}
        </h1>
        <p className="text-slate-400">{t("section.schedule.description")}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">
                {t("schedule.day") || "Day"}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("schedule.openTime") || "Open Time"}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("schedule.closeTime") || "Closing time"}
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((row) => (
              <tr
                key={row.day}
                className="border-t border-slate-800 odd:bg-slate-950/40"
              >
                <td className="px-4 py-3 font-medium text-slate-200">
                  {t(WEEKDAY_I18N_KEYS[row.day])}
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="time"
                    value={row.open_time}
                    onChange={(e) =>
                      updateDay(row.day, { open_time: e.target.value })
                    }
                    className="max-w-[10rem]"
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="time"
                    value={row.close_time}
                    onChange={(e) =>
                      updateDay(row.day, { close_time: e.target.value })
                    }
                    className="max-w-[10rem]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending} onClick={() => void save()}>
          {pending ? t("grid.saving") : t("grid.save")}
        </Button>
        {status ? (
          <span className="text-sm text-slate-400">{status}</span>
        ) : null}
      </div>
    </div>
  );
}
