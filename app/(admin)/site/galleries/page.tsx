"use client";

import { useI18n } from "@/components/i18n-provider";

export default function GalleriesPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("section.galleries.title") || "Galleries"}
        </h1>
        <p className="text-slate-400">
          {t("section.galleries.description") ||
            "Manage site image galleries."}
        </p>
      </div>
    </div>
  );
}
