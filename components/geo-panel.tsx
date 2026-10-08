"use client";

import { useMemo, useState } from "react";
import { DataGrid, type GridColumn } from "@/components/data-grid";
import { Button } from "@/components/ui/button";

type GeoRow = {
  id: string;
  user_id: string | null;
  lat: number;
  lng: number;
  label: string | null;
  created_at: string;
  name: string | null;
};

export function GeoPanel({ initial }: { initial: GeoRow[] }) {
  const [rows, setRows] = useState(initial);
  const [status, setStatus] = useState("");

  const columns = useMemo<GridColumn<GeoRow>[]>(
    () => [
      {
        id: "name",
        header: "User",
        filterValue: (r) => r.name ?? "Anonymous",
        cell: (r) => r.name ?? "Anonymous",
      },
      {
        id: "lat",
        header: "Lat",
        sortable: true,
        sortValue: (r) => r.lat,
        filterValue: (r) => String(r.lat),
        cell: (r) => r.lat,
      },
      {
        id: "lng",
        header: "Lng",
        sortable: true,
        sortValue: (r) => r.lng,
        filterValue: (r) => String(r.lng),
        cell: (r) => r.lng,
      },
      {
        id: "label",
        header: "Label",
        filterValue: (r) => r.label ?? "",
        cell: (r) => r.label,
      },
      {
        id: "created",
        header: "When",
        sortable: true,
        sortValue: (r) => r.created_at,
        filterValue: (r) => r.created_at,
        cell: (r) => r.created_at,
      },
      {
        id: "map",
        header: "Map",
        cell: (r) => (
          <a
            className="text-teal-700 underline"
            href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=16/${r.lat}/${r.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>
        ),
      },
    ],
    [],
  );

  async function capture() {
    setStatus("Requesting location…");
    if (!navigator.geolocation) {
      setStatus("Geolocation unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const payload = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Admin desk",
        };
        const res = await fetch("/api/geo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { event?: GeoRow; error?: string };
        if (!res.ok || !data.event) {
          setStatus(data.error ?? "Failed");
          return;
        }
        setRows((prev) => [data.event!, ...prev]);
        setStatus("Location saved");
      },
      () => setStatus("Permission denied"),
    );
  }

  return (
    <div className="space-y-4">
      <Button type="button" onClick={capture}>
        Share my location
      </Button>
      {status ? <p className="text-sm text-slate-400">{status}</p> : null}
      <DataGrid
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        filterPlaceholder="Filter locations…"
      />
    </div>
  );
}
