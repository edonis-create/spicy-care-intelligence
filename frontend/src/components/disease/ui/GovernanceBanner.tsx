import { AlertTriangle, Info } from "lucide-react";

export function GovernanceBanner({
  title = "Governance note",
  variant = "warning",
  children,
}: {
  title?: string;
  variant?: "warning" | "info";
  children: React.ReactNode;
}) {
  const Icon = variant === "warning" ? AlertTriangle : Info;
  const border =
    variant === "warning"
      ? "border-[color-mix(in_srgb,var(--warning)_18%,transparent)] bg-[color-mix(in_srgb,var(--warning)_6%,transparent)]"
      : "border-[color-mix(in_srgb,var(--info)_18%,transparent)] bg-[color-mix(in_srgb,var(--info)_6%,transparent)]";
  return (
    <div
      className={`flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${border} text-[var(--text-secondary)]`}
      role="note"
    >
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 opacity-90 ${variant === "warning" ? "text-[var(--warning)]" : "text-[var(--info)]"}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-snug text-[var(--text-primary)]">{title}</p>
        <div className="mt-1 text-[13px] font-normal leading-relaxed text-[var(--text-tertiary)]">{children}</div>
      </div>
    </div>
  );
}
