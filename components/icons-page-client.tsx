"use client";

import { IconsManager } from "@/components/icons-manager";
import { useI18n } from "@/components/i18n-provider";
import type { IconRow } from "@/lib/icons";

export function IconsPageClient({ initial }: { initial: IconRow[] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">
          {t("icons.title")}
        </h1>
        <p className="text-slate-400">{t("icons.description")}</p>
      </div>
      <IconsManager initial={initial} />
    </div>
  );
}
