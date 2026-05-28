import { cn } from "./ui/cn";

/**
 * Sleek dark-on-dark spinner. `size` is the diameter in Tailwind units (4 = 16px).
 */
export function Spinner({ size = 4, className }) {
  const dim = `${size * 0.25}rem`;
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block animate-spin", className)}
      style={{
        width: dim,
        height: dim,
        borderRadius: "999px",
        borderWidth: "1.5px",
        borderStyle: "solid",
        borderColor: "var(--border-default)",
        borderTopColor: "var(--accent)",
      }}
    />
  );
}
