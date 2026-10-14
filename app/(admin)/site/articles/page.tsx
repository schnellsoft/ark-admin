import { Suspense } from "react";
import { ArticlesManager } from "@/components/articles-manager";
import {
  listArticleCategories,
  listArticleSubcategories,
  listArticles,
} from "@/lib/articles";

export default async function ArticlesPage() {
  const [categories, subcategories, articles] = await Promise.all([
    listArticleCategories(),
    listArticleSubcategories(),
    listArticles(),
  ]);

  return (
    <Suspense fallback={<p className="text-slate-400">…</p>}>
      <ArticlesManager
        categories={categories}
        subcategories={subcategories}
        articles={articles}
      />
    </Suspense>
  );
}
