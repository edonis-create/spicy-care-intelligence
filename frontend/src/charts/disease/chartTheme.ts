/** Series colors aligned with Patient Stratification tokens (accent + status/info palette) */
export const chartColors = {
  primary: "#ff2a2a",
  secondary: "#7aa2f7",
  tertiary: "#34d399",
  quaternary: "#f5b45c",
  muted: "#8a8a92",
} as const;

export function chartGridStroke(theme: "light" | "dark"): string {
  return theme === "light" ? "rgba(9,9,11,0.08)" : "rgba(255,255,255,0.06)";
}

export function chartAxisColor(theme: "light" | "dark"): string {
  return theme === "light" ? "#71717a" : "#8a8a92";
}

export function chartTooltipStyle(theme: "light" | "dark") {
  return {
    backgroundColor: theme === "light" ? "#ffffff" : "#131315",
    border: `1px solid ${theme === "light" ? "rgba(9,9,11,0.12)" : "rgba(255,255,255,0.1)"}`,
    borderRadius: 12,
    color: theme === "light" ? "#18181b" : "#e4e4e7",
  };
}

/** Recharts default tooltip rows ignore `contentStyle.color` — set label + item colors explicitly. */
export function chartTooltipProps(theme: "light" | "dark") {
  return {
    contentStyle: chartTooltipStyle(theme),
    labelStyle: {
      color: theme === "light" ? "#18181b" : "#fafafa",
      fontWeight: 600,
      fontSize: 13,
    },
    itemStyle: {
      color: theme === "light" ? "#b91c1c" : "#ff8a8a",
      fontSize: 13,
    },
  };
}
