"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function PatientPushEnrollInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState("");

  async function enable() {
    try {
      if (!token) {
        setStatus("Missing token");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("Push unsupported on this device");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const keyRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) {
        setStatus("Push not configured");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch("/api/patient/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.toJSON().keys?.p256dh,
            auth: sub.toJSON().keys?.auth,
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Subscribe failed");
      }
      setStatus("Notifications enabled. You can close this page.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6 text-slate-100">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-teal-200">
        Clinic notifications
      </h1>
      <p className="text-sm text-slate-400">
        Enable push notifications to receive appointment updates and messages from the clinic.
      </p>
      <Button type="button" onClick={enable} disabled={!token}>
        Enable notifications
      </Button>
      {status ? <p className="text-sm text-slate-300">{status}</p> : null}
    </main>
  );
}

export default function PatientPushPage() {
  return (
    <Suspense fallback={<main className="p-6 text-slate-300">Loading…</main>}>
      <PatientPushEnrollInner />
    </Suspense>
  );
}
