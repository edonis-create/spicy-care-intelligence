import { cn } from "./ui/cn";

export function PlaceholderPanel({ children, className }) {
  return (
    <section
      className={cn(
        "rounded-lg border border-dashed border-border-strong bg-surface-1 p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
