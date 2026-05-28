import { cn } from "./cn";

const SIZES = {
  sm: "h-7 w-7 rounded-md",
  md: "h-9 w-9 rounded-lg",
  lg: "h-11 w-11 rounded-lg",
};

const ICON_SIZES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

/**
 * IconBadge — a square icon container with subtle gradient + accent ring.
 * Use as a leading element on cards, list items, or filter labels.
 */
export function IconBadge({ icon: Icon, color, size = "md", className }) {
  const tint = color || "var(--accent)";

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center border border-border-default",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/[0.06] before:to-transparent",
        SIZES[size] || SIZES.md,
        className,
      )}
      style={{
        background: `linear-gradient(180deg, ${tint}1f 0%, transparent 100%), var(--surface-2)`,
        boxShadow: `inset 0 0 0 1px ${tint}24`,
      }}
    >
      {Icon && <Icon className={cn("relative", ICON_SIZES[size] || ICON_SIZES.md)} style={{ color: tint }} />}
    </span>
  );
}
