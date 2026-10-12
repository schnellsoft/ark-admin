import { LibraryManager } from "@/components/library-manager";
import {
  getLibrarySettings,
  listLibraryCategories,
  listLibraryImages,
} from "@/lib/library";

export default async function MediaLibraryPage() {
  const [images, categories, settings] = await Promise.all([
    listLibraryImages(),
    listLibraryCategories(),
    getLibrarySettings(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          Media · Library
        </h1>
        <p className="text-slate-400">
          Upload and manage images. Persisted to dbsite,{" "}
          <code className="text-teal-300/90">ark-admin-media/library/</code>, and{" "}
          <code className="text-teal-300/90">ark-admin-content/library/library.json</code>.
        </p>
      </div>
      <LibraryManager
        initialImages={images}
        initialCategories={categories}
        initialSettings={settings}
      />
    </div>
  );
}
