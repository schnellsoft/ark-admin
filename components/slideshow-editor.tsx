"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emptyLocaleMap, type LocaleMap } from "@/lib/i18n";

type Slide = {
  id: string;
  title: LocaleMap;
  html: LocaleMap;
  mediaKey: string | null;
  mediaType: "image" | "video";
  order: number;
};

function asLocaleMap(value: unknown): LocaleMap {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Partial<LocaleMap>;
    return { ro: v.ro ?? "", bg: v.bg ?? "", en: v.en ?? "" };
  }
  if (typeof value === "string") return emptyLocaleMap(value);
  return emptyLocaleMap();
}

function normalizeSlides(slides: Array<Record<string, unknown>>): Slide[] {
  return slides.map((s, order) => ({
    id: String(s.id ?? crypto.randomUUID()),
    title: asLocaleMap(s.title),
    html: asLocaleMap(s.html),
    mediaKey: (s.mediaKey as string | null) ?? null,
    mediaType: (s.mediaType as "image" | "video") ?? "image",
    order: typeof s.order === "number" ? s.order : order,
  }));
}

export function SlideshowEditor({ initial }: { initial: { slides: Array<Record<string, unknown>> } }) {
  const [slides, setSlides] = useState<Slide[]>(
    normalizeSlides(initial.slides ?? []).sort((a, b) => a.order - b.order),
  );
  const [status, setStatus] = useState("");
  const [activeId, setActiveId] = useState(slides[0]?.id ?? "");

  const active = slides.find((s) => s.id === activeId) ?? slides[0];

  function updateActive(patch: Partial<Slide>) {
    if (!active) return;
    setSlides((prev) => prev.map((s) => (s.id === active.id ? { ...s, ...patch } : s)));
  }

  function addSlide() {
    const slide: Slide = {
      id: crypto.randomUUID(),
      title: emptyLocaleMap("New slide"),
      html: emptyLocaleMap("<p></p>"),
      mediaKey: null,
      mediaType: "image",
      order: slides.length,
    };
    setSlides((prev) => [...prev, slide]);
    setActiveId(slide.id);
  }

  async function save() {
    setStatus("Saving…");
    const res = await fetch("/api/site/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "slideshow",
        payload: { slides: slides.map((s, i) => ({ ...s, order: i })) },
      }),
    });
    setStatus(res.ok ? "Draft saved" : "Save failed");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Slides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {slides.map((slide) => (
            <button
              key={slide.id}
              type="button"
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                slide.id === active?.id ? "bg-teal-700 text-white" : "bg-slate-800"
              }`}
              onClick={() => setActiveId(slide.id)}
            >
              {slide.title.ro || slide.title.en || slide.id}
            </button>
          ))}
          <Button type="button" variant="outline" className="w-full" onClick={addSlide}>
            Add slide
          </Button>
        </CardContent>
      </Card>

      {active ? (
        <div className="space-y-4">
          <MultilingualTextEditor
            label="Title"
            value={active.title}
            onChange={(title) => updateActive({ title })}
          />
          <MultilingualTextEditor
            label="HTML caption"
            multiline
            value={active.html}
            onChange={(html) => updateActive({ html })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Media key (R2)</Label>
              <Input
                value={active.mediaKey ?? ""}
                onChange={(e) => updateActive({ mediaKey: e.target.value || null })}
                placeholder="media/hero.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Media type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-900/80 px-3 text-sm"
                value={active.mediaType}
                onChange={(e) => updateActive({ mediaType: e.target.value as "image" | "video" })}
              >
                <option value="image">image</option>
                <option value="video">video</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={save}>
              Save draft
            </Button>
            <span className="text-sm text-slate-400">{status}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
