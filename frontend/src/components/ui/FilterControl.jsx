import { cn } from "./cn";

/**
 * FilterControl — a labeled wrapper for filter inputs (selects, inputs, etc.).
 * Single look across the app: 11px uppercase eyebrow label + control.
 */
export function FilterControl({ label, hint, htmlFor, className, children }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-eyebrow uppercase text-fg-tertiary"
      >
        {label}
      </label>
      {children}
      {hint && <span className="text-[11px] text-fg-quaternary">{hint}</span>}
    </div>
  );
}
