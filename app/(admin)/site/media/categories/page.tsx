import { LibraryCategoriesManager } from "@/components/library-categories-manager";
import { listLibraryCategories } from "@/lib/library";

export default async function MediaCategoriesPage() {
  const categories = await listLibraryCategories();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Media · Categories
        </h1>
        <p className="text-slate-400">
          Categories for library images. System category{" "}
          <code className="text-teal-300/90">Unspecified</code> cannot be removed.
        </p>
      </div>
      <LibraryCategoriesManager initialCategories={categories} />
    </div>
  );
}
