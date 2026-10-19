"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import type { SizePreset, SlideshowSettings } from "@/lib/slideshow-shared";

function SizeFields({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: SizePreset;
  onChange: (v: SizePreset) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-700 p-4">
      <legend className="px-1 text-sm font-medium text-teal-200">{label}</legend>
      <p className="text-xs text-slate-500">{t("slideshow.outputSizeHint")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["width", "height", "quality"] as const).map((key) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`${id}-${key}`}>{t(`slideshow.${key}`)}</Label>
            <Input
              id={`${id}-${key}`}
              type="number"
              min={key === "quality" ? 40 : 240}
              max={key === "quality" ? 100 : undefined}
              value={value[key]}
              onChange={(e) =>
                onChange({ ...value, [key]: Number(e.target.value.replace(/[^\d]/g, "")) })
              }
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function SlideshowSettingsForm({
  initial,
  saveUrl = "/api/site/slideshow/settings",
}: {
  initial: SlideshowSettings;
  saveUrl?: string;
}) {
  const { t } = useI18n();
  const [s, setS] = useState(initial);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const id = useId();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(t("slideshow.saving"));
    try {
      const res = await fetch(saveUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = (await res.json()) as { settings?: SlideshowSettings; error?: string };
      if (!res.ok) {
        setStatus(data.error ?? t("slideshow.saveFailed"));
        return;
      }
      if (data.settings) setS(data.settings);
      setStatus(t("slideshow.settingsSaved"));
    } catch {
      setStatus(t("slideshow.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <fieldset className="space-y-4 rounded-xl border border-slate-700 p-4">
        <legend className="px-1 text-lg font-medium text-teal-200">
          {t("slideshow.playback")}
        </legend>
        <p className="text-sm text-slate-400">{t("slideshow.playbackHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${id}-anim`}>{t("slideshow.animation")}</Label>
            <select
              id={`${id}-anim`}
              className="h-9 w-full rounded-md border border-slate-600 bg-slate-900/80 px-2 text-sm"
              value={s.animation}
              onChange={(e) => setS({ ...s, animation: e.target.value })}
            >
              {["fade", "pull", "push", "scale", "slide"].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-interval`}>{t("slideshow.autoplayInterval")}</Label>
            <Input
              id={`${id}-interval`}
              type="number"
              min={1000}
              value={s.autoplayInterval}
              onChange={(e) =>
                setS({ ...s, autoplayInterval: Number(e.target.value.replace(/[^\d]/g, "")) })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-duration`}>{t("slideshow.animationDuration")}</Label>
            <Input
              id={`${id}-duration`}
              type="number"
              min={200}
              value={s.animationDuration}
              onChange={(e) =>
                setS({
                  ...s,
                  animationDuration: Number(e.target.value.replace(/[^\d]/g, "")),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-ratio`}>{t("slideshow.ratio")}</Label>
            <Input
              id={`${id}-ratio`}
              value={s.ratio}
              onChange={(e) => setS({ ...s, ratio: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-velocity`}>{t("slideshow.velocity")}</Label>
            <Input
              id={`${id}-velocity`}
              type="number"
              step={0.05}
              min={0.05}
              value={s.velocity}
              onChange={(e) => setS({ ...s, velocity: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-swipe`}>{t("slideshow.swipeThreshold")}</Label>
            <Input
              id={`${id}-swipe`}
              type="number"
              min={16}
              value={s.swipeThreshold}
              onChange={(e) =>
                setS({ ...s, swipeThreshold: Number(e.target.value.replace(/[^\d]/g, "")) })
              }
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <p className="text-xs text-slate-500">{t("slideshow.heightFillHint")}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-min`}>{t("slideshow.minHeight")}</Label>
            <Input
              id={`${id}-min`}
              value={s.minHeight}
              placeholder="calc(100dvh - var(--header-block-size))"
              onChange={(e) => setS({ ...s, minHeight: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-max`}>{t("slideshow.maxHeight")}</Label>
            <Input
              id={`${id}-max`}
              value={s.maxHeight}
              placeholder="calc(100dvh - var(--header-block-size))"
              onChange={(e) => setS({ ...s, maxHeight: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-index`}>{t("slideshow.index")}</Label>
            <Input
              id={`${id}-index`}
              type="number"
              min={0}
              value={s.index}
              onChange={(e) =>
                setS({ ...s, index: Number(e.target.value.replace(/[^\d]/g, "")) })
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["autoplay", "autoplay"],
              ["finite", "finite"],
              ["pauseOnHover", "pauseOnHover"],
              ["kenburns", "kenburns"],
            ] as const
          ).map(([key, labelKey]) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal-500"
                checked={s[key]}
                onChange={(e) => setS({ ...s, [key]: e.target.checked })}
              />
              {t(`slideshow.${labelKey}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <SizeFields
        id={`${id}-desktop`}
        label={t("slideshow.desktopSize")}
        value={s.output.desktop}
        onChange={(desktop) => setS({ ...s, output: { ...s.output, desktop } })}
      />
      <SizeFields
        id={`${id}-ml`}
        label={t("slideshow.mobileLandscapeSize")}
        value={s.output.mobileLandscape}
        onChange={(mobileLandscape) =>
          setS({ ...s, output: { ...s.output, mobileLandscape } })
        }
      />
      <SizeFields
        id={`${id}-mp`}
        label={t("slideshow.mobilePortraitSize")}
        value={s.output.mobilePortrait}
        onChange={(mobilePortrait) => setS({ ...s, output: { ...s.output, mobilePortrait } })}
      />

      <fieldset className="space-y-3 rounded-xl border border-slate-700 p-4">
        <legend className="px-1 text-sm font-medium text-teal-200">
          {t("slideshow.mobileViewport")}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${id}-vw`}>{t("slideshow.width")}</Label>
            <Input
              id={`${id}-vw`}
              type="number"
              min={240}
              value={s.output.mobileViewport.width}
              onChange={(e) =>
                setS({
                  ...s,
                  output: {
                    ...s.output,
                    mobileViewport: {
                      ...s.output.mobileViewport,
                      width: Number(e.target.value.replace(/[^\d]/g, "")),
                    },
                  },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-vh`}>{t("slideshow.height")}</Label>
            <Input
              id={`${id}-vh`}
              type="number"
              min={320}
              value={s.output.mobileViewport.height}
              onChange={(e) =>
                setS({
                  ...s,
                  output: {
                    ...s.output,
                    mobileViewport: {
                      ...s.output.mobileViewport,
                      height: Number(e.target.value.replace(/[^\d]/g, "")),
                    },
                  },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-mmw`}>{t("slideshow.mobileMaxWidth")}</Label>
            <Input
              id={`${id}-mmw`}
              type="number"
              min={480}
              value={s.output.mobileMaxWidth}
              onChange={(e) =>
                setS({
                  ...s,
                  output: {
                    ...s.output,
                    mobileMaxWidth: Number(e.target.value.replace(/[^\d]/g, "")),
                  },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-tmw`}>{t("slideshow.tabletMaxWidth")}</Label>
            <Input
              id={`${id}-tmw`}
              type="number"
              min={768}
              value={s.output.tabletMaxWidth}
              onChange={(e) =>
                setS({
                  ...s,
                  output: {
                    ...s.output,
                    tabletMaxWidth: Number(e.target.value.replace(/[^\d]/g, "")),
                  },
                })
              }
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${id}-fmt`}>{t("slideshow.outputFormat")}</Label>
            <select
              id={`${id}-fmt`}
              className="h-9 w-full rounded-md border border-slate-600 bg-slate-900/80 px-2 text-sm"
              value={s.output.outputFormat}
              onChange={(e) =>
                setS({
                  ...s,
                  output: {
                    ...s.output,
                    outputFormat: e.target.value as SlideshowSettings["output"]["outputFormat"],
                  },
                })
              }
            >
              <option value="webp">WebP</option>
              <option value="jpeg">JPEG</option>
              <option value="avif">AVIF</option>
            </select>
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("slideshow.saving") : t("slideshow.saveSettings")}
        </Button>
        <p className="text-sm text-slate-400">{status}</p>
      </div>
    </form>
  );
}
