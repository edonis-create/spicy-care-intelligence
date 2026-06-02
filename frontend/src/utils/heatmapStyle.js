/**
 * Multi-stop cool-to-warm heatmap scale.
 * Low distance (similar phenotypes) → blue/teal
 * High distance (distinct phenotypes) → amber/red
 */

// 5 perceptually distinct stops from cool to warm
const STOPS = [
  { t: 0.00, r:  30, g:  58, b: 138 }, // deep blue
  { t: 0.28, r:   8, g: 145, b: 178 }, // cyan
  { t: 0.52, r:  16, g: 185, b: 129 }, // emerald
  { t: 0.74, r: 245, g: 158, b:  11 }, // amber
  { t: 1.00, r: 220, g:  38, b:  38 }, // vivid red
];

function interpolateStops(t) {
  const clamped = Math.max(0, Math.min(1, t));
  let lo = STOPS[0];
  let hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (clamped >= STOPS[i].t && clamped <= STOPS[i + 1].t) {
      lo = STOPS[i];
      hi = STOPS[i + 1];
      break;
    }
  }
  const span = hi.t - lo.t || 1;
  const f = (clamped - lo.t) / span;
  return {
    r: Math.round(lo.r + (hi.r - lo.r) * f),
    g: Math.round(lo.g + (hi.g - lo.g) * f),
    b: Math.round(lo.b + (hi.b - lo.b) * f),
  };
}

export const HEATMAP_LEGEND_GRADIENT = (() => {
  const pts = [0, 0.28, 0.52, 0.74, 1].map((t) => {
    const { r, g, b } = interpolateStops(t);
    return `rgb(${r},${g},${b}) ${(t * 100).toFixed(0)}%`;
  });
  return `linear-gradient(90deg, ${pts.join(", ")})`;
})();

export function getHeatmapCellStyle(value, maxValue) {
  const max = Math.max(Number(maxValue) || 0, 1e-9);
  const raw = Math.max(0, Math.min(1, Number(value || 0) / max));

  if (raw < 1e-6) {
    return {
      background: "rgba(255,255,255,0.03)",
      color: "var(--text-quaternary)",
    };
  }

  // Slight power curve so mid-range values spread more visibly
  const t = Math.pow(raw, 0.78);
  const { r, g, b } = interpolateStops(t);
  const alpha = 0.18 + t * 0.72;

  return {
    background: `rgba(${r},${g},${b},${alpha.toFixed(3)})`,
    color: t > 0.35 ? "#ffffff" : "var(--text-primary)",
  };
}
