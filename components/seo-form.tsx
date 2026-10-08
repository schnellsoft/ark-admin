"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TranslateControl } from "@/components/translate-control";

type Seo = {
  title: string;
  description: string;
  ogImage: string;
  robots: string;
  canonical: string;
  jsonLd: string;
};

export function SeoForm({ initial }: { initial: Seo }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");

  async function save() {
    setStatus("Saving…");
    const res = await fetch("/api/site/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "seo", payload: form }),
    });
    setStatus(res.ok ? "SEO draft saved" : "Save failed");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <TranslateControl value={form.title} onApply={(t) => setForm({ ...form, title: t })} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <TranslateControl
          value={form.description}
          onApply={(t) => setForm({ ...form, description: t })}
        />
      </div>
      <div className="space-y-2">
        <Label>OG image (R2 key or URL)</Label>
        <Input value={form.ogImage} onChange={(e) => setForm({ ...form, ogImage: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Robots</Label>
        <Input value={form.robots} onChange={(e) => setForm({ ...form, robots: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Canonical</Label>
        <Input
          value={form.canonical}
          onChange={(e) => setForm({ ...form, canonical: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>JSON-LD</Label>
        <Textarea
          className="min-h-40 font-mono text-xs"
          value={form.jsonLd}
          onChange={(e) => setForm({ ...form, jsonLd: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save}>
          Save draft
        </Button>
        <span className="text-sm text-slate-400">{status}</span>
      </div>
    </div>
  );
}
