import { cn } from "./cn";

/**
 * SegmentedControl — iOS / Linear-style toggle group.
 * `options` = [{ value, label, icon? }]
 * `tone="accent"` — muted red emphasis (same language as sidebar active nav), not a solid pill.
 */
const ACCENT_ACTIVE_SURFACE = {
  background:
    "linear-gradient(180deg, rgba(255,42,42,0.12) 0%, rgba(255,42,42,0.03) 100%)",
  boxShadow:
    "inset 0 0 0 1px rgba(255,42,42,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
};

export function SegmentedControl({
  options,
  value,
  onChange,
  size = "md",
  tone = "neutral",
  className,
}) {
  const heightClass = size === "sm" ? "h-8 text-[12px]" : "h-9 text-[13px]";
  const isAccent = tone === "accent";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border-default bg-surface-1 p-0.5",
        heightClass,
        isAccent && "shadow-[inset_0_0_0_1px_rgba(255,42,42,0.10)]",
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange?.(option.value)}
            className={cn(
              "group relative inline-flex items-center gap-1.5 rounded-[6px] px-3 font-medium transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
              "h-full",
              isAccent &&
                (isActive
                  ? "text-fg-primary"
                  : "text-fg-tertiary hover:bg-white/[0.04] hover:text-fg-primary"),
              !isAccent &&
                (isActive
                  ? "bg-white/[0.06] text-fg-primary shadow-xs"
                  : "text-fg-tertiary hover:text-fg-secondary hover:bg-white/[0.03]"),
            )}
            style={isAccent && isActive ? ACCENT_ACTIVE_SURFACE : undefined}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-colors",
                  isAccent &&
                    (isActive
                      ? "text-accent"
                      : "text-fg-quaternary group-hover:text-accent"),
                )}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
