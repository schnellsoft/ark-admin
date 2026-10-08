import { getDraft } from "@/lib/content";
import { ServicesListManager } from "@/components/services-list-manager";

export default async function ServicesPage() {
  const draft = (await getDraft("services")) ?? {
    items: [
      {
        id: "00000000-0000-4000-8000-000000000011",
        position: 1,
        title: { ro: "Curățare", bg: "Почистване", en: "Cleaning" },
        html: { ro: "<p>Curățare profesională.</p>", bg: "<p>Професионално почистване.</p>", en: "<p>Professional cleaning.</p>" },
      },
    ],
  };

  return <ServicesListManager initialDraft={draft} />;
}
