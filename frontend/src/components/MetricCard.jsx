import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "./ui/cn";
import { IconBadge } from "./ui/IconBadge";

/**
 * MetricCard — premium, layered KPI tile.
 * Accent bar at top + optional icon, label, big tabular value, supporting detail,
 * delta chip, and optional sparkline area.
 */
export function MetricCard({
  label,
  value,
  detail,
  icon,
  accent = "var(--accent)",
  delta, // { value: '+12%', tone: 'up' | 'down' | 'neutral' }
  trend, // optional ReactNode (e.g. sparkline)
  size = "md",
  className,
}) {
  const valueClass = size === "lg" ? "text-metric-xl" : "text-metric-lg";

  return (
    <div className={cn("surface-2 is-interactive group relative flex flex-col gap-4 rounded-lg p-5", className)}>
      <span
        aria-hidden
        className="absolute left-5 right-5 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon && <IconBadge icon={icon} color={accent} size="sm" />}
            <p className="text-eyebrow uppercase text-fg-tertiary">{label}</p>
          </div>
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular",
              delta.tone === "up" && "bg-status-success-soft text-status-success",
              delta.tone === "down" && "bg-status-danger-soft text-status-danger",
              (!delta.tone || delta.tone === "neutral") && "bg-white/[0.04] text-fg-tertiary",
            )}
          >
            {delta.tone === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : delta.tone === "down" ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {delta.value}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className={cn("text-fg-primary text-display tabular leading-none", valueClass)}>{value}</p>
        {trend && <div className="ml-auto h-10 w-28 shrink-0">{trend}</div>}
      </div>

      {detail && <p className="text-[13px] leading-5 text-fg-tertiary">{detail}</p>}
    </div>
  );
}
