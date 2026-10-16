import { Suspense } from "react";
import { StuffManager } from "@/components/stuff-manager";
import {
  getLibrarySettings,
  listLibraryCategories,
  listLibraryImages,
} from "@/lib/library";
import {
  getStuffSpotlightSettings,
  listStuffCategories,
  listStuffMembers,
  listStuffProvidedServices,
  listStuffRoles,
  listStuffSpecialties,
} from "@/lib/stuff";

export const dynamic = "force-dynamic";

export default async function StuffPage() {
  const [
    categories,
    members,
    roles,
    specialties,
    providedServices,
    spotlightSettings,
    librarySettings,
    libraryAssets,
    libraryCategories,
  ] = await Promise.all([
    listStuffCategories(),
    listStuffMembers(),
    listStuffRoles(),
    listStuffSpecialties(),
    listStuffProvidedServices(),
    getStuffSpotlightSettings(),
    getLibrarySettings(),
    listLibraryImages(),
    listLibraryCategories(),
  ]);

  return (
    <Suspense fallback={<p className="text-slate-400">…</p>}>
      <StuffManager
        categories={categories}
        members={members}
        roles={roles}
        specialties={specialties}
        providedServices={providedServices}
        spotlightSettings={spotlightSettings}
        librarySettings={librarySettings}
        libraryAssets={libraryAssets}
        libraryCategories={libraryCategories}
      />
    </Suspense>
  );
}
