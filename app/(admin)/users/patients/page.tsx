import { listCrmUsers } from "@/lib/crm";
import { CrmUsersGrid } from "@/components/crm-users-grid";

export default async function PatientsPage() {
  const users = await listCrmUsers("patient");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">Patients</h1>
        <p className="text-slate-400">
          CRM patients in dbusers — a person becomes a patient only when registered here.
        </p>
      </div>
      <CrmUsersGrid role="patient" initial={users} gridId="crm-patients" />
    </div>
  );
}
