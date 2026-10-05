import { getEnv } from "@/lib/env";
import { GeoPanel } from "@/components/geo-panel";

export default async function GeoPage() {
  const { DB } = getEnv();
  const events = await DB.prepare(
    `SELECT g.id, g.user_id, g.lat, g.lng, g.label, g.created_at, u.name
     FROM geo_events g
     LEFT JOIN users u ON u.id = g.user_id
     ORDER BY g.created_at DESC
     LIMIT 100`,
  ).all<{
    id: string;
    user_id: string | null;
    lat: number;
    lng: number;
    label: string | null;
    created_at: string;
    name: string | null;
  }>();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">Geolocation</h1>
        <p className="text-slate-600">Localize staff/patients (consent-gated browser geolocation).</p>
      </div>
      <GeoPanel initial={events.results ?? []} />
    </div>
  );
}
