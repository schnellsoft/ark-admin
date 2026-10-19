"use client";

import { SlideshowLibraryPicker } from "@/components/slideshow-library-picker";
import { useI18n } from "@/components/i18n-provider";
import type { LibraryCategory, LibraryImage } from "@/lib/library-shared";

/** Library-only media picker (no upload). Images by default; set allowVideo for videos too. */
export function LibraryImagePicker({
  open,
  onClose,
  assets,
  categories,
  onSelect,
  busy,
  allowVideo = false,
}: {
  open: boolean;
  onClose: () => void;
  assets: LibraryImage[];
  categories: LibraryCategory[];
  onSelect: (asset: LibraryImage) => void;
  busy?: boolean;
  allowVideo?: boolean;
}) {
  const { t } = useI18n();
  const filtered = allowVideo
    ? assets
    : assets.filter((a) => a.kind !== "video");
  return (
    <SlideshowLibraryPicker
      open={open}
      onClose={onClose}
      assets={filtered}
      categories={categories}
      onSelect={onSelect}
      busy={busy}
      title={
        allowVideo
          ? t("articles.editor.pickMedia") || "Media from library"
          : t("articles.editor.pickImage")
      }
      hint={
        allowVideo
          ? t("articles.editor.pickMediaHint") ||
            "Search and select an image or video from the library."
          : t("articles.editor.pickImageHint")
      }
      confirmLabel={
        allowVideo
          ? t("articles.editor.insertMedia") || t("articles.editor.insertImage")
          : t("articles.editor.insertImage")
      }
      confirmingLabel={t("articles.editor.insertingImage")}
    />
  );
}

/** Absolute URL so TinyMCE iframe / img tags resolve correctly. */
export function libraryMediaFileUrl(key: string) {
  const path = `/api/site/media/file?key=${encodeURIComponent(key)}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
