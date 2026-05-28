import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "./ui/cn";

/**
 * SortableTable — a clean, dark, minimal-grid data table.
 *
 * Pass `sortBy` / `sortOrder` / `onSort(key)` to enable header-click sorting
 * with chevron affordances. Columns can opt-out with `column.sortable = false`.
 */
export function SortableTable({
  columns,
  rows,
  emptyMessage = "No rows available.",
  sortBy,
  sortOrder = "asc",
  onSort,
  density = "comfortable",
  className,
}) {
  const cellPadY = density === "compact" ? "py-3" : "py-3.5";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border-default bg-surface-2",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead>
            <tr className="bg-white/[0.03]">
              {columns.map((column) => {
                const isSortable = onSort && column.sortable !== false;
                const isActive = isSortable && sortBy === column.key;
                const Chevron =
                  isActive
                    ? sortOrder === "asc"
                      ? ChevronUp
                      : ChevronDown
                    : ChevronsUpDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-left font-semibold uppercase tracking-[0.12em] text-[10.5px]",
                      isActive ? "text-fg-secondary" : "text-fg-tertiary",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                    )}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 transition hover:text-fg-primary",
                          column.align === "right" && "ml-auto",
                          column.align === "center" && "mx-auto",
                        )}
                      >
                        {column.label}
                        <Chevron
                          className={cn(
                            "h-3 w-3 transition",
                            isActive ? "text-accent" : "text-fg-quaternary",
                          )}
                        />
                      </button>
                    ) : (
                      <span>{column.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-12 text-center text-[13px] text-fg-tertiary"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id || JSON.stringify(row)}
                  className={cn(
                    "group transition-colors duration-150",
                    index % 2 === 1 ? "bg-white/[0.02]" : "bg-transparent",
                    "hover:!bg-white/[0.04]",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={`${row.id || "row"}-${column.key}`}
                      className={cn(
                        "px-4 text-fg-secondary",
                        cellPadY,
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.tabular && "tabular",
                      )}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
