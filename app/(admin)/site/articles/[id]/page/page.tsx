import Link from "next/link";
import { notFound } from "next/navigation";
import { listArticles } from "@/lib/articles";

export default async function ArticlePageEditorStub({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const articles = await listArticles();
  const article = articles.find((a) => a.id === id);
  if (!article) notFound();

  const title =
    article.title.en || article.title.ro || article.title.bg || article.slug;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500">
          <Link href="/site/articles" className="text-teal-300 hover:underline">
            ← Articles
          </Link>
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {title}
        </h1>
        <p className="text-slate-400">
          HTML page editor will be implemented in the next pass.
        </p>
      </div>
    </div>
  );
}
