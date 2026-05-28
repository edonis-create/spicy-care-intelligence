import { cn } from "./cn";

/**
 * SectionCard — primary surface for page sections.
 * Provides a consistent layered surface, optional header, eyebrow, action slot.
 */
export function SectionCard({
  title,
  description,
  eyebrow,
  action,
  className,
  bodyClassName,
  children,
  density = "comfortable",
}) {
  const padding = density === "compact" ? "p-5" : density === "tight" ? "p-4" : "p-6";

  return (
    <section className={cn("surface-1 fade-up", padding, className)}>
      {(title || description || action) && (
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="mb-2 text-eyebrow uppercase text-fg-tertiary">{eyebrow}</p>
            )}
            {title && (
              <h2 className="text-h2 text-fg-primary text-display">{title}</h2>
            )}
            {description && (
              <p className="mt-1.5 max-w-2xl text-caption text-fg-tertiary">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
