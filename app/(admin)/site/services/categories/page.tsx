import { Suspense } from "react";
import { ServicesManager } from "@/components/services-manager";
import { listIcons } from "@/lib/icons";
import {
  listCategories,
  listRecommended,
  listServices,
  listSubcategories,
} from "@/lib/services";

export default async function ServicesCategoriesPage() {
  const [categories, subcategories, services, recommended, icons] =
    await Promise.all([
      listCategories(),
      listSubcategories(),
      listServices(),
      listRecommended(),
      listIcons(),
    ]);

  return (
    <Suspense fallback={<p className="text-slate-400">…</p>}>
      <ServicesManager
        categories={categories}
        subcategories={subcategories}
        services={services}
        recommended={recommended}
        icons={icons}
      />
    </Suspense>
  );
}
