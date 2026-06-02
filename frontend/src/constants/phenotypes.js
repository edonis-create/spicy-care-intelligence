export const PHENOTYPES = [
  {
    id: "P1",
    name: "Minimal Burden",
    label: "P1 – Minimal Burden",
    description: "Youngest cohort with minimal disease load, near-zero medication use, and rare healthcare encounters. Low-cost, stable population with very few active conditions.",
    clinicalTier: 1,
    ragStatus: "green",
    colorName: "blue",
    color: {
      hex: "#2563EB",
      bg: "bg-blue-600",
      bgSoft: "bg-blue-950",
      border: "border-blue-500",
      text: "text-blue-400",
      dot: "bg-blue-500",
      stroke: "stroke-blue-500",
      card: "border-blue-500 bg-blue-950/30",
      accent: "bg-blue-500",
    },
  },
  {
    id: "P2",
    name: "Stable Polypharmacy",
    label: "P2 – Stable Polypharmacy",
    description: "Older patients with high chronic medication exposure (~91% on long-term therapy) and moderate polypharmacy, primarily managed outpatient. Conditions are established but low-acuity with limited inpatient activity.",
    clinicalTier: 2,
    ragStatus: "amber",
    colorName: "red",
    color: {
      hex: "#EC2027",
      bg: "bg-red-600",
      bgSoft: "bg-red-950",
      border: "border-red-500",
      text: "text-red-400",
      dot: "bg-red-500",
      stroke: "stroke-red-500",
      card: "border-red-500 bg-red-950/30",
      accent: "bg-red-500",
    },
  },
  {
    id: "P3",
    name: "Active Multimorbid",
    label: "P3 – Active Multimorbid",
    description: "Near-average age with high diagnosis diversity and frequent outpatient visits. Moderate medication use driven by multiple concurrent conditions, with some inpatient activity. High ambulatory care demand.",
    clinicalTier: 3,
    ragStatus: "amber",
    colorName: "green",
    color: {
      hex: "#16A34A",
      bg: "bg-green-600",
      bgSoft: "bg-green-950",
      border: "border-green-500",
      text: "text-green-400",
      dot: "bg-green-500",
      stroke: "stroke-green-500",
      card: "border-green-500 bg-green-950/30",
      accent: "bg-green-500",
    },
  },
  {
    id: "P4",
    name: "Cardiovascular Polypharmacy",
    label: "P4 – Cardiovascular Polypharmacy",
    description: "Oldest subgroup with dominant circulatory disease burden, highest polypharmacy (~81%), and near-peak prescription use. Significant inpatient activity driven by cardiovascular complexity and multi-system chronic disease.",
    clinicalTier: 4,
    ragStatus: "red",
    colorName: "amber",
    color: {
      hex: "#D97706",
      bg: "bg-amber-600",
      bgSoft: "bg-amber-950",
      border: "border-amber-500",
      text: "text-amber-400",
      dot: "bg-amber-500",
      stroke: "stroke-amber-500",
      card: "border-amber-500 bg-amber-950/30",
      accent: "bg-amber-500",
    },
  },
  {
    id: "P5",
    name: "Highest Acuity",
    label: "P5 – Highest Acuity",
    description: "Highest diagnosis breadth, inpatient admission rate, and outpatient visit volume across all tiers. Despite being younger than P4, this group drives maximum healthcare utilization. Priority for coordinated, intensive care management.",
    clinicalTier: 5,
    ragStatus: "red",
    colorName: "purple",
    color: {
      hex: "#7C3AED",
      bg: "bg-violet-600",
      bgSoft: "bg-violet-950",
      border: "border-violet-500",
      text: "text-violet-400",
      dot: "bg-violet-500",
      stroke: "stroke-violet-500",
      card: "border-violet-500 bg-violet-950/30",
      accent: "bg-violet-500",
    },
  },
];

export const PHENOTYPE_BY_ID = Object.fromEntries(
  PHENOTYPES.map((phenotype) => [phenotype.id, phenotype]),
);

function parseHex(hex) {
  const h = String(hex || "").replace("#", "").trim();
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const c = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function blendHexColors(hexA, hexB, t = 0.5) {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  if (!a || !b) return hexA || hexB || "#787887";
  return rgbToHex(a.r * (1 - t) + b.r * t, a.g * (1 - t) + b.g * t, a.b * (1 - t) + b.b * t);
}

/**
 * Compact circle label + brand-aligned hex for synthetic ids (e.g. P3P4_merged).
 */
export function getPhenotypeChipMeta(id) {
  if (!id) return { hex: "#787887", label: "—" };
  const known = PHENOTYPE_BY_ID[id];
  if (known) return { hex: known.color.hex, label: id };

  const tokens = [...new Set((id.match(/P[1-5]/gi) || []).map((x) => x.toUpperCase()))];
  if (tokens.length >= 2) {
    const hexes = tokens.map((t) => PHENOTYPE_BY_ID[t]?.color.hex).filter(Boolean);
    let hex = "#787887";
    if (hexes.length > 0) {
      hex = hexes.reduce((acc, h, i) => (i === 0 ? h : blendHexColors(acc, h, 0.5)));
    }
    const label = tokens.join("+");
    return { hex, label };
  }

  const short = id.replace(/_/g, "").slice(0, 4);
  return { hex: "#787887", label: short || "?" };
}

export function getStandardPhenotypeLabel(id) {
  const phenotype = PHENOTYPE_BY_ID[id];
  if (phenotype) return phenotype.label.trim();
  const tokens = [...new Set((id.match(/P[1-5]/gi) || []).map((x) => x.toUpperCase()))];
  if (tokens.length >= 2) {
    const names = tokens.map((t) => PHENOTYPE_BY_ID[t]?.name || t).join(" · ");
    return `${id} — ${names}`;
  }
  return id;
}
