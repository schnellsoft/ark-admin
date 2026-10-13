import { notFound } from "next/navigation";
import { SlideshowSlideEditor } from "@/components/slideshow-slide-editor";
import {
  getLibrarySettings,
  listLibraryCategories,
  listLibraryImages,
} from "@/lib/library";
import { getSlideshowSettings, getSlideshowSlide } from "@/lib/slideshow";

export default async function SlideshowSlidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [slide, settings, librarySettings, libraryAssets, libraryCategories] =
    await Promise.all([
      getSlideshowSlide(id),
      getSlideshowSettings(),
      getLibrarySettings(),
      listLibraryImages(),
      listLibraryCategories(),
    ]);
  if (!slide) notFound();

  return (
    <SlideshowSlideEditor
      id={id}
      initialSlide={slide}
      initialSettings={settings}
      librarySettings={librarySettings}
      libraryAssets={libraryAssets}
      libraryCategories={libraryCategories}
    />
  );
}
