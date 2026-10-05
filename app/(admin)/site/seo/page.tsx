import { getDraft } from "@/lib/content";
import { SeoForm } from "@/components/seo-form";
import type { z } from "zod";
import type { seoSchema } from "@/lib/schemas";

type Seo = z.infer<typeof seoSchema>;

export default async function SeoPage() {
  const seo = (await getDraft<Seo>("seo")) ?? {
    title: "Ark Dental Clinic",
    description: "",
    ogImage: "",
    robots: "index,follow",
    canonical: "",
    jsonLd: "{}",
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">SEO</h1>
        <p className="text-slate-600">Search and social metadata published with the site content pack.</p>
      </div>
      <SeoForm initial={seo} />
    </div>
  );
}
