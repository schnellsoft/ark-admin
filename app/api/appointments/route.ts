import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import {
  createAppointment,
  listAppointmentsForPatient,
  listTodayAppointments,
  listUnsatisfiedAppointments,
  updateAppointmentStatus,
} from "@/lib/crm";
import { appointmentCreateSchema, appointmentUpdateSchema } from "@/lib/schemas";
import { notifyPatient } from "@/lib/push";
import { addTicketMessage, getTicket } from "@/lib/tickets";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "today";
    const day = url.searchParams.get("day") || undefined;
    const patientId = url.searchParams.get("patientId");

    if (patientId) {
      const appointments = await listAppointmentsForPatient(patientId);
      return NextResponse.json({ appointments });
    }
    if (view === "unsatisfied") {
      return NextResponse.json({ appointments: await listUnsatisfiedAppointments(day) });
    }
    return NextResponse.json({ appointments: await listTodayAppointments(day) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = appointmentCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const id = await createAppointment({
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      subject: parsed.data.subject,
      notes: parsed.data.notes,
      ticketId: parsed.data.ticketId,
      createdBy: user.id,
      status: parsed.data.status,
    });

    if (parsed.data.ticketId) {
      const { SITE_DB } = getEnv();
      await SITE_DB.prepare(
        `UPDATE tickets SET appointment_id = ?, updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(id, parsed.data.ticketId)
        .run();

      if (parsed.data.announceOnTicket !== false) {
        const note = `Appointment booked for ${parsed.data.startsAt}${
          parsed.data.subject ? `: ${parsed.data.subject}` : ""
        }`;
        await addTicketMessage({
          ticketId: parsed.data.ticketId,
          kind: "staff",
          body: note,
          authorUserId: user.id,
          authorName: user.name,
        });
        const ticket = await getTicket(parsed.data.ticketId);
        if (ticket?.patient_user_id) {
          await notifyPatient(ticket.patient_user_id, {
            title: "Appointment booked",
            body: note,
            url: "/",
          });
        }
      }
    }

    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const parsed = appointmentUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    await updateAppointmentStatus(parsed.data.id, parsed.data.status, {
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      notes: parsed.data.notes,
    });

    if (parsed.data.announceOnTicket) {
      const { DB } = getEnv();
      const appt = await DB.prepare(`SELECT * FROM appointments WHERE id = ?`)
        .bind(parsed.data.id)
        .first<{ ticket_id: string | null; patient_id: string; starts_at: string; status: string }>();
      if (appt?.ticket_id) {
        const note = `Appointment ${parsed.data.status}${
          parsed.data.startsAt ? ` → ${parsed.data.startsAt}` : ` (${appt.starts_at})`
        }`;
        await addTicketMessage({
          ticketId: appt.ticket_id,
          kind: "staff",
          body: note,
          authorUserId: user.id,
          authorName: user.name,
        });
        await notifyPatient(appt.patient_id, {
          title: "Appointment update",
          body: note,
          url: "/",
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
