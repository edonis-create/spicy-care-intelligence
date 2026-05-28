export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral" | "info";
}) {
  const map = {
    success: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]",
    neutral: "bg-[var(--surface-3)] text-[var(--text-tertiary)] border-[var(--border-default)]",
    info: "bg-[var(--accent-soft)] text-[var(--accent)] border-[color-mix(in_srgb,var(--accent)_30%,transparent)]",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {label}
    </span>
  );
}
