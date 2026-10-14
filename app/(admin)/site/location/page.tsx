import { LocationManager } from "@/components/location-manager";
import { getLibrarySettings } from "@/lib/library";
import { getLocationSettings } from "@/lib/location";

export default async function LocationPage() {
  const [location, librarySettings] = await Promise.all([
    getLocationSettings(),
    getLibrarySettings(),
  ]);

  return (
    <LocationManager
      initial={location}
      librarySettings={librarySettings}
    />
  );
}
