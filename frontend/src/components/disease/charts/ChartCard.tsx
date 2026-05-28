import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="surface-panel flex flex-col overflow-hidden">
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-[var(--text-tertiary)]">{subtitle}</p> : null}
      </div>
      <div className="min-h-[280px] flex-1 px-2 pb-2 pt-4 sm:px-4">{children}</div>
      {footer ? (
        <div className="border-t border-[var(--border-subtle)] px-5 py-3 text-xs text-[var(--text-tertiary)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
