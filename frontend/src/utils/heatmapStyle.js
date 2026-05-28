/**
 * Shared heatmap visuals — aligns with theme accent (--accent #ff2a2a) and a
 * slightly non-linear ramp so mid/high values read more distinctly.
 */

const ACCENT = { r: 255, g: 42, b: 42 };
/** Slightly deeper red at gradient end (still on-brand). */
const ACCENT_DEEP = { r: 232, g: 28, b: 36 };

/** Horizontal scale bar under heatmaps (matches cell ramp). */
export const HEATMAP_LEGEND_GRADIENT =
  "linear-gradient(90deg, rgba(255,42,42,0.07), rgba(255,42,42,0.38) 42%, rgba(255,42,42,0.92) 88%, rgba(232,28,36,1) 100%)";

/**
 * @param {number} value
 * @param {number} maxValue
 * @returns {{ background: string, color: string }}
 */
export function getHeatmapCellStyle(value, maxValue) {
  const max = Math.max(Number(maxValue) || 0, 1e-9);
  const raw = Math.max(0, Math.min(1, Number(value || 0) / max));

  if (raw < 1e-6) {
    return {
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      color: "var(--text-quaternary)",
    };
  }

  // Spread low/mid values, saturate highs toward accent (easier to scan).
  const t = Math.pow(raw, 0.72);
  const aTop = 0.08 + t * 0.64;
  const aBot = 0.05 + t * 0.78;

  return {
    background: `linear-gradient(165deg, rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},${aTop.toFixed(3)}) 0%, rgba(${ACCENT_DEEP.r},${ACCENT_DEEP.g},${ACCENT_DEEP.b},${aBot.toFixed(3)}) 100%)`,
    color: t > 0.4 ? "#ffffff" : t > 0.16 ? "var(--text-primary)" : "var(--text-secondary)",
  };
}
