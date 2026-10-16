import { ArticlesManager } from "@/components/articles-manager";
import {
  listArticleCategories,
  listArticleSubcategories,
  listArticles,
} from "@/lib/articles";
import {
  listLibraryCategories,
  listLibraryImages,
} from "@/lib/library";

export default async function ArticlesCategoriesPage() {
  const [categories, subcategories, articles, libraryAssets, libraryCategories] =
    await Promise.all([
      listArticleCategories(),
      listArticleSubcategories(),
      listArticles(),
      listLibraryImages(),
      listLibraryCategories(),
    ]);

  return (
    <ArticlesManager
      categories={categories}
      subcategories={subcategories}
      articles={articles}
      libraryAssets={libraryAssets}
      libraryCategories={libraryCategories}
    />
  );
}
