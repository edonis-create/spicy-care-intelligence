import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortValue?: (row: T) => string | number;
};

export function DataTable<T>({
  columns,
  rows,
  empty,
  filter,
  getRowSearchText,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  filter?: string;
  getRowSearchText?: (row: T) => string;
  rowKey?: (row: T, index: number) => string | number;
}) {
  const q = filter?.trim().toLowerCase() ?? "";
  const filtered =
    q.length === 0
      ? rows
      : rows.filter((row) => {
          const hay = getRowSearchText?.(row);
          if (hay) return hay.toLowerCase().includes(q);
          return true;
        });

  if (filtered.length === 0) {
    return (
      <div className="surface-card overflow-hidden">
        <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">
          {empty ?? "No rows match the current filters."}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--surface-3)]/50 text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`whitespace-nowrap px-4 py-3 font-medium ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((row, idx) => (
              <tr
                key={rowKey?.(row, idx) ?? idx}
                className="hover:bg-[var(--surface-1-hover)]/80"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`whitespace-nowrap px-4 py-3 text-[var(--text-secondary)] ${c.className ?? ""}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
