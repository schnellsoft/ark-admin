import { HeaderLogoForm } from "@/components/header-logo-form";
import {
  getHeaderLogoDocument,
  getHeaderLogoPreviews,
} from "@/lib/header-logo";

export default async function HeaderLogoPage() {
  const initial = await getHeaderLogoDocument();
  const initialPreviews = await getHeaderLogoPreviews(initial);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Header · Logo
        </h1>
        <p className="text-slate-400">
          Upload or replace <strong className="font-medium text-slate-300">logo_min</strong>{" "}
          (mobile) and <strong className="font-medium text-slate-300">logo_max</strong>{" "}
          (desktop). Images go to{" "}
          <code className="text-teal-300/90">ark-admin-media/header/logo</code>; paths go to{" "}
          <code className="text-teal-300/90">ark-admin-content/header/logo/header_logo.json</code>.
          Same filename keeps the site URL; after save, rebuild/sync the static site so JSON
          picks up path or <code className="text-teal-300/90">updated_at</code> cache-bust
          changes.
        </p>
      </div>
      <HeaderLogoForm initial={initial} initialPreviews={initialPreviews} />
    </div>
  );
}
