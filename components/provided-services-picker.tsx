"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { catalogLabel, type StuffProvidedService } from "@/lib/stuff-shared";
import { cn } from "@/lib/utils";

export function ProvidedServicesPicker({
  services,
  selectedIds,
  onChange,
}: {
  services: StuffProvidedService[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");

  const byId = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services],
  );

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => byId.get(id))
        .filter((s): s is StuffProvidedService => Boolean(s)),
    [byId, selectedIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const enabled = services.filter((s) => s.enabled !== false);
    if (!q) return enabled;
    return enabled.filter((s) => {
      const label = catalogLabel(s, locale).toLowerCase();
      return (
        label.includes(q) ||
        s.name.ro.toLowerCase().includes(q) ||
        s.name.en.toLowerCase().includes(q) ||
        s.name.bg.toLowerCase().includes(q)
      );
    });
  }, [locale, query, services]);

  function toggle(id: string, checked: boolean) {
    if (checked) {
      if (selectedIds.includes(id)) return;
      onChange([...selectedIds, id]);
    } else {
      onChange(selectedIds.filter((x) => x !== id));
    }
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <fieldset className="space-y-2">
      <legend className="px-1 text-sm font-medium text-teal-200">
        {t("stuff.providedServices") || "Provided services"}
      </legend>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-600 bg-slate-950/60 p-2">
          {selected.length ? (
            <div className="flex flex-wrap gap-2">
              {selected.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-500 px-2.5 py-1 text-xs text-slate-100"
                >
                  <span className="truncate">
                    {catalogLabel(s, locale) || "—"}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                    aria-label={t("grid.delete")}
                    onClick={() => remove(s.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="px-1 py-6 text-center text-xs text-slate-500">
              {t("stuff.providedServicesEmpty") || "No services selected"}
            </p>
          )}
        </div>

        <div className="flex max-h-56 flex-col overflow-hidden rounded-lg border border-slate-600 bg-slate-950/60">
          <div className="border-b border-slate-700 p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("stuff.providedServicesSearch") || "Search …"}
              className="h-8"
            />
          </div>
          <ul className="flex-1 overflow-y-auto p-1">
            {filtered.length ? (
              filtered.map((s) => {
                const checked = selectedIds.includes(s.id);
                const label = catalogLabel(s, locale) || "—";
                return (
                  <li key={s.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800/80",
                        checked && "bg-slate-800/50",
                      )}
                    >
                      <span className="truncate">{label}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-teal-400"
                        checked={checked}
                        onChange={(e) => toggle(s.id, e.target.checked)}
                      />
                    </label>
                  </li>
                );
              })
            ) : (
              <li className="px-2 py-6 text-center text-xs text-slate-500">
                {t("grid.noResults") || "No results"}
              </li>
            )}
          </ul>
        </div>
      </div>
    </fieldset>
  );
}
