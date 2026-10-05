"use client";

import { useState } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SaveToCloudButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onPublish() {
    setPending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/site/publish", { method: "POST" });
      const data = (await res.json()) as { version?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setStatus(`Published ${data.version}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onPublish} disabled={pending}>
        <CloudUpload className="h-4 w-4" />
        {pending ? "Saving…" : "Save to cloud"}
      </Button>
      {status ? <span className="max-w-[180px] truncate text-xs text-slate-600">{status}</span> : null}
    </div>
  );
}
