import { cn } from "./ui/cn";

export function PageHeader({
  title,
  description,
  showEyebrow = true,
  eyebrow = "Patient Stratification",
  actions,
  meta,
  className,
}) {
  return (
    <header
      className={cn(
        "fade-up mb-6 flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 max-w-3xl">
        {showEyebrow && (
          <p className="mb-2 text-eyebrow uppercase text-accent">{eyebrow}</p>
        )}
        <h1 className="text-h1 text-fg-primary text-display">{title}</h1>
        {description && (
          <p className="mt-2 text-[14.5px] leading-6 text-fg-tertiary">{description}</p>
        )}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center justify-end gap-2 lg:pt-0.5">{actions}</div>
      )}
    </header>
  );
}
