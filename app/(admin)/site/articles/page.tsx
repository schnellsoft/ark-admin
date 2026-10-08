import { getDraft } from "@/lib/content";
import { ArticlesListManager } from "@/components/articles-list-manager";

export default async function ArticlesPage() {
  const draft = (await getDraft("articles")) ?? {
    items: [
      {
        id: "00000000-0000-4000-8000-000000000031",
        position: 1,
        slug: "welcome",
        title: { ro: "Bine ați venit", bg: "Добре дошли", en: "Welcome" },
        html: { ro: "<p>Salut de la Ark.</p>", bg: "<p>Здравейте от Ark.</p>", en: "<p>Hello from Ark.</p>" },
      },
    ],
  };

  return <ArticlesListManager initialDraft={draft} />;
}
