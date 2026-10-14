import { Suspense } from "react";
import { StuffManager } from "@/components/stuff-manager";
import { getLibrarySettings } from "@/lib/library";
import {
  listStuffCategories,
  listStuffMembers,
  listStuffSubcategories,
} from "@/lib/stuff";

export default async function StuffPage() {
  const [categories, subcategories, members, librarySettings] =
    await Promise.all([
      listStuffCategories(),
      listStuffSubcategories(),
      listStuffMembers(),
      getLibrarySettings(),
    ]);

  return (
    <Suspense fallback={<p className="text-slate-400">…</p>}>
      <StuffManager
        categories={categories}
        subcategories={subcategories}
        members={members}
        librarySettings={librarySettings}
      />
    </Suspense>
  );
}
