import { getEnv } from "./env";

export type CrmRole = "patient" | "doctor";

export type CrmUser = {
  id: string;
  email: string;
  name: string;
  role: CrmRole;
  locale: string;
  phone: string;
  notes: string;
  active: number;
  position: number;
  created_at: string;
};

export type AppointmentStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "postponed"
  | "canceled"
  | "no_show";

export type AppointmentRow = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  ticket_id: string | null;
  subject: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listCrmUsers(role: CrmRole): Promise<CrmUser[]> {
  const { DB } = getEnv();
  const rows = await DB.prepare(
    `SELECT id, email, name, role, locale,
            COALESCE(phone, '') AS phone,
            COALESCE(notes, '') AS notes,
            COALESCE(active, 1) AS active,
            COALESCE(position, 1) AS position,
            created_at
     FROM users
     WHERE role = ?
     ORDER BY position ASC, name ASC`,
  )
    .bind(role)
    .all<CrmUser>();
  return rows.results ?? [];
}

export async function getUsersByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map<string, CrmUser>();
  const { DB } = getEnv();
  const placeholders = unique.map(() => "?").join(",");
  const rows = await DB.prepare(
    `SELECT id, email, name, role, locale,
            COALESCE(phone, '') AS phone,
            COALESCE(notes, '') AS notes,
            COALESCE(active, 1) AS active,
            COALESCE(position, 1) AS position,
            created_at
     FROM users WHERE id IN (${placeholders})`,
  )
    .bind(...unique)
    .all<CrmUser>();
  const map = new Map<string, CrmUser>();
  for (const row of rows.results ?? []) map.set(row.id, row);
  return map;
}

export async function nextUserPosition(role: CrmRole) {
  const { DB } = getEnv();
  const row = await DB.prepare(
    `SELECT COALESCE(MAX(position), 0) + 1 AS n FROM users WHERE role = ?`,
  )
    .bind(role)
    .first<{ n: number }>();
  return row?.n ?? 1;
}

function dayBounds(isoDay?: string) {
  const day = isoDay || new Date().toISOString().slice(0, 10);
  return { day, start: `${day}T00:00:00.000Z`, end: `${day}T23:59:59.999Z` };
}

export async function listTodayAppointments(isoDay?: string) {
  const { DB } = getEnv();
  const { start, end } = dayBounds(isoDay);
  const rows = await DB.prepare(
    `SELECT * FROM appointments
     WHERE starts_at >= ? AND starts_at <= ?
       AND status IN ('scheduled', 'in_progress', 'postponed')
     ORDER BY starts_at ASC`,
  )
    .bind(start, end)
    .all<AppointmentRow>();
  return rows.results ?? [];
}

export async function listUnsatisfiedAppointments(isoDay?: string) {
  const { DB } = getEnv();
  const { start, end } = dayBounds(isoDay);
  const rows = await DB.prepare(
    `SELECT * FROM appointments
     WHERE starts_at >= ? AND starts_at <= ?
       AND status IN ('canceled', 'no_show')
     ORDER BY starts_at ASC`,
  )
    .bind(start, end)
    .all<AppointmentRow>();
  return rows.results ?? [];
}

export async function listAppointmentsForPatient(patientId: string) {
  const { DB } = getEnv();
  const rows = await DB.prepare(
    `SELECT * FROM appointments WHERE patient_id = ? ORDER BY starts_at DESC`,
  )
    .bind(patientId)
    .all<AppointmentRow>();
  return rows.results ?? [];
}

export async function createAppointment(input: {
  patientId: string;
  doctorId?: string | null;
  startsAt: string;
  endsAt?: string;
  subject?: string;
  notes?: string;
  ticketId?: string | null;
  createdBy?: string | null;
  status?: AppointmentStatus;
}) {
  const { DB } = getEnv();
  const id = crypto.randomUUID();
  await DB.prepare(
    `INSERT INTO appointments (
       id, patient_id, doctor_id, starts_at, ends_at, status, ticket_id, subject, notes, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.patientId,
      input.doctorId ?? null,
      input.startsAt,
      input.endsAt ?? "",
      input.status ?? "scheduled",
      input.ticketId ?? null,
      input.subject ?? "",
      input.notes ?? "",
      input.createdBy ?? null,
    )
    .run();
  return id;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  patch?: { startsAt?: string; endsAt?: string; notes?: string },
) {
  const { DB } = getEnv();
  await DB.prepare(
    `UPDATE appointments
     SET status = ?,
         starts_at = COALESCE(?, starts_at),
         ends_at = COALESCE(?, ends_at),
         notes = COALESCE(?, notes),
         updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(status, patch?.startsAt ?? null, patch?.endsAt ?? null, patch?.notes ?? null, id)
    .run();
}
