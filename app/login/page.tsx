import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/site");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_20%,_#99f6e4,_#f8fafc_45%,_#e2e8f0)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white/90 p-8 shadow-xl backdrop-blur">
        <p className="font-[family-name:var(--font-display)] text-3xl text-teal-900">Ark Admin</p>
        <p className="mt-2 text-sm text-slate-600">Sign in to manage the dental clinic site.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-xs text-slate-500">Default: admin@ark.local / changeme</p>
      </div>
    </main>
  );
}
