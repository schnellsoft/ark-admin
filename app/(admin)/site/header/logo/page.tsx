import { HeaderLogoForm } from "@/components/header-logo-form";
import { getHeaderLogoDocument } from "@/lib/header-logo";

export default async function HeaderLogoPage() {
  const initial = await getHeaderLogoDocument();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Header · Logo
        </h1>
        <p className="text-slate-400">
          Minimum and maximum clinic logos for the static Astro header. Images go to{" "}
          <code className="text-teal-300/90">ark-admin-media/header/logo</code>; metadata to{" "}
          <code className="text-teal-300/90">ark-admin-content/header/logo/header_logo.json</code>.
        </p>
      </div>
      <HeaderLogoForm initial={initial} />
    </div>
  );
}
