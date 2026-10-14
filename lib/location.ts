import { getEnv } from "./env";
import {
  LOCATION_CONTENT_KEY,
  emptyLocationSettings,
  validateLocationSettings,
  type LocationDocument,
  type LocationSettings,
} from "./location-shared";

type LocationDb = {
  latitude: string;
  longitude: string;
  google_maps_key: string;
  building_library_id: string | null;
  building_master_key: string;
  building_webp_key: string | null;
};

async function ensureRow() {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO location_settings (id) VALUES (1)`,
  ).run();
}

export async function getLocationSettings(): Promise<LocationSettings> {
  const { SITE_DB } = getEnv();
  await ensureRow();
  const row = await SITE_DB.prepare(
    `SELECT latitude, longitude, google_maps_key, building_library_id,
            building_master_key, building_webp_key
     FROM location_settings WHERE id = 1`,
  ).first<LocationDb>();

  if (!row) return emptyLocationSettings();
  return {
    latitude: row.latitude ?? "",
    longitude: row.longitude ?? "",
    google_maps_key: row.google_maps_key ?? "",
    building_library_id: row.building_library_id,
    building_master_key: row.building_master_key ?? "",
    building_webp_key: row.building_webp_key,
  };
}

export async function saveLocationSettings(
  input: LocationSettings,
): Promise<LocationSettings> {
  const error = validateLocationSettings(input);
  if (error) throw new Error(error);

  const { SITE_DB } = getEnv();
  await ensureRow();

  const next: LocationSettings = {
    latitude: input.latitude.trim(),
    longitude: input.longitude.trim(),
    google_maps_key: input.google_maps_key.trim(),
    building_library_id: input.building_library_id || null,
    building_master_key: input.building_master_key ?? "",
    building_webp_key: input.building_webp_key || null,
  };

  await SITE_DB.prepare(
    `UPDATE location_settings SET
       latitude = ?,
       longitude = ?,
       google_maps_key = ?,
       building_library_id = ?,
       building_master_key = ?,
       building_webp_key = ?,
       updated_at = datetime('now')
     WHERE id = 1`,
  )
    .bind(
      next.latitude,
      next.longitude,
      next.google_maps_key,
      next.building_library_id,
      next.building_master_key,
      next.building_webp_key,
    )
    .run();

  await publishLocation();
  return getLocationSettings();
}

export async function buildLocationDocument(): Promise<LocationDocument> {
  const loc = await getLocationSettings();
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    googleMapsKey: loc.google_maps_key,
    building: {
      libraryId: loc.building_library_id,
      master: loc.building_master_key || null,
      webp: loc.building_webp_key,
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function publishLocation(): Promise<void> {
  const { CONTENT } = getEnv();
  const doc = await buildLocationDocument();
  await CONTENT.put(LOCATION_CONTENT_KEY, JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}
