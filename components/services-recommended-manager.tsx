"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import type { ServiceRecommended, ServiceRow } from "@/lib/services-shared";

export function ServicesRecommendedManager({
  initialServices,
  initialRecommended,
}: {
  initialServices: ServiceRow[];
  initialRecommended: ServiceRecommended[];
}) {
  const { t, locale } = useI18n();
  const [services] = useState(initialServices);
  const [orderedIds, setOrderedIds] = useState(
    initialRecommended.map((r) => r.service_id),
  );
  const [availableQuery, setAvailableQuery] = useState("");
  const [recommendedQuery, setRecommendedQuery] = useState("");
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedRecommended, setSelectedRecommended] = useState<Set<string>>(
    () => new Set(),
  );
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  const byId = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services],
  );

  const recommendedSet = useMemo(() => new Set(orderedIds), [orderedIds]);

  const available = useMemo(() => {
    const q = availableQuery.trim().toLowerCase();
    return services
      .filter((s) => !recommendedSet.has(s.id))
      .filter((s) => {
        if (!q) return true;
        return `${s.title.ro} ${s.title.en} ${s.title.bg} ${s.slug}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => a.position - b.position);
  }, [availableQuery, recommendedSet, services]);

  const recommended = useMemo(() => {
    const q = recommendedQuery.trim().toLowerCase();
    return orderedIds
      .map((id) => byId.get(id))
      .filter((s): s is ServiceRow => Boolean(s))
      .filter((s) => {
        if (!q) return true;
        return `${s.title.ro} ${s.title.en} ${s.title.bg} ${s.slug}`
          .toLowerCase()
          .includes(q);
      });
  }, [byId, orderedIds, recommendedQuery]);

  function label(s: ServiceRow) {
    return s.title[locale] || s.title.ro || s.title.en || s.slug;
  }

  function addSelected() {
    const next = [...orderedIds];
    for (const id of selectedAvailable) {
      if (!next.includes(id)) next.push(id);
    }
    setOrderedIds(next);
    setSelectedAvailable(new Set());
  }

  function removeSelected() {
    const remove = selectedRecommended;
    setOrderedIds(orderedIds.filter((id) => !remove.has(id)));
    setSelectedRecommended(new Set());
  }

  function move(id: string, dir: -1 | 1) {
    const idx = orderedIds.indexOf(id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrderedIds(next);
  }

  async function save() {
    setPending(true);
    setStatus("");
    try {
      const res = await fetch("/api/site/services/recommended", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds: orderedIds }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || t("grid.saveFailed"));
      setStatus("OK");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  function ListBox({
    title,
    query,
    onQuery,
    items,
    selected,
    setSelected,
    showReorder,
  }: {
    title: string;
    query: string;
    onQuery: (v: string) => void;
    items: ServiceRow[];
    selected: Set<string>;
    setSelected: (s: Set<string>) => void;
    showReorder?: boolean;
  }) {
    return (
      <div className="flex h-[600px] max-h-[600px] flex-1 flex-col rounded-lg border border-slate-700 bg-slate-950/40">
        <div className="border-b border-slate-700 px-3 py-2">
          <div className="mb-2 text-sm font-medium text-teal-200">{title}</div>
          <Input
            placeholder={t("grid.search") || "Search…"}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
          {items.map((s) => {
            const on = selected.has(s.id);
            return (
              <li key={s.id} className="flex items-center gap-1">
                <button
                  type="button"
                  className={`flex-1 rounded px-2 py-1.5 text-left text-sm ${
                    on
                      ? "bg-teal-900/50 text-teal-100"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                  onClick={() => {
                    const next = new Set(selected);
                    if (next.has(s.id)) next.delete(s.id);
                    else next.add(s.id);
                    setSelected(next);
                  }}
                >
                  {label(s)}
                  <span className="ml-2 text-xs text-slate-500">
                    {s.price_text} {s.currency}
                  </span>
                </button>
                {showReorder ? (
                  <span className="flex flex-col">
                    <button
                      type="button"
                      className="p-0.5 text-slate-500 hover:text-slate-200"
                      onClick={() => move(s.id, -1)}
                      aria-label="Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 text-slate-500 hover:text-slate-200"
                      onClick={() => move(s.id, 1)}
                      aria-label="Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
          {!items.length ? (
            <li className="px-2 py-6 text-center text-sm text-slate-500">—</li>
          ) : null}
        </ul>
        <div className="border-t border-slate-700 px-3 py-1.5 text-xs text-slate-500">
          {items.length}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        {t("services.recommendedHelp") ||
          "Select services on the left and add them to Recommended. Order on the right is used by the site card browser."}
      </p>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <ListBox
          title={t("services.available") || "Available"}
          query={availableQuery}
          onQuery={setAvailableQuery}
          items={available}
          selected={selectedAvailable}
          setSelected={setSelectedAvailable}
        />
        <div className="flex flex-row items-center justify-center gap-2 lg:flex-col">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!selectedAvailable.size}
            onClick={addSelected}
            aria-label="Add"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!selectedRecommended.size}
            onClick={removeSelected}
            aria-label="Remove"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <ListBox
          title={t("services.recommended") || "Recommended"}
          query={recommendedQuery}
          onQuery={setRecommendedQuery}
          items={recommended}
          selected={selectedRecommended}
          setSelected={setSelectedRecommended}
          showReorder
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "…" : t("grid.save") || "Save"}
        </Button>
        {status ? <span className="text-xs text-slate-400">{status}</span> : null}
      </div>
    </div>
  );
}
