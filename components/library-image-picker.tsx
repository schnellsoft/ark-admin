"use client";

import { SlideshowLibraryPicker } from "@/components/slideshow-library-picker";
import { useI18n } from "@/components/i18n-provider";
import type { LibraryCategory, LibraryImage } from "@/lib/library-shared";

/** Library-only image picker (no upload). Filters to image assets. */
export function LibraryImagePicker({
  open,
  onClose,
  assets,
  categories,
  onSelect,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  assets: LibraryImage[];
  categories: LibraryCategory[];
  onSelect: (asset: LibraryImage) => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const images = assets.filter((a) => a.kind !== "video");
  return (
    <SlideshowLibraryPicker
      open={open}
      onClose={onClose}
      assets={images}
      categories={categories}
      onSelect={onSelect}
      busy={busy}
      title={t("articles.editor.pickImage")}
      hint={t("articles.editor.pickImageHint")}
      confirmLabel={t("articles.editor.insertImage")}
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
