import { SlideshowSettingsForm } from "@/components/slideshow-settings-form";
import { getSlideshowSettings } from "@/lib/slideshow";

export default async function SlideshowSettingsPage() {
  const settings = await getSlideshowSettings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Slideshow · Settings
        </h1>
        <p className="text-slate-400">
          UIkit slideshow options persisted to{" "}
          <code className="text-teal-300/90">slideshow/slideshow.json</code>.
        </p>
      </div>
      <SlideshowSettingsForm initial={settings} />
    </div>
  );
}
