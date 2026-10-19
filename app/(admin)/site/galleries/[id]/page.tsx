import { notFound } from "next/navigation";
import { GalleryMetaEditor } from "@/components/gallery-meta-editor";
import { getSetting } from "@/lib/content";
import { getGallery } from "@/lib/galleries";

export default async function GalleryMetaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [gallery, site] = await Promise.all([
    getGallery(id),
    getSetting<{ domain?: string }>("site"),
  ]);
  if (!gallery) notFound();

  return (
    <GalleryMetaEditor
      initial={gallery}
      siteDomain={(site?.domain || "").trim()}
    />
  );
}
