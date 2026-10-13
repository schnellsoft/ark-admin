import { SlideshowSlideList } from "@/components/slideshow-slide-list";
import {
  getLibrarySettings,
  listLibraryCategories,
  listLibraryImages,
} from "@/lib/library";
import { getSlideshowSettings, listSlideshowSlides } from "@/lib/slideshow";

export default async function SlideshowPage() {
  const [slides, librarySettings, libraryAssets, libraryCategories, settings] =
    await Promise.all([
      listSlideshowSlides(),
      getLibrarySettings(),
      listLibraryImages(),
      listLibraryCategories(),
      getSlideshowSettings(),
    ]);

  return (
    <SlideshowSlideList
      initialSlides={slides}
      librarySettings={librarySettings}
      libraryAssets={libraryAssets}
      libraryCategories={libraryCategories}
      settings={settings}
    />
  );
}
