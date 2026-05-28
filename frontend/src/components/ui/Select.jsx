import { cn } from "./cn";

/**
 * Select — premium themed select that pairs with `FilterControl`.
 * Falls back to a styled native <select>; the chevron, focus ring, and
 * font come from the global form styles in theme.css.
 */
export function Select({
  value,
  onChange,
  children,
  className,
  size = "md",
  disabled,
  ...rest
}) {
  const sizes = {
    sm: "h-8 text-[13px] px-3",
    md: "h-9 text-[13px] px-3",
    lg: "h-10 text-sm px-3.5",
  };

  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        "w-full font-medium",
        sizes[size] || sizes.md,
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
