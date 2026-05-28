import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";

const activeOptionStyle = {
  background:
    "linear-gradient(180deg, rgba(255,42,42,0.12) 0%, rgba(255,42,42,0.03) 100%)",
  boxShadow:
    "inset 0 0 0 1px rgba(255,42,42,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
};

function optionValuesEqual(a, b) {
  return a === b || String(a) === String(b);
}

/**
 * Custom listbox dropdown — same chrome as header year control (dark panel, accent selection).
 * Avoids the native select control so Windows/Edge don’t paint system blue/pink option rows.
 */
export function PremiumDropdown({
  value,
  onChange,
  options,
  disabled = false,
  listAriaLabel = "Select option",
  className,
  triggerClassName,
  /** Chevron color (compact / header mode). */
  chevronClassName,
  /** Full-width field (filters). false = compact trigger (header year). */
  block = true,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const selected = options.find((o) => optionValuesEqual(o.value, value));
  const displayLabel = selected?.label ?? (value != null ? String(value) : "");

  const menuPositionClass = block ? "left-0 right-0" : "right-0 min-w-[100%]";

  return (
    <div ref={wrapRef} className={cn(block ? "relative w-full" : "relative", className)}>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-border-default bg-surface-1 text-left text-[13px] font-semibold text-fg-primary outline-none transition",
          "hover:border-border-strong hover:bg-surface-1-hover",
          "focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]",
          block ? "w-full justify-between px-3" : "min-w-[3.25rem] justify-start pl-1.5 pr-7",
          disabled && "cursor-not-allowed opacity-60",
          triggerClassName,
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn("min-w-0 truncate tabular", !block && "font-semibold")}>{displayLabel}</span>
        {block && (
          <ChevronDown
            className={cn("h-3.5 w-3.5 shrink-0 text-fg-tertiary", chevronClassName)}
            aria-hidden
          />
        )}
      </button>
      {!block && (
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-tertiary",
            chevronClassName,
          )}
          aria-hidden
        />
      )}
      {open && !disabled && (
        <ul
          role="listbox"
          aria-label={listAriaLabel}
          className={cn(
            "absolute top-[calc(100%+6px)] z-[200] max-h-[min(280px,70vh)] overflow-auto rounded-md border border-border-default bg-surface-2 py-1 shadow-md",
            menuPositionClass,
          )}
        >
          {options.map((opt) => {
            const isSelected = optionValuesEqual(opt.value, value);
            return (
              <li key={String(opt.value)} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "relative flex w-full items-center px-3 py-2 text-left text-[13px] font-medium transition-colors",
                    isSelected
                      ? "text-fg-primary"
                      : "text-fg-secondary hover:bg-white/[0.04] hover:text-fg-primary",
                  )}
                  style={isSelected ? activeOptionStyle : undefined}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {isSelected && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_10px_var(--accent-glow)]"
                    />
                  )}
                  <span className="relative pl-1">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
