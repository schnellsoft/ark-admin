import { FooterManager } from "@/components/footer-manager";
import { listFooterIcons } from "@/lib/footer";
import { listIcons } from "@/lib/icons";

export default async function FooterPage() {
  const [icons, libraryIcons] = await Promise.all([listFooterIcons(), listIcons()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Footer
        </h1>
        <p className="text-slate-400">
          Footer icon strip. Icons are chosen from Site/Icons (dbsite). Persisted to{" "}
          <code className="text-teal-300/90">ark-admin-content/footer/footer.json</code>.
          Opening hours come from Site/Schedule.
        </p>
      </div>
      <FooterManager initialIcons={icons} libraryIcons={libraryIcons} />
    </div>
  );
}
