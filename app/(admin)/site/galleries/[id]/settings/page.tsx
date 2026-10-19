import Link from "next/link";
import { notFound } from "next/navigation";
import { SlideshowSettingsForm } from "@/components/slideshow-settings-form";
import { getGallery } from "@/lib/galleries";

export default async function GallerySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gallery = await getGallery(id);
  if (!gallery) notFound();

  const name =
    gallery.name.ro || gallery.name.en || gallery.name.bg || gallery.slug;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
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
        <span className="text-slate-300">Settings</span>
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
        Gallery settings
      </h1>
      <SlideshowSettingsForm
        initial={gallery.settings}
        saveUrl={`/api/site/galleries/${gallery.id}/settings`}
      />
    </div>
  );
}
