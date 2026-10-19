import Link from "next/link";
import { notFound } from "next/navigation";
import { SlideshowSlideList } from "@/components/slideshow-slide-list";
import {
  getLibrarySettings,
  listLibraryCategories,
  listLibraryImages,
} from "@/lib/library";
import { getGallery, listGallerySlides } from "@/lib/galleries";

export default async function GallerySlidesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    gallery,
    slides,
    librarySettings,
    libraryAssets,
    libraryCategories,
  ] = await Promise.all([
    getGallery(id),
    listGallerySlides(id),
    getLibrarySettings(),
    listLibraryImages(),
    listLibraryCategories(),
  ]);
  if (!gallery) notFound();

  const name =
    gallery.name.ro || gallery.name.en || gallery.name.bg || gallery.slug;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/site/galleries" className="text-teal-300 underline">
            Galleries
          </Link>
          <span>/</span>
          <Link
            href={`/site/galleries/${gallery.id}`}
            className="text-teal-300 underline"
          >
            {name}
          </Link>
          <span>/</span>
          <span className="text-slate-300">Content</span>
        </div>
        <Link
          href={`/site/galleries/${gallery.id}/settings`}
          className="text-teal-300 underline"
        >
          Settings
        </Link>
      </div>
      <SlideshowSlideList
        initialSlides={slides}
        librarySettings={librarySettings}
        libraryAssets={libraryAssets}
        libraryCategories={libraryCategories}
        settings={gallery.settings}
        scope={{ kind: "gallery", galleryId: gallery.id }}
        title={name}
        subtitle="Edit gallery slides (same tools as slideshow)."
      />
    </div>
  );
}
