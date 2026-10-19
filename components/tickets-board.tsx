"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CrmUser } from "@/lib/crm";
import type { TicketMessageRow, TicketPriority, TicketRow, TicketStatus } from "@/lib/tickets";

type Enriched = TicketRow & {
  patient?: CrmUser | null;
  assignee?: CrmUser | null;
};

type Filter = "all" | "mine" | "urgent" | "due_today";

function syncAppBadge(n: number) {
  const nav = navigator as Navigator & {
    setAppBadge?: (value?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (n > 0 && nav.setAppBadge) void nav.setAppBadge(n);
  else if (nav.clearAppBadge) void nav.clearAppBadge();
}

export function TicketsBoard({
  initial,
  currentUserId,
  doctors,
  ticketUnread,
}: {
  initial: Enriched[];
  currentUserId: string;
  doctors: CrmUser[];
  ticketUnread: number;
}) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState<"staff" | "internal">("staff");
  const [bookAt, setBookAt] = useState("");
  const [bookDoctor, setBookDoctor] = useState(doctors[0]?.id ?? "");
  const [statusMsg, setStatusMsg] = useState("");
  const [enrollUrl, setEnrollUrl] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    subject: "",
    body: "",
    fromName: "",
    fromEmail: "",
    fromPhone: "",
  });

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      new: rows.filter((r) => r.status === "new").length,
      in_progress: rows.filter((r) => r.status === "in_progress").length,
      waiting_on_patient: rows.filter((r) => r.status === "waiting_on_patient").length,
      resolved_today: rows.filter(
        (r) => r.status === "resolved" && r.updated_at.slice(0, 10) === today,
      ).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let list = rows;
    if (filter === "mine") list = list.filter((r) => r.assignee_id === currentUserId);
    if (filter === "urgent") list = list.filter((r) => r.priority === "urgent");
    if (filter === "due_today") list = list.filter((r) => r.due_at?.slice(0, 10) === today);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.subject, r.from_name, r.from_email, r.from_phone, String(r.ticket_number)]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return list;
  }, [rows, filter, query, currentUserId]);

  useEffect(() => {
    syncAppBadge(ticketUnread);
  }, [ticketUnread]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/tickets/${selectedId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { ticket: Enriched; messages: TicketMessageRow[] };
      setMessages(data.messages ?? []);
      if (data.ticket) {
        setRows((prev) => prev.map((r) => (r.id === data.ticket.id ? { ...r, ...data.ticket } : r)));
      }
      await fetch(`/api/tickets/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-read" }),
      });
      const unreadRes = await fetch("/api/tickets/unread-count");
      if (unreadRes.ok) {
        const u = (await unreadRes.json()) as { count: number };
        syncAppBadge(u.count ?? 0);
        window.dispatchEvent(new CustomEvent("ark:ticket-unread", { detail: u.count ?? 0 }));
      }
    })();
  }, [selectedId]);

  async function patchTicket(id: string, patch: Record<string, unknown>) {
    const res = await fetch("/api/tickets/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) return;
    setRows((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...(patch.status ? { status: patch.status as TicketStatus } : {}),
              ...(patch.priority ? { priority: patch.priority as TicketPriority } : {}),
              ...(patch.assigneeId !== undefined
                ? { assignee_id: patch.assigneeId as string | null }
                : {}),
              ...(patch.patientUserId !== undefined
                ? { patient_user_id: patch.patientUserId as string | null }
                : {}),
              ...(patch.appointmentId !== undefined
                ? { appointment_id: patch.appointmentId as string | null }
                : {}),
              updated_at: new Date().toISOString(),
            }
          : t,
      ),
    );
  }

  async function sendNote() {
    if (!selected || !note.trim()) return;
    const res = await fetch("/api/tickets/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: selected.id,
        body: note.trim(),
        kind: noteKind,
        notifyPatient: noteKind === "staff",
      }),
    });
    if (!res.ok) {
      setStatusMsg("Message failed");
      return;
    }
    setNote("");
    setSelectedId(selected.id);
    const detail = await fetch(`/api/tickets/${selected.id}`);
    if (detail.ok) {
      const data = (await detail.json()) as { messages: TicketMessageRow[] };
      setMessages(data.messages ?? []);
    }
  }

  async function registerPatient() {
    if (!selected) return;
    const res = await fetch("/api/tickets/register-patient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: selected.id }),
    });
    const data = (await res.json()) as { userId?: string; error?: string };
    if (!res.ok) {
      setStatusMsg(data.error || "Register failed");
      return;
    }
    await patchTicket(selected.id, { patientUserId: data.userId });
    setStatusMsg("Patient registered");
    const list = await fetch("/api/tickets");
    if (list.ok) {
      const body = (await list.json()) as { tickets: Enriched[] };
      setRows(body.tickets ?? []);
    }
  }

  async function makePushLink() {
    if (!selected?.patient_user_id) {
      setStatusMsg("Register patient first");
      return;
    }
    const res = await fetch("/api/patient/push-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selected.patient_user_id }),
    });
    const data = (await res.json()) as { enrollPath?: string; error?: string };
    if (!res.ok || !data.enrollPath) {
      setStatusMsg(data.error || "Token failed");
      return;
    }
    const url = `${window.location.origin}${data.enrollPath}`;
    setEnrollUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setStatusMsg("Push enroll link copied");
    } catch {
      setStatusMsg("Push enroll link ready");
    }
  }

  async function bookAppointment() {
    if (!selected?.patient_user_id || !bookAt) {
      setStatusMsg("Need registered patient and start time");
      return;
    }
    const startsAt = new Date(bookAt).toISOString();
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: selected.patient_user_id,
        doctorId: bookDoctor || null,
        startsAt,
        subject: selected.subject,
        ticketId: selected.id,
        announceOnTicket: true,
      }),
    });
    const data = (await res.json()) as { id?: string; error?: string };
    if (!res.ok) {
      setStatusMsg(data.error || "Book failed");
      return;
    }
    if (data.id) await patchTicket(selected.id, { appointmentId: data.id, status: "in_progress" });
    setStatusMsg("Appointment booked");
    setSelectedId(selected.id);
  }

  async function createTicket() {
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    if (!res.ok) {
      setStatusMsg("Create failed");
      return;
    }
    const list = await fetch("/api/tickets");
    if (list.ok) {
      const body = (await list.json()) as { tickets: Enriched[] };
      setRows(body.tickets ?? []);
    }
    setNewOpen(false);
    setNewForm({ subject: "", body: "", fromName: "", fromEmail: "", fromPhone: "" });
  }

  function statusDot(status: TicketStatus) {
    const color =
      status === "new"
        ? "bg-rose-500"
        : status === "in_progress"
          ? "bg-teal-500"
          : status === "waiting_on_patient"
            ? "bg-amber-500"
            : "bg-slate-500";
    return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient, phone or ticket #"
          />
        </div>
        <Button type="button" onClick={() => setNewOpen((v) => !v)}>
          + New ticket
        </Button>
      </div>

      {newOpen ? (
        <div className="grid gap-2 rounded-xl border border-slate-700 bg-slate-950/50 p-4 md:grid-cols-2">
          <Input
            placeholder="Subject"
            value={newForm.subject}
            onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })}
          />
          <Input
            placeholder="From name"
            value={newForm.fromName}
            onChange={(e) => setNewForm({ ...newForm, fromName: e.target.value })}
          />
          <Input
            placeholder="From email"
            type="email"
            value={newForm.fromEmail}
            onChange={(e) => setNewForm({ ...newForm, fromEmail: e.target.value })}
          />
          <Input
            placeholder="Phone"
            value={newForm.fromPhone}
            onChange={(e) => setNewForm({ ...newForm, fromPhone: e.target.value })}
          />
          <textarea
            className="min-h-24 rounded-md border border-slate-600 bg-slate-900 p-2 text-sm md:col-span-2"
            placeholder="Message"
            value={newForm.body}
            onChange={(e) => setNewForm({ ...newForm, body: e.target.value })}
          />
          <Button type="button" onClick={() => void createTicket()}>
            Create
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["New", counts.new],
          ["In progress", counts.in_progress],
          ["Waiting on patient", counts.waiting_on_patient],
          ["Resolved today", counts.resolved_today],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="text-2xl font-semibold text-teal-100">{n as number}</div>
            <div className="text-sm text-slate-400">{label as string}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", `All ${rows.length}`],
            ["mine", "Assigned to me"],
            ["urgent", "Urgent"],
            ["due_today", "Due today"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            type="button"
            variant={filter === id ? "default" : "outline"}
            onClick={() => setFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {statusMsg ? <p className="text-sm text-slate-400">{statusMsg}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-slate-400">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Patient & subject</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`cursor-pointer border-t border-slate-800 ${
                    selectedId === r.id ? "border-l-4 border-l-teal-500 bg-teal-950/30" : ""
                  }`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <td className="p-3">{r.ticket_number || "—"}</td>
                  <td className="p-3">
                    <div className="font-medium text-slate-100">
                      {r.patient?.name || r.from_name || "Unknown"}
                    </div>
                    <div className="text-slate-400">{r.subject}</div>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      {statusDot(r.status)}
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge>{r.priority}</Badge>
                  </td>
                  <td className="p-3 whitespace-nowrap">{r.due_at || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          {!selected ? (
            <p className="text-slate-500">Select a ticket</p>
          ) : (
            <>
              <div className="text-xs text-slate-500">
                Ticket #{selected.ticket_number} · {selected.created_at.slice(11, 16) || selected.created_at}
              </div>
              <h2 className="text-xl font-semibold text-teal-100">{selected.subject}</h2>
              <div className="rounded-lg bg-slate-900 p-3 text-sm text-slate-300">
                <div className="font-medium text-white">
                  {selected.patient?.name || selected.from_name}
                </div>
                <div>{selected.from_email}</div>
                <div>{selected.from_phone || selected.patient?.phone || "No phone"}</div>
                <div className="text-xs text-slate-500">Source: {selected.source}</div>
              </div>

              <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg p-2 ${
                      m.kind === "internal"
                        ? "bg-amber-950/40 text-amber-100"
                        : m.kind === "staff"
                          ? "bg-teal-950/40 text-teal-50"
                          : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    <div className="text-[10px] uppercase opacity-70">
                      {m.kind} · {m.author_name || "—"}
                    </div>
                    <div className="whitespace-pre-wrap">{m.body}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2">
                <Label>Assign to me / status</Label>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void patchTicket(selected.id, { assigneeId: currentUserId })}
                  >
                    Assign to me
                  </Button>
                  {(["new", "in_progress", "waiting_on_patient", "resolved"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      onClick={() => void patchTicket(selected.id, { status: s })}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Reply or internal note</Label>
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-600 bg-slate-900 p-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    className="h-9 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
                    value={noteKind}
                    onChange={(e) => setNoteKind(e.target.value as "staff" | "internal")}
                  >
                    <option value="staff">Reply (push patient)</option>
                    <option value="internal">Internal note</option>
                  </select>
                  <Button type="button" size="sm" onClick={() => void sendNote()}>
                    Send
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Book appointment</Label>
                <Input
                  type="datetime-local"
                  value={bookAt}
                  onChange={(e) => setBookAt(e.target.value)}
                />
                <select
                  className="h-9 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm"
                  value={bookDoctor}
                  onChange={(e) => setBookDoctor(e.target.value)}
                >
                  <option value="">No doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Button type="button" onClick={() => void bookAppointment()}>
                  Book appointment
                </Button>
                {selected.from_phone || selected.patient?.phone ? (
                  <Button type="button" variant="outline" asChild>
                    <a href={`tel:${selected.patient?.phone || selected.from_phone}`}>Call patient</a>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" disabled>
                    Call patient
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void patchTicket(selected.id, { status: "resolved" })}
                >
                  Mark as resolved
                </Button>
                {!selected.patient_user_id ? (
                  <Button type="button" variant="secondary" onClick={() => void registerPatient()}>
                    Register as patient
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => void makePushLink()}>
                    Copy patient push link
                  </Button>
                )}
              </div>
              {enrollUrl ? (
                <p className="break-all text-xs text-slate-500">{enrollUrl}</p>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
