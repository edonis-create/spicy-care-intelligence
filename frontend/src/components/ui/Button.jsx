import { cn } from "./cn";

const VARIANTS = {
  primary:
    "bg-accent text-fg-on-accent hover:bg-accent-hover active:translate-y-px shadow-[0_4px_14px_-2px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.18)]",
  secondary:
    "bg-white/[0.04] text-fg-primary border border-border-default hover:bg-white/[0.07] hover:border-border-strong",
  ghost:
    "text-fg-secondary hover:text-fg-primary hover:bg-white/[0.04]",
  outline:
    "border border-border-default bg-transparent text-fg-secondary hover:text-fg-primary hover:border-border-strong hover:bg-white/[0.03]",
  danger:
    "bg-status-danger-soft text-status-danger border border-status-danger/30 hover:bg-status-danger/20",
};

const SIZES = {
  sm: "h-8 px-3 text-[12px] gap-1.5",
  md: "h-9 px-4 text-[13px] gap-2",
  lg: "h-10 px-5 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className,
      )}
      {...rest}
    >
      {Leading && <Leading className="h-4 w-4" />}
      {children}
      {Trailing && <Trailing className="h-4 w-4" />}
    </button>
  );
}
