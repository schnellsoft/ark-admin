import { getEnv } from "@/lib/env";
import { GeoPanel } from "@/components/geo-panel";

export default async function GeoPage() {
  const { DB, SITE_DB } = getEnv();
  const events = await SITE_DB.prepare(
    `SELECT id, user_id, lat, lng, label, created_at
     FROM geo_events
     ORDER BY created_at DESC
     LIMIT 100`,
  ).all<{
    id: string;
    user_id: string | null;
    lat: number;
    lng: number;
    label: string | null;
    created_at: string;
  }>();

  const users = await DB.prepare(`SELECT id, name FROM users`).all<{ id: string; name: string }>();
  const nameById = new Map((users.results ?? []).map((u) => [u.id, u.name]));

  const rows = (events.results ?? []).map((e) => ({
    ...e,
    name: e.user_id ? (nameById.get(e.user_id) ?? null) : null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">Geolocation</h1>
        <p className="text-slate-400">Localize staff/patients (consent-gated browser geolocation).</p>
      </div>
      <GeoPanel initial={rows} />
    </div>
  );
}
