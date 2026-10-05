"use client";

import { useMemo, useState } from "react";
import { DataGrid, type GridColumn } from "@/components/data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TicketRow = {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "closed";
  from_name: string | null;
  from_email: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export function TicketsBoard({ initial }: { initial: TicketRow[] }) {
  const [rows, setRows] = useState(initial);

  async function setStatus(id: string, status: TicketRow["status"]) {
    const res = await fetch("/api/tickets/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) return;
    setRows((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t)),
    );
  }

  const columns = useMemo<GridColumn<TicketRow>[]>(
    () => [
      {
        id: "subject",
        header: "Subject",
        sortable: true,
        filterValue: (r) => r.subject,
        sortValue: (r) => r.subject,
        cell: (r) => r.subject,
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        filterValue: (r) => r.status,
        sortValue: (r) => r.status,
        cell: (r) => <Badge>{r.status}</Badge>,
      },
      {
        id: "from",
        header: "From",
        filterValue: (r) => `${r.from_name ?? ""} ${r.from_email ?? ""}`,
        cell: (r) => `${r.from_name ?? ""} <${r.from_email ?? ""}>`,
      },
      {
        id: "body",
        header: "Body",
        filterValue: (r) => r.body,
        cell: (r) => <span className="line-clamp-2 max-w-sm">{r.body}</span>,
      },
      {
        id: "updated",
        header: "Updated",
        sortable: true,
        filterValue: (r) => r.updated_at,
        sortValue: (r) => r.updated_at,
        cell: (r) => r.updated_at,
      },
      {
        id: "actions",
        header: "Update",
        cell: (r) => (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "open")}>
              Open
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "in_progress")}>
              Progress
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "closed")}>
              Close
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DataGrid
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      filterPlaceholder="Filter tickets…"
    />
  );
}
