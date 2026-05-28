import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "./ui/Button";
import { cn } from "./ui/cn";

const TONE_CONFIG = {
  error: {
    icon: AlertCircle,
    iconColor: "var(--danger)",
    surface:
      "border-status-danger/30 bg-status-danger-soft/60 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.04)]",
    text: "text-status-danger",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "var(--warning)",
    surface:
      "border-status-warning/30 bg-status-warning-soft/60 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.04)]",
    text: "text-status-warning",
  },
  success: {
    icon: CheckCircle2,
    iconColor: "var(--success)",
    surface:
      "border-status-success/30 bg-status-success-soft/60 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.04)]",
    text: "text-status-success",
  },
  info: {
    icon: Info,
    iconColor: "var(--info)",
    surface:
      "border-status-info/30 bg-status-info-soft/60 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.04)]",
    text: "text-status-info",
  },
};

export function StatusBanner({
  tone = "warning",
  message,
  details = [],
  actionLabel,
  onAction,
}) {
  if (!message) return null;
  const config = TONE_CONFIG[tone] || TONE_CONFIG.warning;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3.5 backdrop-blur-sm fade-up",
        config.surface,
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className="mt-0.5 shrink-0">
        <Icon className="h-4 w-4" style={{ color: config.iconColor }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13.5px] font-semibold leading-5", config.text)}>{message}</p>
        {details.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-fg-tertiary">
            {details.slice(0, 3).map((detail) => (
              <li key={detail} className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-fg-quaternary" />
                <span className="break-words">{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
