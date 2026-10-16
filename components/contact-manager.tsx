"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import type { ContactSettings } from "@/lib/contact-shared";

export function ContactManager({ initial }: { initial: ContactSettings }) {
  const { t } = useI18n();
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setStatus("");
    try {
      const res = await fetch("/api/site/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as {
        contact?: ContactSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
      if (data.contact) setForm(data.contact);
      setStatus(t("grid.saved"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("grid.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.contact.title")}
        </h1>
        <p className="text-slate-400">{t("section.contact.description")}</p>
      </div>

      <div className="max-w-xl space-y-4">
        <div className="space-y-1">
          <Label htmlFor="contact-phone">{t("contact.phone")}</Label>
          <Input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+40 …"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="contact-email">{t("contact.email")}</Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            placeholder="contact@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={pending} onClick={() => void save()}>
            {pending ? t("grid.saving") : t("grid.save")}
          </Button>
          {status ? <span className="text-sm text-slate-400">{status}</span> : null}
        </div>
      </div>
    </div>
  );
}
