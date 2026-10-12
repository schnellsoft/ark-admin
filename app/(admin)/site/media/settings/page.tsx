import { LibrarySettingsForm } from "@/components/library-settings-form";
import { getLibrarySettings } from "@/lib/library";

export default async function MediaSettingsPage() {
  const settings = await getLibrarySettings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Media · Settings
        </h1>
        <p className="text-slate-400">
          Resize and WebP defaults applied in the browser before upload to{" "}
          <code className="text-teal-300/90">ark-admin-media/library/</code>.
        </p>
      </div>
      <LibrarySettingsForm initial={settings} />
    </div>
  );
}
