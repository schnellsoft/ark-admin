"use client";

import { useState } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

type PublishResult = {
  version?: string;
  error?: string;
  rebuild?: {
    deployHook: "ok" | "skipped" | "failed";
    github: "ok" | "skipped" | "failed";
    detail?: string;
  };
};

export function SaveToCloudButton() {
  const { t } = useI18n();
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onPublish() {
    setPending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/site/publish", { method: "POST" });
      const data = (await res.json()) as PublishResult;
      if (!res.ok) throw new Error(data.error ?? "Publish failed");

      const rebuild = data.rebuild;
      const triggered =
        rebuild?.deployHook === "ok" || rebuild?.github === "ok";
      const failed =
        rebuild?.deployHook === "failed" || rebuild?.github === "failed";

      if (triggered) {
        setStatus(`Published ${data.version} · site rebuild started`);
      } else if (failed) {
        setStatus(
          `Published ${data.version} · rebuild failed${rebuild?.detail ? `: ${rebuild.detail}` : ""}`,
        );
      } else {
        setStatus(`Published ${data.version} · set SITE_DEPLOY_HOOK_URL to auto-rebuild site`);
      }
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
        {pending ? t("grid.saving") : t("app.saveToCloud")}
      </Button>
      {status ? <span className="max-w-[280px] truncate text-xs text-slate-400">{status}</span> : null}
    </div>
  );
}
