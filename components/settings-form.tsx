"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Settings = {
  site: { domain: string; adminApiUrl: string };
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
      <Tabs defaultValue="site">
        <TabsList>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="locale">Locale</TabsTrigger>
        </TabsList>
        <TabsContent value="site" className="space-y-3">
          <p className="text-sm text-slate-400">
            Static site domain is used for Google Maps HTTP-referrer restrictions and published
            into the site build. Admin API URL is used by the public contact form to create
            tickets.
          </p>
          <div className="space-y-2">
            <Label>Static site domain</Label>
            <Input
              value={form.site.domain}
              onChange={(e) =>
                setForm({ ...form, site: { ...form.site, domain: e.target.value } })
              }
              placeholder="https://arkmed.ro"
            />
          </div>
          <div className="space-y-2">
            <Label>Admin API URL</Label>
            <Input
              value={form.site.adminApiUrl}
              onChange={(e) =>
                setForm({ ...form, site: { ...form.site, adminApiUrl: e.target.value } })
              }
              placeholder="https://admin.arkmed.ro"
            />
          </div>
        </TabsContent>
        <TabsContent value="ai" className="space-y-3">
          <p className="text-sm text-slate-400">
            Defaults to Cloudflare Workers AI translation (
            <code className="text-teal-300/90">@cf/meta/m2m100-1.2b</code>). Replace{" "}
            <code className="text-teal-300/90">ACCOUNT_ID</code> and use a Cloudflare API token
            with Workers AI permissions. Endpoint should be the account root (not{" "}
            <code className="text-teal-300/90">/ai/v1</code>).
          </p>
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <Input
              value={form.ai.endpoint}
              onChange={(e) => setForm({ ...form, ai: { ...form.ai, endpoint: e.target.value } })}
              placeholder="https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID"
            />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              value={form.ai.model}
              onChange={(e) => setForm({ ...form, ai: { ...form.ai, model: e.target.value } })}
              placeholder="@cf/meta/m2m100-1.2b"
            />
          </div>
          <div className="space-y-2">
            <Label>API key</Label>
            <Input
              type="password"
              value={form.ai.apiKey}
              onChange={(e) => setForm({ ...form, ai: { ...form.ai, apiKey: e.target.value } })}
              placeholder="Cloudflare API token"
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
        <span className="text-sm text-slate-400">{status}</span>
      </div>
    </div>
  );
}
