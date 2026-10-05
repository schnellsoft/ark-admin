"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type GridColumn<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  filterValue?: (row: T) => string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
};

export function DataGrid<T>({
  data,
  columns,
  filterPlaceholder = "Filter…",
  getRowId,
}: {
  data: T[];
  columns: GridColumn<T>[];
  filterPlaceholder?: string;
  getRowId: (row: T) => string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = data;
    if (q) {
      rows = rows.filter((row) =>
        columns.some((col) => {
          const value = col.filterValue?.(row) ?? "";
          return String(value).toLowerCase().includes(q);
        }),
      );
    }
    if (sort) {
      const col = columns.find((c) => c.id === sort.id);
      if (col?.sortValue) {
        rows = [...rows].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av < bv) return sort.dir === "asc" ? -1 : 1;
          if (av > bv) return sort.dir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    return rows;
  }, [columns, data, query, sort]);

  function toggleSort(id: string) {
    setSort((prev) => {
      if (!prev || prev.id !== id) return { id, dir: "asc" };
      if (prev.dir === "asc") return { id, dir: "desc" };
      return null;
    });
  }

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={filterPlaceholder}
        className="max-w-sm"
      />
      <div className="rounded-xl border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={col.sortable ? "cursor-pointer select-none" : undefined}
                  onClick={col.sortable ? () => toggleSort(col.id) : undefined}
                >
                  {col.header}
                  {sort?.id === col.id ? (sort.dir === "asc" ? " ↑" : " ↓") : null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((col) => (
                    <TableCell key={col.id}>{col.cell(row)}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
