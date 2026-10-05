"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Settings = {
  ai: { endpoint: string; model: string; apiKey: string };
  email: { to: string; from: string; resendApiKey: string };
  locale: { default: string; supported: string[] };
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");

  async function save() {
    setStatus("Saving…");
    const res = await fetch("/api/site/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setStatus(res.ok ? "Settings saved" : "Save failed");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="locale">Locale</TabsTrigger>
        </TabsList>
        <TabsContent value="ai" className="space-y-3">
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <Input
              value={form.ai.endpoint}
              onChange={(e) => setForm({ ...form, ai: { ...form.ai, endpoint: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              value={form.ai.model}
              onChange={(e) => setForm({ ...form, ai: { ...form.ai, model: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>API key</Label>
            <Input
              type="password"
              value={form.ai.apiKey}
              onChange={(e) => setForm({ ...form, ai: { ...form.ai, apiKey: e.target.value } })}
            />
          </div>
        </TabsContent>
        <TabsContent value="email" className="space-y-3">
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              value={form.email.to}
              onChange={(e) => setForm({ ...form, email: { ...form.email, to: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Input
              value={form.email.from}
              onChange={(e) => setForm({ ...form, email: { ...form.email, from: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Resend API key</Label>
            <Input
              type="password"
              value={form.email.resendApiKey}
              onChange={(e) =>
                setForm({ ...form, email: { ...form.email, resendApiKey: e.target.value } })
              }
            />
          </div>
        </TabsContent>
        <TabsContent value="locale" className="space-y-3">
          <div className="space-y-2">
            <Label>Default locale</Label>
            <Input
              value={form.locale.default}
              onChange={(e) =>
                setForm({ ...form, locale: { ...form.locale, default: e.target.value } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Supported (comma-separated)</Label>
            <Input
              value={form.locale.supported.join(",")}
              onChange={(e) =>
                setForm({
                  ...form,
                  locale: {
                    ...form.locale,
                    supported: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save}>
          Save settings
        </Button>
        <span className="text-sm text-slate-600">{status}</span>
      </div>
    </div>
  );
}
