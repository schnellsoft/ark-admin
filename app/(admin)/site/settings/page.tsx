import { DEFAULT_AI_SETTINGS } from "@/lib/ai-defaults";
import { getSetting } from "@/lib/content";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const site = (await getSetting("site")) ?? { domain: "", adminApiUrl: "" };
  const ai = (await getSetting("ai")) ?? { ...DEFAULT_AI_SETTINGS };
  const email = (await getSetting("email")) ?? {
    to: "admin@ark.local",
    from: "noreply@ark.local",
    resendApiKey: "",
  };
  const locale = (await getSetting("locale")) ?? { default: "en", supported: ["en", "ro"] };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">Settings</h1>
        <p className="text-slate-400">
          Static site domain, AI API keys, email delivery, and locale defaults.
        </p>
      </div>
      <SettingsForm
        initial={{
          site: site as { domain: string; adminApiUrl: string },
          ai: ai as { endpoint: string; model: string; apiKey: string },
          email: email as { to: string; from: string; resendApiKey: string },
          locale: locale as { default: string; supported: string[] },
        }}
      />
    </div>
  );
}
