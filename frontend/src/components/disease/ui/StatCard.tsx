import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  trend?: ReactNode;
}) {
  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
          <div className="mt-2 break-words text-2xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
            {value}
          </div>
          {hint ? <p className="mt-1 text-xs text-[var(--text-tertiary)]">{hint}</p> : null}
          {trend ? <div className="mt-2">{trend}</div> : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
