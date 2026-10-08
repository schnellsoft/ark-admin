import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/site");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_20%,_#134e4a66,_#0b1220_45%,_#020617)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/90 p-8 shadow-xl backdrop-blur">
        <p className="font-[family-name:var(--font-display)] text-3xl text-teal-300">Ark Admin</p>
        <p className="mt-2 text-sm text-slate-400">Sign in to manage the dental clinic site.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-xs text-slate-500">Default: admin@ark.local / changeme</p>
      </div>
    </main>
  );
}
