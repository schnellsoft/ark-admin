import { notFound } from "next/navigation";
import { SlideshowSlideEditor } from "@/components/slideshow-slide-editor";
import {
  getLibrarySettings,
  listLibraryCategories,
  listLibraryImages,
} from "@/lib/library";
import { getGallery, getGallerySlide } from "@/lib/galleries";

export default async function GallerySlidePage({
  params,
}: {
  params: Promise<{ id: string; slideId: string }>;
}) {
  const { id, slideId } = await params;
  const [gallery, slide, librarySettings, libraryAssets, libraryCategories] =
    await Promise.all([
      getGallery(id),
      getGallerySlide(id, slideId),
      getLibrarySettings(),
      listLibraryImages(),
      listLibraryCategories(),
    ]);
  if (!gallery || !slide) notFound();

  return (
    <SlideshowSlideEditor
      id={slideId}
      initialSlide={slide}
      initialSettings={gallery.settings}
      librarySettings={librarySettings}
      libraryAssets={libraryAssets}
      libraryCategories={libraryCategories}
      scope={{ kind: "gallery", galleryId: gallery.id }}
    />
  );
}
