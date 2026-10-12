import { HeaderMenuManager } from "@/components/header-menu-manager";
import { getHeaderMenuSettings, listHeaderMenuTree } from "@/lib/header-menu";
import { listIcons } from "@/lib/icons";

export default async function HeaderMenuPage() {
  const [settings, menu, libraryIcons] = await Promise.all([
    getHeaderMenuSettings(),
    listHeaderMenuTree(),
    listIcons(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Header · Menu
        </h1>
        <p className="text-slate-400">
          Up to 3 nested levels. Persisted to dbsite and{" "}
          <code className="text-teal-300/90">ark-admin-content/header/menu/header_menu.json</code>.
        </p>
      </div>
      <HeaderMenuManager
        initialSettings={settings}
        initialMenu={menu}
        libraryIcons={libraryIcons}
      />
    </div>
  );
}
