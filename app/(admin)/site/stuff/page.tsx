import { getDraft } from "@/lib/content";
import { StuffListManager } from "@/components/stuff-list-manager";

export default async function StuffPage() {
  const draft = (await getDraft("stuff")) ?? {
    items: [
      {
        id: "00000000-0000-4000-8000-000000000021",
        position: 1,
        name: { ro: "Dr. Ada", bg: "Д-р Ада", en: "Dr. Ada" },
        role: { ro: "Dentist", bg: "Зъболекар", en: "Dentist" },
        bio: { ro: "", bg: "", en: "" },
      },
    ],
  };

  return <StuffListManager initialDraft={draft} />;
}
