"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import type { StuffSpotlightSettings } from "@/lib/stuff-shared";

export function StuffSpotlightSettingsForm({
  initial,
}: {
  initial: StuffSpotlightSettings;
}) {
  const { t } = useI18n();
  const [s, setS] = useState(initial);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const id = useId();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(t("stuff.spotlightSaving") || "Saving…");
    try {
      const res = await fetch("/api/site/stuff/spotlight", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = (await res.json()) as {
        settings?: StuffSpotlightSettings;
        error?: string;
      };
      if (!res.ok) {
        setStatus(
          data.error ?? (t("stuff.spotlightSaveFailed") || "Save failed"),
        );
        return;
      }
      if (data.settings) setS(data.settings);
      setStatus(t("stuff.spotlightSaved") || "Saved");
    } catch {
      setStatus(t("stuff.spotlightSaveFailed") || "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-6">
      <h2 className="text-lg text-teal-200">
        {t("stuff.tabSpotlight") || "Spotlight"}
      </h2>
      <p className="text-sm text-slate-400">
        {t("stuff.spotlightHint") ||
          "Controls autoplay for the team spotlight on the public site."}
      </p>

      <fieldset className="space-y-4 rounded-xl border border-slate-700 p-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={s.autoplay}
            onChange={(e) => setS({ ...s, autoplay: e.target.checked })}
          />
          {t("stuff.spotlightAutoplay") || "Autoplay"}
        </label>

        <div className="space-y-1">
          <Label htmlFor={`${id}-delay`}>
            {t("stuff.spotlightDelay") || "Delay (ms)"}
          </Label>
          <Input
            id={`${id}-delay`}
            type="number"
            min={500}
            step={100}
            value={s.delayMs}
            onChange={(e) =>
              setS({
                ...s,
                delayMs: Number(e.target.value.replace(/[^\d]/g, "")) || 0,
              })
            }
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={s.stopOnHover}
            onChange={(e) => setS({ ...s, stopOnHover: e.target.checked })}
          />
          {t("stuff.spotlightStopOnHover") || "Stop when hover"}
        </label>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? t("stuff.spotlightSaving") || "Saving…"
            : t("grid.save") || "Save"}
        </Button>
        {status ? (
          <span className="text-sm text-slate-400">{status}</span>
        ) : null}
      </div>
    </form>
  );
}
