"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CrmUsersGrid } from "@/components/crm-users-grid";
import type { AppointmentRow, CrmUser } from "@/lib/crm";

type Tab = "list" | "patients" | "doctors";

export function AppointmentsManager({
  initialToday,
  initialUnsatisfied,
  patients,
  doctors,
  day,
}: {
  initialToday: AppointmentRow[];
  initialUnsatisfied: AppointmentRow[];
  patients: CrmUser[];
  doctors: CrmUser[];
  day: string;
}) {
  const [tab, setTab] = useState<Tab>("list");
  const [queue, setQueue] = useState<"today" | "unsatisfied">("today");
  const [today, setToday] = useState(initialToday);
  const [unsatisfied, setUnsatisfied] = useState(initialUnsatisfied);
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientAppts, setPatientAppts] = useState<AppointmentRow[]>([]);
  const [status, setStatus] = useState("");

  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q),
    );
  }, [patientQuery, patients]);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientAppts([]);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/appointments?patientId=${selectedPatientId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { appointments: AppointmentRow[] };
      setPatientAppts(data.appointments ?? []);
    })();
  }, [selectedPatientId]);

  async function refreshDay() {
    const [t, u] = await Promise.all([
      fetch(`/api/appointments?view=today&day=${day}`).then((r) => r.json()),
      fetch(`/api/appointments?view=unsatisfied&day=${day}`).then((r) => r.json()),
    ]);
    setToday((t as { appointments: AppointmentRow[] }).appointments ?? []);
    setUnsatisfied((u as { appointments: AppointmentRow[] }).appointments ?? []);
  }

  async function setApptStatus(
    id: string,
    next: AppointmentRow["status"],
    patch?: { startsAt?: string },
  ) {
    setStatus("Saving…");
    const res = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status: next,
        startsAt: patch?.startsAt,
        announceOnTicket: true,
      }),
    });
    if (!res.ok) {
      setStatus("Update failed");
      return;
    }
    setStatus("Saved");
    await refreshDay();
  }

  const list = queue === "today" ? today : unsatisfied;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["list", "Appointments list"],
            ["patients", "Patients"],
            ["doctors", "Doctors"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "list" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={queue === "today" ? "default" : "outline"}
              onClick={() => setQueue("today")}
            >
              Today ({today.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={queue === "unsatisfied" ? "default" : "outline"}
              onClick={() => setQueue("unsatisfied")}
            >
              Unsatisfied ({unsatisfied.length})
            </Button>
            <span className="self-center text-xs text-slate-500">{day}</span>
            {status ? <span className="self-center text-xs text-slate-400">{status}</span> : null}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-slate-400">
                <tr>
                  <th className="p-3">When</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Doctor</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={6}>
                      No appointments in this queue.
                    </td>
                  </tr>
                ) : (
                  list.map((a) => (
                    <tr key={a.id} className="border-t border-slate-800">
                      <td className="p-3 whitespace-nowrap">{a.starts_at}</td>
                      <td className="p-3">{patientMap.get(a.patient_id)?.name ?? a.patient_id}</td>
                      <td className="p-3">
                        {a.doctor_id ? doctorMap.get(a.doctor_id)?.name ?? a.doctor_id : "—"}
                      </td>
                      <td className="p-3">{a.subject || "—"}</td>
                      <td className="p-3">
                        <Badge>{a.status}</Badge>
                      </td>
                      <td className="p-3">
                        {queue === "today" ? (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void setApptStatus(a.id, "completed")}
                            >
                              Done
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const next = window.prompt(
                                  "New start (ISO)",
                                  a.starts_at,
                                );
                                if (!next) return;
                                void setApptStatus(a.id, "postponed", { startsAt: next });
                              }}
                            >
                              Postpone
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void setApptStatus(a.id, "canceled")}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void setApptStatus(a.id, "no_show")}
                            >
                              No-show
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "patients" ? (
        <div className="space-y-3">
          <div>
            <Label>Search patient</Label>
            <Input
              className="max-w-md"
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              placeholder="Name, email, phone…"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <ul className="max-h-[480px] space-y-1 overflow-auto rounded-xl border border-slate-700 p-2">
              {filteredPatients.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selectedPatientId === p.id
                        ? "bg-teal-800/60 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                    onClick={() => setSelectedPatientId(p.id)}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.email}</div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80 text-left text-slate-400">
                  <tr>
                    <th className="p-3">When</th>
                    <th className="p-3">Doctor</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedPatientId ? (
                    <tr>
                      <td className="p-4 text-slate-500" colSpan={4}>
                        Select a patient to see appointments.
                      </td>
                    </tr>
                  ) : patientAppts.length === 0 ? (
                    <tr>
                      <td className="p-4 text-slate-500" colSpan={4}>
                        No appointments.
                      </td>
                    </tr>
                  ) : (
                    patientAppts.map((a) => (
                      <tr key={a.id} className="border-t border-slate-800">
                        <td className="p-3">{a.starts_at}</td>
                        <td className="p-3">
                          {a.doctor_id ? doctorMap.get(a.doctor_id)?.name ?? "—" : "—"}
                        </td>
                        <td className="p-3">{a.subject || "—"}</td>
                        <td className="p-3">
                          <Badge>{a.status}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "doctors" ? (
        <CrmUsersGrid role="doctor" initial={doctors} gridId="crm-doctors" />
      ) : null}
    </div>
  );
}
