import { notFound } from "next/navigation";
import { ArticlePageEditor } from "@/components/article-page-editor";
import { getArticle, getArticlePage } from "@/lib/articles";
import {
  listLibraryCategories,
  listLibraryImages,
} from "@/lib/library";

type Props = { params: Promise<{ id: string }> };

export default async function ArticlePageEditPage({ params }: Props) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();

  const [page, libraryAssets, libraryCategories] = await Promise.all([
    getArticlePage(id),
    listLibraryImages(),
    listLibraryCategories(),
  ]);

  return (
    <ArticlePageEditor
      article={article}
      initialPage={page}
      libraryAssets={libraryAssets}
      libraryCategories={libraryCategories}
    />
  );
}
