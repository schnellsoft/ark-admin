import { GalleriesGridManager } from "@/components/galleries-grid-manager";
import { getSetting } from "@/lib/content";
import { listGalleries } from "@/lib/galleries";

export default async function GalleriesPage() {
  const [galleries, site] = await Promise.all([
    listGalleries(),
    getSetting<{ domain?: string }>("site"),
  ]);

  return (
    <GalleriesGridManager
      initialGalleries={galleries}
      siteDomain={(site?.domain || "").trim()}
    />
  );
}
