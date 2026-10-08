import { getDraft } from "@/lib/content";
import { SlideshowEditor } from "@/components/slideshow-editor";

export default async function SlideshowPage() {
  const draft = (await getDraft<{ slides: Array<Record<string, unknown>> }>("slideshow")) ?? {
    slides: [],
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">Slideshow</h1>
        <p className="text-slate-400">
          Edit UIkit slideshow slides (title, HTML caption, media). Saved as D1 draft JSON.
        </p>
      </div>
      <SlideshowEditor initial={draft} />
    </div>
  );
}
