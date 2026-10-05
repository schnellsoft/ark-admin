import { getDraft } from "@/lib/content";
import { SlideshowEditor } from "@/components/slideshow-editor";
import type { z } from "zod";
import type { slideshowSchema } from "@/lib/schemas";

type Slideshow = z.infer<typeof slideshowSchema>;

export default async function SlideshowPage() {
  const draft = (await getDraft<Slideshow>("slideshow")) ?? { slides: [] };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">Slideshow</h1>
        <p className="text-slate-600">
          Edit UIkit slideshow slides (title, HTML caption, media). Saved as D1 draft JSON.
        </p>
      </div>
      <SlideshowEditor initial={draft} />
    </div>
  );
}
