"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { SndGrid, type SndColumn } from "@/components/snd-grid";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import type { IconRow } from "@/lib/icons";

export function IconsManager({ initial }: { initial: IconRow[] }) {
  const { t } = useI18n();
  const [rows, setRows] = useState(initial);
  const [nameUnique, setNameUnique] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const columns = useMemo<SndColumn<IconRow>[]>(
    () => [
      {
        id: "name",
        header: t("icons.name"),
        filterValue: (r) => r.name,
        cell: (r) => <span className="font-medium text-teal-200">{r.name}</span>,
      },
      {
        id: "svg",
        header: t("icons.svg"),
        filterValue: (r) => r.svg,
        cell: (r) => (
          <div className="flex max-w-xs items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-slate-800 text-teal-300 [&_svg]:h-5 [&_svg]:w-5"
              dangerouslySetInnerHTML={{ __html: r.svg }}
            />
            <code className="truncate text-[10px] text-slate-500">{r.svg.slice(0, 48)}…</code>
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <SndGrid<IconRow>
      gridId="site-icons"
      rows={rows}
      columns={columns}
      onChange={setRows}
      onSave={async (next) => {
        const res = await fetch("/api/site/icons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ icons: next }),
        });
        const data = (await res.json()) as { icons?: IconRow[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        setRows(data.icons ?? next);
      }}
      createEmpty={() => ({ name: "", svg: "" })}
      validateDraft={(draft) => {
        if (!draft.name?.trim()) return "Name required";
        if (!draft.svg?.trim()) return "SVG required";
        if (nameUnique !== true) return t("icons.uniqueBad");
        return null;
      }}
      renderForm={({ draft, setDraft }) => (
        <IconFormFields
          draft={draft}
          setDraft={setDraft}
          nameUnique={nameUnique}
          setNameUnique={setNameUnique}
          checking={checking}
          setChecking={setChecking}
        />
      )}
    />
  );
}

function IconFormFields({
  draft,
  setDraft,
  nameUnique,
  setNameUnique,
  checking,
  setChecking,
}: {
  draft: Partial<IconRow> | null;
  setDraft: (d: Partial<IconRow> | null) => void;
  nameUnique: boolean | null;
  setNameUnique: (v: boolean | null) => void;
  checking: boolean;
  setChecking: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const name = draft?.name ?? "";
  const excludeId = draft?.id;

  useEffect(() => {
    if (!name.trim()) {
      setNameUnique(null);
      return;
    }
    const handle = window.setTimeout(async () => {
      setChecking(true);
      try {
        const qs = new URLSearchParams({ name: name.trim() });
        if (excludeId) qs.set("excludeId", excludeId);
        const res = await fetch(`/api/site/icons/check-name?${qs}`);
        const data = (await res.json()) as { unique?: boolean };
        setNameUnique(Boolean(data.unique));
      } catch {
        setNameUnique(null);
      } finally {
        setChecking(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [name, excludeId, setChecking, setNameUnique]);

  if (!draft) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{t("icons.name")}</Label>
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="flex-1"
          />
          {checking ? (
            <span className="text-xs text-slate-500">{t("icons.checking")}</span>
          ) : nameUnique === true ? (
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-green-500/40 bg-green-500/10 text-green-500"
              title={t("icons.uniqueOk")}
              aria-label={t("icons.uniqueOk")}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
          ) : nameUnique === false ? (
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-500"
              title={t("icons.uniqueBad")}
              aria-label={t("icons.uniqueBad")}
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-1">
        <Label>{t("icons.svg")}</Label>
        <Textarea
          className="min-h-40 font-mono text-xs"
          value={draft.svg ?? ""}
          onChange={(e) => setDraft({ ...draft, svg: e.target.value })}
        />
      </div>
    </div>
  );
}
