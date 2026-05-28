import { cn } from "./cn";

const TONES = {
  neutral: "bg-white/[0.04] text-fg-secondary border border-border-default",
  accent: "bg-accent-soft text-accent border border-border-accent",
  success: "bg-status-success-soft text-status-success border border-status-success/25",
  warning: "bg-status-warning-soft text-status-warning border border-status-warning/25",
  danger: "bg-status-danger-soft text-status-danger border border-status-danger/25",
  info: "bg-status-info-soft text-status-info border border-status-info/25",
  ghost: "bg-transparent text-fg-tertiary border border-border-subtle",
};

const SIZES = {
  sm: "h-5 px-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase",
  md: "h-6 px-2 text-[11px] font-semibold tracking-[0.06em]",
  lg: "h-7 px-2.5 text-xs font-semibold",
};

export function Chip({
  tone = "neutral",
  size = "md",
  children,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  dotColor,
  className,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full leading-none whitespace-nowrap",
        TONES[tone] || TONES.neutral,
        SIZES[size] || SIZES.md,
        className,
      )}
    >
      {dotColor && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {Leading && <Leading className="h-3 w-3" />}
      {children}
      {Trailing && <Trailing className="h-3 w-3" />}
    </span>
  );
}
