"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MediaUploader() {
  const [status, setStatus] = useState("");

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("Uploading…");
    const res = await fetch("/api/site/media", { method: "POST", body: data });
    const json = (await res.json()) as { key?: string; error?: string };
    setStatus(res.ok ? `Uploaded ${json.key}` : json.error ?? "Upload failed");
    if (res.ok) form.reset();
  }

  return (
    <form onSubmit={onUpload} className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        <Input id="file" name="file" type="file" accept="image/*,video/*" required />
      </div>
      <Button type="submit">Upload to R2</Button>
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </form>
  );
}
