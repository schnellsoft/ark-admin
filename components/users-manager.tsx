"use client";

import { useMemo, useState } from "react";
import { DataGrid, type GridColumn } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export function UsersManager({
  initial,
  currentUserId,
}: {
  initial: UserRow[];
  currentUserId: string;
}) {
  const [rows, setRows] = useState(initial);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "patient" as UserRow["role"],
    locale: "en",
    password: "",
  });

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
        id: "created",
        header: "Created",
        sortable: true,
        filterValue: (r) => r.created_at,
        sortValue: (r) => r.created_at,
        cell: (r) => r.created_at,
      },
      {
        id: "actions",
        header: "Actions",
        cell: (r) => (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(r);
                setEditForm({
                  name: r.name,
                  email: r.email,
                  role: r.role,
                  locale: r.locale,
                  password: "",
                });
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={r.id === currentUserId}
              onClick={() => void deleteUser(r)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [currentUserId],
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

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setStatus("Saving…");
    const payload: Record<string, string> = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      locale: editForm.locale,
    };
    if (editForm.password.trim()) payload.password = editForm.password.trim();

    const res = await fetch(`/api/users/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { user?: UserRow; error?: string };
    if (!res.ok || !data.user) {
      setStatus(data.error ?? "Update failed");
      return;
    }
    setRows((prev) => prev.map((u) => (u.id === data.user!.id ? data.user! : u)));
    setEditing(null);
    setStatus("User updated");
  }

  async function deleteUser(row: UserRow) {
    if (row.id === currentUserId) return;
    if (!window.confirm(`Delete account “${row.name}” (${row.email})? Related cleanup can be extended later.`)) {
      return;
    }
    setStatus("Deleting…");
    const res = await fetch(`/api/users/${row.id}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      setStatus(data.error ?? "Delete failed");
      return;
    }
    setRows((prev) => prev.filter((u) => u.id !== row.id));
    if (editing?.id === row.id) setEditing(null);
    setStatus("User deleted");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={createUser}
        className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4 md:grid-cols-5"
      >
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
          <select
            name="role"
            className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-900/80 px-3 text-sm text-slate-100"
          >
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

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveEdit} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-900/80 px-3 text-sm text-slate-100"
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value as UserRow["role"] })
                  }
                >
                  <option value="patient">patient</option>
                  <option value="staff">staff</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Locale</Label>
                <Input
                  value={editForm.locale}
                  onChange={(e) => setEditForm({ ...editForm, locale: e.target.value })}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>New password (leave blank to keep)</Label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit">Save changes</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {status ? <p className="text-sm text-slate-400">{status}</p> : null}
      <DataGrid data={rows} columns={columns} getRowId={(r) => r.id} filterPlaceholder="Filter users…" />
    </div>
  );
}
