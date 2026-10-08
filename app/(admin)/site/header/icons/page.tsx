import { HeaderIconsManager } from "@/components/header-icons-manager";
import { getHeaderIconSettings, listHeaderIcons } from "@/lib/header-icons";
import { listIcons } from "@/lib/icons";

export default async function HeaderIconsPage() {
  const [icons, settings, libraryIcons] = await Promise.all([
    listHeaderIcons(),
    getHeaderIconSettings(),
    listIcons(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Header · Icons
        </h1>
        <p className="text-slate-400">
          Header icon strip settings and entries. Persisted to dbsite and{" "}
          <code className="text-teal-300/90">ark-admin-content/header/icons/header_icons.json</code>.
        </p>
      </div>
      <HeaderIconsManager
        initialIcons={icons}
        initialSettings={settings}
        libraryIcons={libraryIcons}
      />
    </div>
  );
}
