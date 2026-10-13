"use client";

import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  defaultLayerVariant,
  emptySlideLayer,
  type SlideLayer,
  type LayerVariantSettings,
} from "@/lib/slideshow-shared";

function LayerVariantFields({
  value,
  onChange,
}: {
  value: LayerVariantSettings;
  onChange: (v: LayerVariantSettings) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          className="h-4 w-4 accent-teal-500"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        {t("slideshow.layerEnabled")}
      </label>
      {(["left", "top", "width", "height"] as const).map((k) => (
        <div key={k} className="space-y-1">
          <Label>
            {k} %
          </Label>
          <Input
            type="number"
            step={0.1}
            value={value.rect[k]}
            onChange={(e) =>
              onChange({
                ...value,
                rect: { ...value.rect, [k]: Number(e.target.value) },
              })
            }
          />
        </div>
      ))}
      <div className="space-y-1">
        <Label>{t("slideshow.layerOpacity")}</Label>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={value.opacity}
          onChange={(e) => onChange({ ...value, opacity: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label>{t("slideshow.layerTextColor")}</Label>
        <Input
          value={value.textColor}
          onChange={(e) => onChange({ ...value, textColor: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>{t("slideshow.layerBg")}</Label>
        <Input
          value={value.background.color}
          onChange={(e) =>
            onChange({
              ...value,
              background: { ...value.background, color: e.target.value },
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label>{t("slideshow.layerBgOpacity")}</Label>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={value.background.opacity}
          onChange={(e) =>
            onChange({
              ...value,
              background: { ...value.background, opacity: Number(e.target.value) },
            })
          }
        />
      </div>
    </div>
  );
}

export function SlideLayerEditor({ slideId }: { slideId: string }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"desktop" | "mobile">("desktop");
  const [sourceMode, setSourceMode] = useState(false);
  const [layer, setLayer] = useState<SlideLayer>(emptySlideLayer());
  const [desktopHtml, setDesktopHtml] = useState("");
  const [mobileHtml, setMobileHtml] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      if (tab === "desktop") setDesktopHtml(html);
      else setMobileHtml(html);
    },
  });

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/site/slideshow/${slideId}/layer`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        layer?: SlideLayer | null;
        desktopHtml?: string;
        mobileHtml?: string;
      };
      if (data.layer) setLayer(data.layer);
      setDesktopHtml(data.desktopHtml ?? "");
      setMobileHtml(data.mobileHtml ?? "");
      editor?.commands.setContent(
        tab === "desktop" ? data.desktopHtml ?? "" : data.mobileHtml ?? "",
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId]);

  useEffect(() => {
    if (!editor) return;
    const html = tab === "desktop" ? desktopHtml : mobileHtml;
    if (editor.getHTML() !== html) editor.commands.setContent(html || "<p></p>");
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const sameAsDesktop =
    layer.mobile && "sameAsDesktop" in layer.mobile && layer.mobile.sameAsDesktop;

  async function save() {
    setPending(true);
    setStatus(t("slideshow.saving"));
    try {
      const res = await fetch(`/api/site/slideshow/${slideId}/layer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layer,
          desktopHtml,
          mobileHtml: sameAsDesktop ? null : mobileHtml,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus(data.error ?? t("slideshow.saveFailed"));
        return;
      }
      setStatus(t("slideshow.layerSaved"));
    } catch {
      setStatus(t("slideshow.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  const activeHtml = tab === "desktop" ? desktopHtml : mobileHtml;
  const setActiveHtml = tab === "desktop" ? setDesktopHtml : setMobileHtml;

  return (
    <div className="space-y-4 rounded-xl border border-slate-700 p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("desktop")}
        >
          Desktop
        </Button>
        <Button
          type="button"
          variant={tab === "mobile" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("mobile")}
        >
          Mobile
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSourceMode((v) => !v)}
        >
          {sourceMode ? t("slideshow.visualMode") : t("slideshow.sourceMode")}
        </Button>
      </div>

      {tab === "mobile" ? (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal-500"
            checked={Boolean(sameAsDesktop)}
            onChange={(e) => {
              if (e.target.checked) {
                setLayer({ ...layer, mobile: { sameAsDesktop: true } });
              } else {
                setLayer({
                  ...layer,
                  mobile: { sameAsDesktop: false, ...defaultLayerVariant() },
                });
                setMobileHtml(desktopHtml);
              }
            }}
          />
          {t("slideshow.sameAsDesktop")}
        </label>
      ) : null}

      {tab === "desktop" || !sameAsDesktop ? (
        <>
          <LayerVariantFields
            value={
              tab === "desktop"
                ? layer.desktop
                : layer.mobile && "sameAsDesktop" in layer.mobile && !layer.mobile.sameAsDesktop
                  ? layer.mobile
                  : defaultLayerVariant()
            }
            onChange={(v) => {
              if (tab === "desktop") setLayer({ ...layer, desktop: v });
              else setLayer({ ...layer, mobile: { sameAsDesktop: false, ...v } });
            }}
          />

          <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-2">
            {sourceMode ? (
              <CodeMirror
                value={activeHtml}
                height="220px"
                extensions={[html()]}
                theme="dark"
                onChange={(v) => {
                  setActiveHtml(v);
                  editor?.commands.setContent(v || "<p></p>");
                }}
              />
            ) : (
              <EditorContent
                editor={editor}
                className="prose prose-invert min-h-[180px] max-w-none px-2 py-1 text-sm"
              />
            )}
            <p className="mt-1 text-right text-xs text-slate-500">
              {activeHtml.length} / 20000
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400">{t("slideshow.mobileUsesDesktop")}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => void save()} disabled={pending}>
          {pending ? t("slideshow.saving") : t("slideshow.saveLayer")}
        </Button>
        <p className="text-sm text-slate-400">{status}</p>
      </div>
    </div>
  );
}
