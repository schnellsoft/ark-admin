"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import {
  LibraryImagePicker,
  libraryMediaFileUrl,
} from "@/components/library-image-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import type { LibraryCategory, LibraryImage } from "@/lib/library-shared";

/** Minimal editor surface used by setup (avoids SSR import of tinymce). */
type TinyEditor = {
  selection: { getNode: () => Node | null };
  dom: {
    getParent: (node: Node, selector: string) => HTMLElement | null;
    getStyle: (el: Element, name: string) => string;
    setStyle: (el: Element, name: string, value: string) => void;
    encode: (text: string) => string;
  };
  insertContent: (html: string) => void;
  getContent: () => string;
  ui: {
    registry: {
      addMenuItem: (name: string, spec: Record<string, unknown>) => void;
      addButton: (name: string, spec: Record<string, unknown>) => void;
    };
  };
  on: (events: string, cb: () => void) => void;
};

type TinyReactEditor = ComponentType<{
  licenseKey?: string;
  value?: string;
  onEditorChange?: (html: string) => void;
  init?: Record<string, unknown>;
}>;

const BLOCK_SELECTOR =
  "p,h1,h2,h3,h4,h5,h6,div,li,blockquote,td,th,figure,pre,section,article,header,footer,aside,nav";

function nearestBlock(editor: TinyEditor): HTMLElement | null {
  const node = editor.selection.getNode();
  if (!node) return null;
  return editor.dom.getParent(node, BLOCK_SELECTOR);
}

/** Article HTML editor (sndhtmledit): TinyMCE ribbon + library images + DB icons. */
export function SndHtmlEdit({
  value,
  onChange,
  libraryAssets,
  libraryCategories,
  minHeight = 420,
}: {
  value: string;
  onChange: (html: string) => void;
  libraryAssets: LibraryImage[];
  libraryCategories: LibraryCategory[];
  minHeight?: number;
}) {
  const { t } = useI18n();
  const editorRef = useRef<TinyEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [TinyEditorComp, setTinyEditorComp] = useState<TinyReactEditor | null>(
    null,
  );
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [code, setCode] = useState(value);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleries, setGalleries] = useState<
    Array<{
      id: string;
      slug: string;
      name: { ro?: string; en?: string; bg?: string };
      enabled?: boolean;
    }>
  >([]);
  const [galleriesLoading, setGalleriesLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [opacityOpen, setOpacityOpen] = useState(false);
  const [opacityPct, setOpacityPct] = useState(100);
  const [icons, setIcons] = useState<
    Array<{ id: string; name: string; svg: string }>
  >([]);
  const [iconOpen, setIconOpen] = useState(false);
  const openLibraryRef = useRef<() => void>(() => {});
  const openGalleryRef = useRef<() => void>(() => {});
  const openPreviewRef = useRef<() => void>(() => {});
  const openOpacityRef = useRef<() => void>(() => {});
  const openIconsRef = useRef<() => void>(() => {});
  const toggleCodeRef = useRef<() => void>(() => {});

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/site/icons");
        if (!res.ok) return;
        const data = (await res.json()) as {
          icons?: Array<{ id: string; name: string; svg: string }>;
        };
        setIcons(data.icons ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!galleryOpen || galleries.length > 0) return;
    let cancelled = false;
    setGalleriesLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/site/galleries");
        if (!res.ok) return;
        const data = (await res.json()) as {
          galleries?: Array<{
            id: string;
            slug: string;
            name: { ro?: string; en?: string; bg?: string };
            enabled?: boolean;
          }>;
        };
        if (!cancelled) setGalleries(data.galleries ?? []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setGalleriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryOpen, galleries.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await import("@/lib/tinymce-article");
      const mod = await import("@tinymce/tinymce-react");
      if (!cancelled) setTinyEditorComp(() => mod.Editor as TinyReactEditor);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode === "visual") setCode(value);
  }, [value, mode]);

  const emitChange = useCallback((htmlContent: string) => {
    onChangeRef.current(htmlContent);
  }, []);

  openLibraryRef.current = () => {
    setIconOpen(false);
    setGalleryOpen(false);
    setLibraryOpen(true);
  };
  openGalleryRef.current = () => {
    setIconOpen(false);
    setLibraryOpen(false);
    setGalleryOpen(true);
  };
  openIconsRef.current = () => {
    setLibraryOpen(false);
    setGalleryOpen(false);
    setIconOpen((v) => !v);
  };
  openPreviewRef.current = () => {
    const htmlContent =
      mode === "code" ? code : (editorRef.current?.getContent() ?? value);
    setCode(htmlContent);
    setPreviewOpen(true);
  };
  openOpacityRef.current = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const block = nearestBlock(ed);
    if (!block) return;
    const raw = ed.dom.getStyle(block, "opacity");
    const n = raw === "" || raw == null ? 1 : Number.parseFloat(String(raw));
    setOpacityPct(Number.isFinite(n) ? Math.round(n * 100) : 100);
    setOpacityOpen(true);
  };
  toggleCodeRef.current = () => {
    if (mode === "visual") {
      const htmlContent = editorRef.current?.getContent() ?? value;
      setCode(htmlContent);
      emitChange(htmlContent);
      setMode("code");
    } else {
      emitChange(code);
      setMode("visual");
    }
  };

  const insertRawHtml = useCallback(
    (snippet: string) => {
      const ed = editorRef.current;
      if (ed && mode === "visual") {
        ed.insertContent(snippet);
        emitChange(ed.getContent());
      } else {
        setCode((prev) => {
          const next = `${prev}${snippet}`;
          emitChange(next);
          return next;
        });
      }
    },
    [emitChange, mode],
  );

  const insertLibraryMedia = useCallback(
    (asset: LibraryImage) => {
      const ed = editorRef.current;
      const encodedId = ed ? ed.dom.encode(asset.id) : asset.id;
      const encodedAlt = ed
        ? ed.dom.encode(asset.alt || asset.name || "")
        : (asset.alt || asset.name || "").replace(/"/g, "&quot;");

      if (asset.kind === "video") {
        const key = asset.master_key;
        if (!key) return;
        const src = libraryMediaFileUrl(key);
        insertRawHtml(
          `<video src="${src}" data-library-id="${encodedId}" controls playsinline preload="metadata" style="max-width:100%;height:auto;"></video>`,
        );
      } else {
        const key = asset.webp_key || asset.master_key;
        if (!key) return;
        const src = libraryMediaFileUrl(key);
        insertRawHtml(
          `<img src="${src}" alt="${encodedAlt}" data-library-id="${encodedId}" style="max-width:100%;height:auto;" />`,
        );
      }
      setLibraryOpen(false);
    },
    [insertRawHtml],
  );

  const insertGallery = useCallback(
    (gallery: {
      id: string;
      slug: string;
      name: { ro?: string; en?: string; bg?: string };
    }) => {
      const label =
        gallery.name.ro ||
        gallery.name.en ||
        gallery.name.bg ||
        gallery.slug;
      const ed = editorRef.current;
      const encodedId = ed ? ed.dom.encode(gallery.id) : gallery.id;
      const encodedSlug = ed ? ed.dom.encode(gallery.slug) : gallery.slug;
      const encodedLabel = ed ? ed.dom.encode(label) : label.replace(/"/g, "&quot;");
      insertRawHtml(
        `<aside class="ark-article-gallery" data-gallery-id="${encodedId}" data-gallery-slug="${encodedSlug}" data-gallery-name="${encodedLabel}" contenteditable="false"><a href="/gallery/${encodedSlug}/">${encodedLabel}</a></aside>`,
      );
      setGalleryOpen(false);
    },
    [insertRawHtml],
  );

  const insertIcon = useCallback(
    (icon: { id: string; name: string; svg: string }) => {
      const svg = icon.svg.includes("currentColor")
        ? icon.svg
        : icon.svg.replace(/fill="[^"]*"/g, 'fill="currentColor"');
      insertRawHtml(
        `<span class="article-icon" data-icon-id="${icon.id}" aria-hidden="true" style="display:inline-block;vertical-align:middle;line-height:0">${svg}</span>`,
      );
      setIconOpen(false);
    },
    [insertRawHtml],
  );

  const applyOpacity = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const block = nearestBlock(ed);
    if (!block) return;
    const v = Math.min(100, Math.max(0, opacityPct)) / 100;
    if (v >= 0.999) ed.dom.setStyle(block, "opacity", "");
    else ed.dom.setStyle(block, "opacity", String(v));
    emitChange(ed.getContent());
    setOpacityOpen(false);
  }, [emitChange, opacityPct]);

  const init = useMemo(
    () => ({
      license_key: "gpl",
      height: minHeight,
      menubar: "view insert format table tools",
      menu: {
        view: {
          title: "View",
          items: "visualblocks articlepreview",
        },
        insert: {
          title: "Insert",
          items:
            "articleimage articlegallery articleicon link charmap hr anchor insertdatetime nonbreaking",
        },
        format: {
          title: "Format",
          items:
            "bold italic underline strikethrough superscript subscript | styles | removeformat | articleopacity",
        },
        table: {
          title: "Table",
          items: "inserttable | cell row column | tableprops deletetable",
        },
        tools: {
          title: "Tools",
          items: "articlecode",
        },
      },
      toolbar:
        "articlecode removeformat styles | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link articleimage articlegallery articleicon | articleprint articlepreview | forecolor backcolor emoticons",
      plugins:
        "lists advlist link image table visualblocks charmap anchor insertdatetime nonbreaking emoticons",
      branding: false,
      promotion: false,
      statusbar: true,
      resize: true,
      toolbar_mode: "wrap",
      // skin.js / content.js register via Resource.add; skin must match, not false
      skin: "oxide-dark",
      content_css: false,
      // Keep absolute /api/... image URLs intact inside the iframe
      convert_urls: false,
      relative_urls: false,
      remove_script_host: false,
      content_style: `
        body {
          font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          font-size: 16px;
          line-height: 1.55;
          color: #e2e8f0;
          background: #0f172a;
          margin: 1rem;
        }
        img, video { max-width: 100%; height: auto; display: inline-block; }
        .article-icon { display: inline-block; vertical-align: middle; line-height: 0; color: inherit; }
        .article-icon svg { width: 1.25em; height: 1.25em; fill: currentColor; }
        .ark-article-gallery {
          display: block;
          margin: 1rem 0;
          padding: 0.85rem 1rem;
          border: 1px solid #475569;
          border-radius: 0.5rem;
          background: #0b1220;
        }
        .ark-article-gallery a { color: #ffe082; text-decoration: none; font-weight: 600; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #475569; padding: 0.35rem 0.5rem; }
        a { color: #5eead4; }
      `,
      style_formats_merge: true,
      image_advtab: true,
      automatic_uploads: false,
      file_picker_types: "",
      extended_valid_elements:
        "img[src|alt|width|height|style|data-library-id|class],video[src|controls|playsinline|preload|style|data-library-id|class|width|height],aside[class|data-gallery-id|data-gallery-slug|data-gallery-name|contenteditable|style],span[class|style|data-icon-id|aria-hidden],svg[*],path[*],g[*],circle[*],rect[*],line[*],polyline[*],polygon[*],use[*]",
      valid_children: "+body[style],+span[svg],+aside[a]",
      setup(editor: TinyEditor) {
        editorRef.current = editor;

        editor.ui.registry.addMenuItem("articlepreview", {
          text: "Preview",
          icon: "preview",
          onAction: () => openPreviewRef.current(),
        });
        editor.ui.registry.addButton("articlepreview", {
          tooltip: "Preview",
          icon: "preview",
          onAction: () => openPreviewRef.current(),
        });

        editor.ui.registry.addMenuItem("articleimage", {
          text: "Media…",
          icon: "image",
          onAction: () => openLibraryRef.current(),
        });
        editor.ui.registry.addButton("articleimage", {
          tooltip: "Insert image or video",
          icon: "image",
          onAction: () => openLibraryRef.current(),
        });

        editor.ui.registry.addMenuItem("articlegallery", {
          text: "Gallery…",
          icon: "embed",
          onAction: () => openGalleryRef.current(),
        });
        editor.ui.registry.addButton("articlegallery", {
          tooltip: "Insert gallery",
          text: "Gallery",
          onAction: () => openGalleryRef.current(),
        });

        editor.ui.registry.addMenuItem("articleicon", {
          text: "Icon…",
          icon: "emoji",
          onAction: () => openIconsRef.current(),
        });
        editor.ui.registry.addButton("articleicon", {
          tooltip: "Insert icon",
          icon: "emoji",
          onAction: () => openIconsRef.current(),
        });

        editor.ui.registry.addMenuItem("articlecode", {
          text: "Source code",
          icon: "sourcecode",
          onAction: () => toggleCodeRef.current(),
        });
        editor.ui.registry.addButton("articlecode", {
          tooltip: "Source code",
          icon: "sourcecode",
          onAction: () => toggleCodeRef.current(),
        });

        editor.ui.registry.addMenuItem("articleopacity", {
          text: "Block opacity…",
          onAction: () => openOpacityRef.current(),
        });

        editor.ui.registry.addButton("articleprint", {
          tooltip: "Print",
          icon: "print",
          onAction: () => {
            const htmlContent = editor.getContent();
            const w = window.open("", "_blank", "noopener,noreferrer");
            if (!w) return;
            w.document.write(
              `<!doctype html><html><head><title>Print</title></head><body>${htmlContent}</body></html>`,
            );
            w.document.close();
            w.focus();
            w.print();
          },
        });

        editor.on("change input undo redo SetContent", () => {
          emitChange(editor.getContent());
        });
      },
    }),
    [emitChange, minHeight],
  );

  const previewHtml = mode === "code" ? code : value;

  return (
    <div className="article-html-editor snd-html-edit space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span>
          {mode === "visual"
            ? t("articles.editor.modeVisual")
            : t("articles.editor.modeCode")}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => toggleCodeRef.current()}
        >
          {mode === "visual"
            ? t("articles.editor.switchToCode")
            : t("articles.editor.switchToVisual")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openLibraryRef.current()}
        >
          {t("articles.editor.insertMedia") || "Media"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openGalleryRef.current()}
        >
          {t("articles.editor.insertGallery") || "Gallery"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openIconsRef.current()}
        >
          {t("articles.editor.insertIcon")}
        </Button>
      </div>

      {iconOpen ? (
        <div className="max-h-44 overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-3">
          <p className="mb-2 text-xs text-slate-400">
            {t("articles.editor.insertIconHint")}
          </p>
          {icons.length === 0 ? (
            <p className="text-xs text-slate-500">{t("slideshow.noIcons")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {icons.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  title={icon.name}
                  className="grid size-10 place-items-center rounded border border-slate-600 bg-slate-900 text-teal-200 hover:border-teal-500"
                  onClick={() => insertIcon(icon)}
                  dangerouslySetInnerHTML={{ __html: icon.svg }}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {mode === "visual" ? (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
          {TinyEditorComp ? (
            <TinyEditorComp
              licenseKey="gpl"
              value={value}
              onEditorChange={(htmlContent) => emitChange(htmlContent)}
              init={init}
            />
          ) : (
            <p className="p-6 text-sm text-slate-500">
              {t("articles.editor.loading")}
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700">
          <CodeMirror
            value={code}
            height={`${minHeight}px`}
            theme="dark"
            extensions={[html()]}
            onChange={(next) => {
              setCode(next);
              emitChange(next);
            }}
            basicSetup={{ lineNumbers: true, foldGutter: true }}
          />
        </div>
      )}

      <LibraryImagePicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        assets={libraryAssets}
        categories={libraryCategories}
        onSelect={insertLibraryMedia}
        allowVideo
      />

      {galleryOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("articles.editor.insertGallery") || "Insert gallery"}
          onClick={(e) => {
            if (e.target === e.currentTarget) setGalleryOpen(false);
          }}
        >
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 className="text-lg font-medium text-teal-200">
                {t("articles.editor.insertGallery") || "Insert gallery"}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGalleryOpen(false)}
              >
                {t("articles.editor.close")}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {galleriesLoading ? (
                <p className="text-sm text-slate-400">…</p>
              ) : galleries.filter((g) => g.enabled !== false).length === 0 ? (
                <p className="text-sm text-slate-400">
                  {t("articles.editor.noGalleries") || "No galleries yet."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {galleries
                    .filter((g) => g.enabled !== false)
                    .map((g) => {
                      const label =
                        g.name.ro || g.name.en || g.name.bg || g.slug;
                      return (
                        <li key={g.id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 px-3 py-2 text-left hover:border-teal-600 hover:bg-slate-900"
                            onClick={() => insertGallery(g)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-slate-100">
                                {label}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                /gallery/{g.slug}/
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-teal-300">
                              {t("articles.editor.insertMedia") || "Insert"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("articles.editor.preview")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 className="text-lg font-medium text-teal-200">
                {t("articles.editor.preview")}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewOpen(false)}
              >
                {t("articles.editor.close")}
              </Button>
            </div>
            <div
              className="prose prose-invert max-w-none flex-1 overflow-y-auto p-6 text-slate-200"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      ) : null}

      {opacityOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("articles.editor.opacity")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpacityOpen(false);
          }}
        >
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-700 bg-slate-950 p-4 shadow-xl">
            <h2 className="text-lg font-medium text-teal-200">
              {t("articles.editor.opacity")}
            </h2>
            <p className="text-sm text-slate-400">
              {t("articles.editor.opacityHint")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="article-block-opacity">{opacityPct}%</Label>
              <input
                id="article-block-opacity"
                type="range"
                min={0}
                max={100}
                value={opacityPct}
                onChange={(e) => setOpacityPct(Number(e.target.value))}
                className="w-full accent-teal-400"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpacityOpen(false)}
              >
                {t("articles.editor.close")}
              </Button>
              <Button type="button" onClick={applyOpacity}>
                {t("articles.editor.apply")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
