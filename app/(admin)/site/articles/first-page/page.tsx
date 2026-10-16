import { ArticlesManager } from "@/components/articles-manager";
import {
  listArticleCategories,
  listArticleFirstPage,
  listArticleSubcategories,
  listArticles,
} from "@/lib/articles";
import { listLibraryCategories, listLibraryImages } from "@/lib/library";

export const dynamic = "force-dynamic";

export default async function ArticlesFirstPagePage() {
  const [
    categories,
    subcategories,
    articles,
    libraryAssets,
    libraryCategories,
    firstPageSlots,
  ] = await Promise.all([
    listArticleCategories(),
    listArticleSubcategories(),
    listArticles(),
    listLibraryImages(),
    listLibraryCategories(),
    listArticleFirstPage(),
  ]);

  return (
    <ArticlesManager
      categories={categories}
      subcategories={subcategories}
      articles={articles}
      libraryAssets={libraryAssets}
      libraryCategories={libraryCategories}
      firstPageSlots={firstPageSlots}
    />
  );
}
