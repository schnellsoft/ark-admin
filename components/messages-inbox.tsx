"use client";

import { useMemo, useState } from "react";
import { DataGrid, type GridColumn } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type MessageRow = {
  id: string;
  type: string;
  from_name: string | null;
  from_email: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function MessagesInbox({ initial }: { initial: MessageRow[] }) {
  const [rows, setRows] = useState(initial);

  const columns = useMemo<GridColumn<MessageRow>[]>(
    () => [
      {
        id: "type",
        header: "Type",
        sortable: true,
        filterValue: (r) => r.type,
        sortValue: (r) => r.type,
        cell: (r) => <Badge>{r.type}</Badge>,
      },
      {
        id: "from",
        header: "From",
        filterValue: (r) => `${r.from_name ?? ""} ${r.from_email ?? ""}`,
        cell: (r) => r.from_name ?? r.from_email ?? "—",
      },
      {
        id: "body",
        header: "Body",
        filterValue: (r) => r.body,
        cell: (r) => <span className="line-clamp-2 max-w-md text-sm">{r.body}</span>,
      },
      {
        id: "status",
        header: "Status",
        filterValue: (r) => (r.read_at ? "read" : "unread"),
        cell: (r) => (r.read_at ? "Read" : "Unread"),
      },
      {
        id: "created",
        header: "When",
        sortable: true,
        filterValue: (r) => r.created_at,
        sortValue: (r) => r.created_at,
        cell: (r) => r.created_at,
      },
      {
        id: "actions",
        header: "",
        cell: (r) =>
          r.read_at ? null : (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await fetch(`/api/messages/${r.id}/read`, { method: "POST" });
                setRows((prev) =>
                  prev.map((m) => (m.id === r.id ? { ...m, read_at: new Date().toISOString() } : m)),
                );
              }}
            >
              Mark read
            </Button>
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
      filterPlaceholder="Filter messages…"
    />
  );
}
