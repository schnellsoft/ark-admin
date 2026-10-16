export const LOCATION_CONTENT_KEY = "location/location.json";

export type LocationSettings = {
  latitude: string;
  longitude: string;
  address: string;
  google_maps_key: string;
  building_library_id: string | null;
  building_master_key: string;
  building_webp_key: string | null;
};

export type LocationDocument = {
  latitude: string;
  longitude: string;
  address: string;
  googleMapsKey: string;
  building: {
    libraryId: string | null;
    master: string | null;
    webp: string | null;
  };
  updatedAt: string;
};

export function emptyLocationSettings(): LocationSettings {
  return {
    latitude: "",
    longitude: "",
    address: "",
    google_maps_key: "",
    building_library_id: null,
    building_master_key: "",
    building_webp_key: null,
  };
}

export function validateLocationSettings(
  draft: Partial<LocationSettings>,
): string | null {
  const lat = (draft.latitude ?? "").trim();
  const lng = (draft.longitude ?? "").trim();
  if (lat) {
    const n = Number(lat);
    if (!Number.isFinite(n) || n < -90 || n > 90) {
      return "Latitude must be between -90 and 90";
    }
  }
  if (lng) {
    const n = Number(lng);
    if (!Number.isFinite(n) || n < -180 || n > 180) {
      return "Longitude must be between -180 and 180";
    }
  }
  return null;
}
