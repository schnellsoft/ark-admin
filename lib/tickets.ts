import { getEnv } from "./env";
import { getUsersByIds } from "./crm";

export type TicketStatus = "new" | "in_progress" | "waiting_on_patient" | "resolved";
export type TicketPriority = "urgent" | "high" | "normal" | "low";
export type TicketMessageKind = "patient" | "staff" | "internal";

export type TicketRow = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: string | null;
  patient_user_id: string | null;
  appointment_id: string | null;
  ticket_number: number;
  from_name: string | null;
  from_email: string | null;
  from_phone: string;
  source: string;
  due_at: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type TicketMessageRow = {
  id: string;
  ticket_id: string;
  author_user_id: string | null;
  author_name: string;
  kind: TicketMessageKind;
  body: string;
  staff_read_at: string | null;
  created_at: string;
};

export async function nextTicketNumber() {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT COALESCE(MAX(ticket_number), 1000) + 1 AS n FROM tickets`,
  ).first<{ n: number }>();
  return row?.n ?? 1001;
}

export async function countTicketUnread() {
  const { SITE_DB } = getEnv();
  const row = await SITE_DB.prepare(
    `SELECT COUNT(*) AS c FROM ticket_messages
     WHERE kind = 'patient' AND staff_read_at IS NULL`,
  ).first<{ c: number }>();
  return row?.c ?? 0;
}

export async function listTickets() {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT id, subject, status, COALESCE(priority, 'normal') AS priority,
            assignee_id, patient_user_id, appointment_id,
            COALESCE(ticket_number, 0) AS ticket_number,
            from_name, from_email, COALESCE(from_phone, '') AS from_phone,
            COALESCE(source, 'website') AS source, due_at, body, created_at, updated_at
     FROM tickets
     ORDER BY updated_at DESC`,
  ).all<TicketRow>();
  return rows.results ?? [];
}

export async function getTicket(id: string) {
  const { SITE_DB } = getEnv();
  return SITE_DB.prepare(
    `SELECT id, subject, status, COALESCE(priority, 'normal') AS priority,
            assignee_id, patient_user_id, appointment_id,
            COALESCE(ticket_number, 0) AS ticket_number,
            from_name, from_email, COALESCE(from_phone, '') AS from_phone,
            COALESCE(source, 'website') AS source, due_at, body, created_at, updated_at
     FROM tickets WHERE id = ?`,
  )
    .bind(id)
    .first<TicketRow>();
}

export async function listTicketMessages(ticketId: string) {
  const { SITE_DB } = getEnv();
  const rows = await SITE_DB.prepare(
    `SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
  )
    .bind(ticketId)
    .all<TicketMessageRow>();
  return rows.results ?? [];
}

export async function markTicketMessagesRead(ticketId: string) {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(
    `UPDATE ticket_messages
     SET staff_read_at = datetime('now')
     WHERE ticket_id = ? AND kind = 'patient' AND staff_read_at IS NULL`,
  )
    .bind(ticketId)
    .run();
}

export async function addTicketMessage(input: {
  ticketId: string;
  kind: TicketMessageKind;
  body: string;
  authorUserId?: string | null;
  authorName?: string;
  staffReadAt?: string | null;
}) {
  const { SITE_DB } = getEnv();
  const id = crypto.randomUUID();
  const staffReadAt =
    input.staffReadAt !== undefined
      ? input.staffReadAt
      : input.kind === "patient"
        ? null
        : new Date().toISOString();
  await SITE_DB.prepare(
    `INSERT INTO ticket_messages (id, ticket_id, author_user_id, author_name, kind, body, staff_read_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.ticketId,
      input.authorUserId ?? null,
      input.authorName ?? "",
      input.kind,
      input.body,
      staffReadAt,
    )
    .run();
  await SITE_DB.prepare(
    `UPDATE tickets SET updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(input.ticketId)
    .run();
  return id;
}

export async function enrichTicketsWithCrm(tickets: TicketRow[]) {
  const ids = [
    ...tickets.map((t) => t.patient_user_id),
    ...tickets.map((t) => t.assignee_id),
  ].filter((x): x is string => Boolean(x));
  const users = await getUsersByIds(ids);
  return tickets.map((t) => ({
    ...t,
    patient: t.patient_user_id ? users.get(t.patient_user_id) ?? null : null,
    assignee: t.assignee_id ? users.get(t.assignee_id) ?? null : null,
  }));
}
