import { listCrmUsers, listTodayAppointments, listUnsatisfiedAppointments } from "@/lib/crm";
import { AppointmentsManager } from "@/components/appointments-manager";

export default async function AppointmentsPage() {
  const day = new Date().toISOString().slice(0, 10);
  const [today, unsatisfied, patients, doctors] = await Promise.all([
    listTodayAppointments(day),
    listUnsatisfiedAppointments(day),
    listCrmUsers("patient"),
    listCrmUsers("doctor"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Appointments
        </h1>
        <p className="text-slate-400">
          Today queue, unsatisfied (canceled / no-show), and appointments by patient. Doctors are
          operational CRM records (not site Stuff).
        </p>
      </div>
      <AppointmentsManager
        day={day}
        initialToday={today}
        initialUnsatisfied={unsatisfied}
        patients={patients}
        doctors={doctors}
      />
    </div>
  );
}
