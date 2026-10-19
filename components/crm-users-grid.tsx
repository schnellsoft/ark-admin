"use client";

import { useMemo, useRef, useState } from "react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CrmRole, CrmUser } from "@/lib/crm";

type Row = CrmUser;

export function CrmUsersGrid({
  role,
  initial,
  gridId,
}: {
  role: CrmRole;
  initial: Row[];
  gridId: string;
}) {
  const [rows, setRows] = useState(initial);
  const knownIds = useRef(new Set(initial.map((r) => r.id)));

  const columns = useMemo<SndColumn<Row>[]>(
    () => [
      { id: "name", header: "Name", cell: (r) => r.name, filterValue: (r) => r.name },
      { id: "email", header: "Email", cell: (r) => r.email, filterValue: (r) => r.email },
      { id: "phone", header: "Phone", cell: (r) => r.phone || "—", filterValue: (r) => r.phone },
      {
        id: "active",
        header: "Active",
        cell: (r) => (r.active ? "Yes" : "No"),
        filterValue: (r) => (r.active ? "yes" : "no"),
      },
    ],
    [],
  );

  return (
    <SndGrid
      gridId={gridId}
      rows={rows}
      columns={columns}
      onChange={setRows}
      createEmpty={() =>
        ({
          name: "",
          email: "",
          phone: "",
          notes: "",
          active: 1,
          locale: "en",
          role,
          created_at: "",
        }) as Partial<Row>
      }
      validateDraft={(d) => {
        if (!d.name?.trim()) return "Name required";
        if (!d.email?.trim()) return "Email required";
        return null;
      }}
      onSave={async (next) => {
        const nextIds = new Set(next.map((r) => r.id));
        for (const id of knownIds.current) {
          if (!nextIds.has(id)) {
            await fetch(`/api/crm/users?id=${id}`, { method: "DELETE" });
          }
        }
        for (const row of next) {
          if (!knownIds.current.has(row.id)) {
            const res = await fetch("/api/crm/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: row.id,
                role,
                name: row.name,
                email: row.email,
                phone: row.phone || "",
                notes: row.notes || "",
                locale: row.locale || "en",
                active: row.active !== 0,
                position: row.position,
              }),
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string };
              throw new Error(data.error || "Create failed");
            }
          } else {
            const res = await fetch("/api/crm/users", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone,
                notes: row.notes,
                active: row.active !== 0,
                locale: row.locale,
                position: row.position,
              }),
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string };
              throw new Error(data.error || "Update failed");
            }
          }
        }
        await fetch("/api/crm/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, orderedIds: next.map((r) => r.id) }),
        });
        knownIds.current = new Set(next.map((r) => r.id));
        setRows(next);
      }}
      renderForm={({ draft, setDraft }) => (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              value={draft?.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={draft?.email ?? ""}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={draft?.phone ?? ""}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={draft?.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 md:col-span-2">
            <input
              type="checkbox"
              checked={draft?.active !== 0}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked ? 1 : 0 })}
            />
            Active
          </label>
        </div>
      )}
    />
  );
}
