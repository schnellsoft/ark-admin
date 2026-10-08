"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export type SndColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  filterValue?: (row: T) => string;
};

type SndGridProps<T extends { id: string; position: number }> = {
  gridId: string;
  rows: T[];
  columns: SndColumn<T>[];
  onChange: (rows: T[]) => void;
  onSave: (rows: T[]) => Promise<void>;
  renderForm: (args: {
    draft: Partial<T> | null;
    setDraft: (draft: Partial<T> | null) => void;
    onSubmit: () => void;
    mode: "create" | "edit";
  }) => React.ReactNode;
  createEmpty: () => Partial<T>;
  validateDraft?: (draft: Partial<T>) => string | null;
};

function pageSizeKey(gridId: string) {
  return `ark-sndgrid-pagesize:${gridId}`;
}

type TBase = { id: string; position: number };

/** Assign 1..n from current array order (does not re-sort). */
function renumberByOrder(rows: TBase[]): TBase[] {
  return rows.map((row, index) => ({ ...row, position: index + 1 }));
}

/** Sort by position, then assign contiguous 1..n. */
function normalizePositions(rows: TBase[]): TBase[] {
  return renumberByOrder([...rows].sort((a, b) => Number(a.position) - Number(b.position)));
}

export function SndGrid<T extends { id: string; position: number }>({
  gridId,
  rows,
  columns,
  onChange,
  onSave,
  renderForm,
  createEmpty,
  validateDraft,
}: SndGridProps<T>) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fromPos, setFromPos] = useState("");
  const [toPos, setToPos] = useState("");
  const [draft, setDraft] = useState<Partial<T> | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(pageSizeKey(gridId));
    const n = raw ? Number(raw) : 10;
    if (Number.isFinite(n) && n > 0) setPageSize(n);
  }, [gridId]);

  useEffect(() => {
    if (!selectedId) return;
    const selected = rows.find((r) => r.id === selectedId);
    if (selected) setFromPos(String(selected.position));
  }, [selectedId]); // rows intentionally omitted so reposition clear is not overwritten

  function rememberPageSize(n: number) {
    setPageSize(n);
    setPage(1);
    window.localStorage.setItem(pageSizeKey(gridId), String(n));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) => a.position - b.position);
    if (!q) return sorted;
    return sorted.filter((row) =>
      columns.some((col) => String(col.filterValue?.(row) ?? "").toLowerCase().includes(q)),
    );
  }, [columns, query, rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function startCreate() {
    setMode("create");
    setDraft(createEmpty());
  }

  function startEdit(row: T) {
    setMode("edit");
    setDraft({ ...row });
    setSelectedId(row.id);
  }

  function submitDraft() {
    if (!draft) return;
    const error = validateDraft?.(draft);
    if (error) {
      setStatus(error);
      return;
    }
    if (mode === "create") {
      const id = crypto.randomUUID();
      const position = rows.length + 1;
      const next = normalizePositions([
        ...rows,
        { ...(draft as T), id, position },
      ]) as T[];
      onChange(next);
    } else if (draft.id) {
      const next = rows.map((r) => (r.id === draft.id ? ({ ...r, ...draft } as T) : r));
      onChange(normalizePositions(next) as T[]);
    }
    setDraft(null);
    setStatus("");
  }

  function deleteRow(row: T) {
    if (!window.confirm(`${t("grid.delete")} “${row.id}”?`)) return;
    const next = normalizePositions(rows.filter((r) => r.id !== row.id)) as T[];
    onChange(next);
    if (selectedId === row.id) setSelectedId(null);
  }

  function applyReposition() {
    const from = Number.parseInt(fromPos, 10);
    const to = Number.parseInt(toPos, 10);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < 1) {
      setStatus("From/To must be positive integers");
      return;
    }
    if (from === to) {
      setFromPos("");
      setToPos("");
      setStatus("");
      return;
    }
    const ordered = normalizePositions(rows) as T[];
    if (from > ordered.length || to > ordered.length) {
      setStatus("Position out of range");
      return;
    }
    const fromIndex = from - 1;
    const toIndex = to - 1;
    const next = [...ordered];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    // Renumber by array order only — sorting by old positions would undo the move.
    onChange(renumberByOrder(next) as T[]);
    setFromPos("");
    setToPos("");
    setStatus("");
  }

  async function save() {
    setPending(true);
    setStatus(t("grid.saving"));
    try {
      await onSave(normalizePositions(rows) as T[]);
      setStatus(t("grid.saved"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label>{t("grid.reposition")}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-24"
              inputMode="numeric"
              placeholder={t("grid.from")}
              value={fromPos}
              onChange={(e) => setFromPos(e.target.value.replace(/[^\d]/g, ""))}
            />
            <Input
              className="w-24"
              inputMode="numeric"
              placeholder={t("grid.to")}
              value={toPos}
              onChange={(e) => setToPos(e.target.value.replace(/[^\d]/g, ""))}
            />
            <Button type="button" variant="outline" onClick={applyReposition}>
              {t("grid.ok")}
            </Button>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={startCreate}>
            {t("grid.add")}
          </Button>
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? t("grid.saving") : t("grid.save")}
          </Button>
        </div>
      </div>

      {draft ? (
        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          {renderForm({
            draft,
            setDraft,
            onSubmit: submitDraft,
            mode,
          })}
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={submitDraft}>
              {mode === "create" ? t("grid.add") : t("grid.save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              {t("grid.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder={t("grid.search")}
        className="max-w-sm"
      />

      <div className="rounded-xl border border-slate-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              {columns.map((col) => (
                <TableHead key={col.id}>{col.header}</TableHead>
              ))}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(selectedId === row.id && "bg-teal-950/40")}
                  onClick={() => setSelectedId(row.id)}
                >
                  <TableCell>{row.position}</TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.id}>{col.cell(row)}</TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(row);
                        }}
                      >
                        {t("grid.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRow(row);
                        }}
                      >
                        {t("grid.delete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="h-20 text-center text-slate-500">
                  {t("grid.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <span>
            {t("grid.page")} {safePage} {t("grid.of")} {pageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            ›
          </Button>
        </div>
        <label className="flex items-center gap-2">
          <span>{t("grid.perPage")}</span>
          <select
            className="h-8 rounded-md border border-slate-600 bg-slate-900/80 px-2 text-sm"
            value={pageSize}
            onChange={(e) => rememberPageSize(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      {status ? <p className="text-sm text-slate-400">{status}</p> : null}
    </div>
  );
}
