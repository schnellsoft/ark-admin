"use client";

import { useMemo, useState } from "react";
import { DataGrid, type GridColumn } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "patient";
  locale: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export function UsersManager({ initial }: { initial: UserRow[] }) {
  const [rows, setRows] = useState(initial);
  const [status, setStatus] = useState("");

  const columns = useMemo<GridColumn<UserRow>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        filterValue: (r) => r.name,
        sortValue: (r) => r.name,
        cell: (r) => r.name,
      },
      {
        id: "email",
        header: "Email",
        sortable: true,
        filterValue: (r) => r.email,
        sortValue: (r) => r.email,
        cell: (r) => r.email,
      },
      {
        id: "role",
        header: "Role",
        sortable: true,
        filterValue: (r) => r.role,
        sortValue: (r) => r.role,
        cell: (r) => <Badge>{r.role}</Badge>,
      },
      {
        id: "locale",
        header: "Locale",
        filterValue: (r) => r.locale,
        cell: (r) => r.locale,
      },
      {
        id: "geo",
        header: "Geo",
        filterValue: (r) => `${r.lat ?? ""} ${r.lng ?? ""}`,
        cell: (r) =>
          r.lat != null && r.lng != null ? `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}` : "—",
      },
      {
        id: "created",
        header: "Created",
        sortable: true,
        filterValue: (r) => r.created_at,
        sortValue: (r) => r.created_at,
        cell: (r) => r.created_at,
      },
    ],
    [],
  );

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      role: String(form.get("role") ?? "patient"),
      password: String(form.get("password") ?? "") || undefined,
      locale: String(form.get("locale") ?? "en"),
    };
    setStatus("Creating…");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { user?: UserRow; error?: string };
    if (!res.ok || !data.user) {
      setStatus(data.error ?? "Create failed");
      return;
    }
    setRows((prev) => [data.user!, ...prev]);
    setStatus("User created");
    e.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createUser} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-5">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="name" required />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input name="email" type="email" required />
        </div>
        <div className="space-y-1">
          <Label>Role</Label>
          <select name="role" className="flex h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
            <option value="patient">patient</option>
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Password</Label>
          <Input name="password" type="password" placeholder="optional for patients" />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Add user
          </Button>
        </div>
      </form>
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
      <DataGrid data={rows} columns={columns} getRowId={(r) => r.id} filterPlaceholder="Filter users…" />
    </div>
  );
}
