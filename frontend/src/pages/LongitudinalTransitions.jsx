import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";
import { getApiErrorMessage, getSummary, getTransitions } from "../api";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { StatusBanner } from "../components/StatusBanner";
import { Chip } from "../components/ui/Chip";
import { cn } from "../components/ui/cn";
import { FilterControl } from "../components/ui/FilterControl";
import { PremiumDropdown } from "../components/ui/PremiumDropdown";
import { SectionCard } from "../components/ui/SectionCard";
import {
  getPhenotypeChipMeta,
  getStandardPhenotypeLabel,
  PHENOTYPE_BY_ID,
  PHENOTYPES,
} from "../constants/phenotypes";
import { useYear } from "../context/yearContext";
import { getHeatmapCellStyle, HEATMAP_LEGEND_GRADIENT } from "../utils/heatmapStyle";

/** API may emit merged ids (e.g. P3P4_merged); expand to canonical P1–P5 only. */
function expandCanonicalPhenotypeIds(id) {
  const s = String(id ?? "");
  if (PHENOTYPE_BY_ID[s]) return [s];
  const tokens = [
    ...new Set((s.match(/P[1-5]/gi) || []).map((x) => x.toUpperCase())),
  ].filter((t) => PHENOTYPE_BY_ID[t]);
  return tokens;
}

/** Distribute merged-cluster probabilities across canonical pairs — no extra Sankey/heatmap rows. */
function aggregateCanonicalTransitions(transitions) {
  const map = new Map();
  for (const edge of transitions || []) {
    const p = Number(edge.probability || 0);
    if (p <= 0) continue;
    const fromList = expandCanonicalPhenotypeIds(edge.from);
    const toList = expandCanonicalPhenotypeIds(edge.to);
    if (!fromList.length || !toList.length) continue;
    const share = p / (fromList.length * toList.length);
    for (const f of fromList) {
      for (const t of toList) {
        const key = `${f}|${t}`;
        map.set(key, (map.get(key) || 0) + share);
      }
    }
  }
  return Array.from(map.entries()).map(([key, probability]) => {
    const [from, to] = key.split("|");
    return { from, to, probability };
  });
}

const CANONICAL_TRANSITION_IDS = PHENOTYPES.map((p) => p.id);
/**
 * Nodes that always appear on each side of the Sankey, regardless of whether
 * the underlying clustering for the selected year happens to expose them.
 * Mirrors `phenotype_dictionary.json` -> `metadata.allowed_codes`.
 */
const SANKEY_ALWAYS_VISIBLE_IDS = ["P1", "P2", "P3", "P3P4_merged", "P4", "P5"];

export function LongitudinalTransitions() {
  const { years, selectedYear, setSelectedYear } = useYear();
  const [fromYear, setFromYear] = useState(selectedYear < 2017 ? selectedYear : 2016);
  const [toYear, setToYear] = useState(selectedYear < 2017 ? selectedYear + 1 : 2017);
  const [payload, setPayload] = useState(null);
  const [fromSummary, setFromSummary] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState("percentage");
  const [sankeyFocusId, setSankeyFocusId] = useState("ALL");

  const adjacentPairs = useMemo(
    () =>
      years
        .slice()
        .sort((a, b) => a - b)
        .filter((year) => years.includes(year + 1))
        .map((year) => ({ from: year, to: year + 1 })),
    [years],
  );

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    Promise.all([getTransitions(fromYear, toYear), getSummary(fromYear)])
      .then(([result, summaryResult]) => {
        if (mounted) {
          setPayload(result);
          setFromSummary(summaryResult);
          setError("");
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(getApiErrorMessage(err, "Unable to load transition matrix."));
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [fromYear, toYear]);

  useEffect(() => {
    if (!adjacentPairs.length) return;
    const isValid = adjacentPairs.some((pair) => pair.from === fromYear && pair.to === toYear);
    if (!isValid) {
      setFromYear(adjacentPairs[0].from);
      setToYear(adjacentPairs[0].to);
    }
  }, [adjacentPairs, fromYear, toYear]);

  useEffect(() => {
    if (!adjacentPairs.length) return;
    const matchedPair =
      adjacentPairs.find((pair) => pair.from === selectedYear) ||
      adjacentPairs[adjacentPairs.length - 1];
    if (!matchedPair) return;
    if (fromYear !== matchedPair.from || toYear !== matchedPair.to) {
      setFromYear(matchedPair.from);
      setToYear(matchedPair.to);
    }
  }, [adjacentPairs, selectedYear, fromYear, toYear]);

  /** Heatmap & Sankey axes = P1–P5 only; merged API ids roll into these cells */
  const canonicalTransitions = useMemo(
    () => aggregateCanonicalTransitions(payload?.transitions || []),
    [payload],
  );

  useEffect(() => {
    if (sankeyFocusId === "ALL") return;
    const ids = new Set();
    (payload?.transitions || []).forEach((edge) => {
      ids.add(String(edge.from));
      ids.add(String(edge.to));
    });
    if (ids.size && !ids.has(sankeyFocusId)) {
      setSankeyFocusId("ALL");
    }
  }, [sankeyFocusId, payload]);

  const matrix = useMemo(() => {
    const ids = CANONICAL_TRANSITION_IDS;
    const template = {};
    ids.forEach((from) => {
      template[from] = {};
      ids.forEach((to) => {
        template[from][to] = 0;
      });
    });
    canonicalTransitions.forEach((edge) => {
      const from = String(edge.from);
      const to = String(edge.to);
      if (template[from] && Object.hasOwn(template[from], to)) {
        template[from][to] = Number(edge.probability || 0);
      }
    });
    return template;
  }, [canonicalTransitions]);

  const summaryCards = useMemo(() => {
    const phenotypeOrder = Object.fromEntries(CANONICAL_TRANSITION_IDS.map((id, index) => [id, index]));
    const stability = CANONICAL_TRANSITION_IDS.map((id) => ({
      id,
      value: matrix[id]?.[id] || 0,
    }));
    const fallbackId = CANONICAL_TRANSITION_IDS[0] || "P1";
    const mostStable = stability.reduce(
      (a, b) => (a.value > b.value ? a : b),
      { id: fallbackId, value: 0 },
    );
    const mostDynamic = stability.reduce(
      (a, b) => (a.value < b.value ? a : b),
      { id: fallbackId, value: 1 },
    );
    const transitions = canonicalTransitions;
    const progressionCandidates = transitions.filter(
      (edge) => (phenotypeOrder[edge.to] ?? 0) > (phenotypeOrder[edge.from] ?? 0),
    );
    const regressionCandidates = transitions.filter(
      (edge) => (phenotypeOrder[edge.to] ?? 0) < (phenotypeOrder[edge.from] ?? 0),
    );
    const highestProgressionFlow = progressionCandidates.reduce(
      (best, edge) => (Number(edge.probability) > Number(best?.probability || 0) ? edge : best),
      null,
    );
    const highestRegressionFlow = regressionCandidates.reduce(
      (best, edge) => (Number(edge.probability) > Number(best?.probability || 0) ? edge : best),
      null,
    );
    return { mostStable, mostDynamic, highestProgressionFlow, highestRegressionFlow };
  }, [matrix, canonicalTransitions]);

  const fromPhenotypeCounts = useMemo(() => {
    const counts = {};
    (fromSummary?.phenotypes || []).forEach((row) => {
      counts[row.id] = Number(row.patient_count || 0);
    });
    return counts;
  }, [fromSummary]);

  /**
   * Sankey uses the *raw* API transitions (no canonical aggregation), so merged
   * IDs like `P3P4_merged` stay as their own bipartite node and node heights
   * stay proportional to actual flow totals.
   */
  const rawSankeyEdges = useMemo(() => {
    const list = (payload?.transitions || [])
      .map((edge) => ({
        from: String(edge.from ?? ""),
        to: String(edge.to ?? ""),
        probability: Number(edge.probability || 0),
      }))
      .filter((edge) => edge.from && edge.to && edge.probability > 0);
    return list;
  }, [payload]);

  const sankeyFocusOptions = useMemo(() => {
    const ids = new Set();
    rawSankeyEdges.forEach((edge) => {
      ids.add(edge.from);
      ids.add(edge.to);
    });
    const ranked = (id) => {
      const m = id.match(/^P(\d+)/);
      return m ? Number(m[1]) : 99;
    };
    return Array.from(ids).sort((a, b) => {
      const ra = ranked(a);
      const rb = ranked(b);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
  }, [rawSankeyEdges]);

  const maxTransitionProbability = useMemo(() => {
    const values = CANONICAL_TRANSITION_IDS.flatMap((from) =>
      CANONICAL_TRANSITION_IDS.map((to) => Number(matrix[from]?.[to] || 0)),
    );
    return Math.max(...values, 0.0001);
  }, [matrix]);

  const formatMatrixValue = (fromId, probability) => {
    const normalizedProbability = Number(probability || 0);
    if (mode === "count") {
      const baseCount = Number(fromPhenotypeCounts[fromId] || 0);
      return Math.round(normalizedProbability * baseCount).toLocaleString();
    }
    return `${(normalizedProbability * 100).toFixed(1)}%`;
  };

  // Highlight the most clinically concerning flow (P4→P5 or highest escalation)
  const p4ToP5 = useMemo(() => {
    const edge = canonicalTransitions.find((e) => e.from === "P4" && e.to === "P5");
    return edge ? Number(edge.probability || 0) : null;
  }, [canonicalTransitions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Progression"
        description="How patients move between risk tiers year over year — identify escalation patterns and care gaps."
        meta={
          <>
            <Chip tone="accent" size="md">
              {fromYear} → {toYear}
            </Chip>
            <Chip size="md">
              {mode === "count" ? "Raw counts" : "Row %"}
            </Chip>
          </>
        }
      />

      {/* Clinical escalation alert */}
      {p4ToP5 != null && p4ToP5 > 0.25 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-[12.5px] text-amber-300">
            <strong>{(p4ToP5 * 100).toFixed(1)}%</strong> of Cardiovascular Polypharmacy (Tier 4) patients escalated to Highest Acuity (Tier 5) between {fromYear} and {toYear}.
            This is the primary at-risk transition — targeted interventions on Tier 4 patients can reduce this rate.
          </p>
        </div>
      )}

      <SectionCard
        className="relative z-20 [&_header]:mb-3"
        eyebrow="Filters"
        title="Select analysis period"
        density="tight"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <FilterControl label="From year">
            <PremiumDropdown
              value={fromYear}
              onChange={(v) => {
                const nextFrom = Number(v);
                setFromYear(nextFrom);
                setToYear(nextFrom + 1);
                setSelectedYear(nextFrom);
              }}
              options={adjacentPairs.map((pair) => ({
                value: pair.from,
                label: String(pair.from),
              }))}
              listAriaLabel="Select from year"
            />
          </FilterControl>
          <FilterControl label="To year">
            <PremiumDropdown
              value={toYear}
              onChange={(v) => {
                const nextTo = Number(v);
                setToYear(nextTo);
                setFromYear(nextTo - 1);
                setSelectedYear(nextTo - 1);
              }}
              options={adjacentPairs.map((pair) => ({
                value: pair.to,
                label: String(pair.to),
              }))}
              listAriaLabel="Select to year"
            />
          </FilterControl>
          <FilterControl label="Display">
            <PremiumDropdown
              value={mode}
              onChange={setMode}
              options={[
                { value: "percentage", label: "Row percentage" },
                { value: "count", label: "Raw count" },
              ]}
              listAriaLabel="Select display mode"
            />
          </FilterControl>
        </div>
      </SectionCard>

      {isLoading && (
        <div className="surface-2 flex items-center gap-3 rounded-md p-3.5 text-[13px] text-fg-tertiary">
          <Spinner />
          Loading transition matrix…
        </div>
      )}
      {error && <StatusBanner tone="error" message={error} />}
      {!error && payload?.status?.state === "warning" && (
        <StatusBanner
          tone="warning"
          message={payload.status.message}
          details={payload.status.missing_files || []}
        />
      )}

      {/* ── Insight cards ─────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          icon={Lock}
          eyebrow="Most Stable Tier"
          phenotypeId={summaryCards.mostStable.id}
          title={getPhenotypeShortLabelFor(summaryCards.mostStable.id)}
          value={formatMatrixValue(summaryCards.mostStable.id, summaryCards.mostStable.value)}
          caption="Remain in same tier year over year"
        />
        <InsightCard
          icon={ArrowRight}
          eyebrow="Most Dynamic Tier"
          phenotypeId={summaryCards.mostDynamic.id}
          title={getPhenotypeShortLabelFor(summaryCards.mostDynamic.id)}
          value={formatMatrixValue(summaryCards.mostDynamic.id, summaryCards.mostDynamic.value)}
          caption="Highest rate of tier change"
        />
        <InsightCard
          icon={ArrowUpRight}
          eyebrow="Top Escalation Flow"
          phenotypeId={summaryCards.highestProgressionFlow?.from}
          title={
            summaryCards.highestProgressionFlow
              ? `${summaryCards.highestProgressionFlow.from} → ${summaryCards.highestProgressionFlow.to}`
              : "—"
          }
          value={
            summaryCards.highestProgressionFlow
              ? formatMatrixValue(
                  summaryCards.highestProgressionFlow.from,
                  Number(summaryCards.highestProgressionFlow.probability),
                )
              : "—"
          }
          caption={
            summaryCards.highestProgressionFlow
              ? `${getPhenotypeShortLabelFor(summaryCards.highestProgressionFlow.from)} → ${getPhenotypeShortLabelFor(summaryCards.highestProgressionFlow.to)}`
              : "No escalation flow"
          }
        />
        <InsightCard
          icon={ArrowDownRight}
          eyebrow="Top Improvement Flow"
          phenotypeId={summaryCards.highestRegressionFlow?.from}
          title={
            summaryCards.highestRegressionFlow
              ? `${summaryCards.highestRegressionFlow.from} → ${summaryCards.highestRegressionFlow.to}`
              : "—"
          }
          value={
            summaryCards.highestRegressionFlow
              ? formatMatrixValue(
                  summaryCards.highestRegressionFlow.from,
                  Number(summaryCards.highestRegressionFlow.probability),
                )
              : "—"
          }
          caption={
            summaryCards.highestRegressionFlow
              ? `${getPhenotypeShortLabelFor(summaryCards.highestRegressionFlow.from)} → ${getPhenotypeShortLabelFor(summaryCards.highestRegressionFlow.to)}`
              : "No improvement flow"
          }
        />
      </div>

      <SectionCard
        eyebrow={`${fromYear} → ${toYear}`}
        title="Risk tier transition matrix"
        description="How patients moved between risk tiers. Darker = higher share. Diagonal = patients who stayed in the same tier."
      >
        <div className="rounded-md border border-border-subtle bg-surface-3 p-3">
          <div className="overflow-x-auto">
            <div
              className="grid overflow-hidden rounded-md border border-border-subtle"
              style={{
                minWidth: `${112 + CANONICAL_TRANSITION_IDS.length * 96}px`,
                gridTemplateColumns: `7rem repeat(${CANONICAL_TRANSITION_IDS.length}, minmax(6rem, 1fr))`,
              }}
            >
              <div className="bg-white/[0.025] px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
                From / To
              </div>
              {CANONICAL_TRANSITION_IDS.map((toId) => (
                <div
                  key={`to-${toId}`}
                  className="bg-white/[0.025] px-2.5 py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: getPhenotypeChipMeta(toId).hex }}
                >
                  {toId}
                </div>
              ))}
              {CANONICAL_TRANSITION_IDS.map((fromId) => (
                <div key={`row-${fromId}`} className="contents">
                  <div
                    className="border-t border-border-subtle bg-white/[0.025] px-3 py-3 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: getPhenotypeChipMeta(fromId).hex }}
                  >
                    {fromId}
                  </div>
                  {CANONICAL_TRANSITION_IDS.map((toId) => {
                    const probability = Number(matrix[fromId]?.[toId] || 0);
                    const displayValue = formatMatrixValue(fromId, probability);
                    return (
                      <div
                        key={`${fromId}-${toId}`}
                        className="flex min-h-[58px] items-center justify-center border-t border-border-subtle px-2 py-3 text-center text-[12.5px] font-semibold tabular transition hover:brightness-125"
                        style={getHeatmapCellStyle(probability, maxTransitionProbability)}
                        title={`${getStandardPhenotypeLabel(fromId)} → ${getStandardPhenotypeLabel(toId)}: ${displayValue}`}
                      >
                        {displayValue}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 px-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-fg-quaternary">
              Lower
            </span>
            <div className="h-1.5 flex-1 rounded-full" style={{ background: HEATMAP_LEGEND_GRADIENT }} />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-fg-quaternary">
              Higher
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        className="relative z-10"
        eyebrow="Patient flow"
        title="Risk tier flow diagram"
        description={`Patient movement between risk tiers (${fromYear} → ${toYear}). Band thickness reflects transition volume.`}
        action={
          <div className="relative z-20 min-w-[220px]">
            <FilterControl label="Focus phenotype">
              <PremiumDropdown
                value={sankeyFocusId}
                onChange={setSankeyFocusId}
                options={[
                  { value: "ALL", label: "All phenotypes" },
                  ...sankeyFocusOptions.map((id) => ({
                    value: id,
                    label: getStandardPhenotypeLabel(id),
                  })),
                ]}
                listAriaLabel="Focus phenotype for Sankey"
              />
            </FilterControl>
          </div>
        }
      >
        <div className="overflow-hidden rounded-md border border-border-subtle bg-surface-3 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-border-subtle pb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
            <span>{fromYear} source</span>
            <span>{toYear} destination</span>
          </div>
          <SankeyChart
            edges={rawSankeyEdges}
            focusId={sankeyFocusId}
            formatValue={(fromId, value) => formatMatrixValue(fromId, value)}
            onFocusChange={setSankeyFocusId}
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Clinical priorities"
        title={`Highest-volume tier transitions · ${fromYear} → ${toYear}`}
        description="Ordered by transition rate. Escalation flows (moving to a higher tier) represent care gaps to address."
      >
        <div className="space-y-2">
          {canonicalTransitions
            .slice()
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 5)
            .map((edge) => {
              const fromMeta = getPhenotypeChipMeta(edge.from);
              const toMeta = getPhenotypeChipMeta(edge.to);
              const fromColor = fromMeta.hex;
              const toColor = toMeta.hex;
              const percentage = Number(edge.probability || 0) * 100;
              const isSelf = edge.from === edge.to;
              return (
                <div
                  key={`${edge.from}-${edge.to}`}
                  className="surface-2 group flex flex-col gap-3 rounded-md p-3.5 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex w-[7.75rem] shrink-0 items-center justify-between gap-1.5 sm:w-[8.25rem] sm:justify-start">
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold tabular tracking-tight",
                        fromMeta.label.length <= 2 && "text-[11px]",
                        fromMeta.label.length === 3 && "text-[10px]",
                        fromMeta.label.length === 4 && "text-[9px]",
                        fromMeta.label.length >= 5 && "text-[8px] leading-tight",
                      )}
                      style={{
                        color: fromColor,
                        backgroundColor: `${fromColor}1c`,
                        boxShadow: `inset 0 0 0 1px ${fromColor}40`,
                      }}
                      title={getStandardPhenotypeLabel(edge.from)}
                    >
                      {fromMeta.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-quaternary sm:mx-0.5" />
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold tabular tracking-tight",
                        toMeta.label.length <= 2 && "text-[11px]",
                        toMeta.label.length === 3 && "text-[10px]",
                        toMeta.label.length === 4 && "text-[9px]",
                        toMeta.label.length >= 5 && "text-[8px] leading-tight",
                      )}
                      style={{
                        color: toColor,
                        backgroundColor: `${toColor}1c`,
                        boxShadow: `inset 0 0 0 1px ${toColor}40`,
                      }}
                      title={getStandardPhenotypeLabel(edge.to)}
                    >
                      {toMeta.label}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-fg-primary">
                      {getPhenotypeShortLabelFor(edge.from)}
                      <span className="mx-1.5 text-fg-quaternary">→</span>
                      {getPhenotypeShortLabelFor(edge.to)}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, percentage)}%`,
                          background: `linear-gradient(90deg, ${fromColor}, ${toColor})`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-semibold tabular text-fg-primary">
                      {percentage.toFixed(1)}%
                    </p>
                    <p className="text-[10.5px] uppercase tracking-[0.16em] text-fg-quaternary">
                      {isSelf ? "Stay" : "Move"}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </SectionCard>
    </div>
  );
}

/**
 * True d3-sankey diagram. Source year on the left, target year on the right.
 * Node heights are proportional to total flow; merged ids (e.g. P3P4_merged)
 * keep their own node so the diagram tells the truth about the data. Canonical
 * P1–P5 are *always* rendered on each side; when a canonical is missing from
 * the data for that year we add a near-zero "ghost" link so the node stays
 * visible (as a thin dashed sliver) without distorting real proportions.
 */
function SankeyChart({ edges, focusId, formatValue, onFocusChange }) {
  const WIDTH = 1000;
  const HEIGHT = 480;
  const NODE_WIDTH = 16;
  const NODE_PADDING = 14;
  /** Generous side gutters so labels like "P3+P4" never get clipped. */
  const PAD_X = 78;
  const PAD_Y = 28;
  const GHOST_VALUE = 0.012;
  const [hoverRawId, setHoverRawId] = useState(null);

  const layout = useMemo(() => {
    if (!edges.length) return null;

    const sourceIds = new Set(edges.map((e) => e.from));
    const targetIds = new Set(edges.map((e) => e.to));
    const visibleIds = new Set([
      ...SANKEY_ALWAYS_VISIBLE_IDS,
      ...sourceIds,
      ...targetIds,
    ]);

    const nodeMap = new Map();
    const ensureNode = (rawId, side) => {
      const key = `${side}::${rawId}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { name: key, side, rawId });
      }
      return key;
    };

    const links = edges.map((edge) => ({
      source: ensureNode(edge.from, "src"),
      target: ensureNode(edge.to, "tgt"),
      value: Math.max(1e-6, Number(edge.probability || 0)),
      rawFrom: edge.from,
      rawTo: edge.to,
      probability: Number(edge.probability || 0),
      isGhost: false,
    }));

    visibleIds.forEach((pid) => {
      const missingSrc = !sourceIds.has(pid);
      const missingTgt = !targetIds.has(pid);
      if (!missingSrc && !missingTgt) return;
      links.push({
        source: ensureNode(pid, "src"),
        target: ensureNode(pid, "tgt"),
        value: GHOST_VALUE,
        rawFrom: pid,
        rawTo: pid,
        probability: 0,
        isGhost: true,
        ghostMissingSrc: missingSrc,
        ghostMissingTgt: missingTgt,
      });
    });

    const nodes = Array.from(nodeMap.values());
    const nodeIndex = new Map(nodes.map((node, i) => [node.name, i]));
    const indexedLinks = links.map((link) => ({
      ...link,
      source: nodeIndex.get(link.source),
      target: nodeIndex.get(link.target),
    }));

    const sankeyGen = d3Sankey()
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([
        [PAD_X, PAD_Y],
        [WIDTH - PAD_X, HEIGHT - PAD_Y],
      ])
      .nodeSort((a, b) => {
        const ra = (a.rawId.match(/^P(\d+)/) || [])[1];
        const rb = (b.rawId.match(/^P(\d+)/) || [])[1];
        const na = ra !== undefined ? Number(ra) : 99;
        const nb = rb !== undefined ? Number(rb) : 99;
        if (na !== nb) return na - nb;
        return String(a.rawId).localeCompare(String(b.rawId));
      });

    const result = sankeyGen({
      nodes: nodes.map((node) => ({ ...node })),
      links: indexedLinks,
    });

    /** Tag each node as ghost if all of its links on the relevant side are ghost-only. */
    result.nodes.forEach((node) => {
      const outgoing = node.sourceLinks || [];
      const incoming = node.targetLinks || [];
      const ghostSrc = node.side === "src" && outgoing.length > 0 && outgoing.every((l) => l.isGhost);
      const ghostTgt = node.side === "tgt" && incoming.length > 0 && incoming.every((l) => l.isGhost);
      node.isGhost = ghostSrc || ghostTgt;
      node.realValue = (outgoing.length ? outgoing : incoming)
        .filter((l) => !l.isGhost)
        .reduce((sum, l) => sum + (l.probability || 0), 0);
    });

    return result;
  }, [edges]);

  if (!layout) {
    return (
      <div className="flex h-[280px] items-center justify-center text-[12.5px] text-fg-tertiary">
        No transition flows for this window.
      </div>
    );
  }

  const { nodes, links } = layout;
  const linkPath = sankeyLinkHorizontal();

  // Click locks focus; hover previews it when nothing is locked
  const effectiveFocusId = focusId !== "ALL" ? focusId : (hoverRawId ?? "ALL");
  const hasActiveFocus = effectiveFocusId !== "ALL";

  const nodeIsFocused = (node) => !hasActiveFocus || node.rawId === effectiveFocusId;
  const linkIsFocused = (link) =>
    !hasActiveFocus ||
    link.source.rawId === effectiveFocusId ||
    link.target.rawId === effectiveFocusId;

  const handleNodeClick = (rawId) => {
    onFocusChange?.(focusId === rawId ? "ALL" : rawId);
  };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      style={{ height: HEIGHT }}
      shapeRendering="geometricPrecision"
    >
      <defs>
        {links.map((link, i) => {
          const fromHex = getPhenotypeChipMeta(link.source.rawId).hex;
          const toHex = getPhenotypeChipMeta(link.target.rawId).hex;
          return (
            <linearGradient
              key={`sk-grad-${i}`}
              id={`sk-grad-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={link.source.x1}
              x2={link.target.x0}
            >
              <stop offset="0%" stopColor={fromHex} stopOpacity={0.9} />
              <stop offset="100%" stopColor={toHex} stopOpacity={0.9} />
            </linearGradient>
          );
        })}
      </defs>

      {/* Links */}
      <g>
        {links
          .slice()
          .sort((a, b) => Number(a.isGhost) - Number(b.isGhost) || a.width - b.width)
          .map((link) => {
            const focused = linkIsFocused(link);
            const idx = links.indexOf(link);
            if (link.isGhost) {
              return (
                <path
                  key={`sk-link-ghost-${link.source.name}-${link.target.name}-${idx}`}
                  d={linkPath(link)}
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1}
                  strokeOpacity={focused ? 0.38 : 0.08}
                  strokeDasharray="3 3"
                  style={{ pointerEvents: "none", transition: "stroke-opacity 180ms ease" }}
                />
              );
            }
            return (
              <path
                key={`sk-link-${link.source.name}-${link.target.name}-${idx}`}
                d={linkPath(link)}
                fill="none"
                stroke={`url(#sk-grad-${idx})`}
                strokeWidth={Math.max(1, link.width)}
                strokeOpacity={focused ? 0.82 : 0.07}
                style={{ transition: "stroke-opacity 180ms ease" }}
              >
                <title>
                  {getStandardPhenotypeLabel(link.source.rawId)} → {getStandardPhenotypeLabel(link.target.rawId)}:{" "}
                  {formatValue(link.source.rawId, link.probability)}
                </title>
              </path>
            );
          })}
      </g>

      {/* Percentage labels on focused links */}
      {hasActiveFocus && (
        <g style={{ pointerEvents: "none" }}>
          {links
            .filter((link) => !link.isGhost && linkIsFocused(link) && link.width >= 6)
            .map((link, i) => {
              const midX = (link.source.x1 + link.target.x0) / 2;
              const midY = (link.y0 + link.y1) / 2;
              const label = formatValue(link.source.rawId, link.probability);
              const bgW = label.length * 6.4 + 10;
              const bgH = 16;
              return (
                <g key={`sk-linklabel-${i}`}>
                  <rect
                    x={midX - bgW / 2}
                    y={midY - bgH / 2}
                    width={bgW}
                    height={bgH}
                    rx={4}
                    fill="rgba(10,10,11,0.78)"
                  />
                  <text
                    x={midX}
                    y={midY + 4.5}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="700"
                    fill="rgba(255,255,255,0.92)"
                    letterSpacing="0.02em"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
        </g>
      )}

      {/* Nodes */}
      <g>
        {nodes.map((node) => {
          const meta = getPhenotypeChipMeta(node.rawId);
          const focused = nodeIsFocused(node);
          const isActive = focusId === node.rawId;
          const h = Math.max(2, node.y1 - node.y0);
          const labelOnLeft = node.side === "src";
          const labelX = labelOnLeft ? node.x0 - 8 : node.x1 + 8;
          const labelAnchor = labelOnLeft ? "end" : "start";
          const labelY = node.y0 + h / 2 + 3.5;
          const valueY = node.y0 + h / 2 + 16;
          const isGhost = node.isGhost;
          const valueText = isGhost ? "absent this year" : formatValue(node.rawId, node.realValue || node.value || 0);
          return (
            <g
              key={`sk-node-${node.name}`}
              opacity={focused ? (isGhost ? 0.55 : 1) : isGhost ? 0.15 : 0.18}
              style={{
                cursor: isGhost ? "default" : "pointer",
                transition: "opacity 180ms ease",
              }}
              onClick={() => !isGhost && handleNodeClick(node.rawId)}
              onMouseEnter={() => !isGhost && setHoverRawId(node.rawId)}
              onMouseLeave={() => setHoverRawId(null)}
            >
              <rect
                x={node.x0}
                y={node.y0}
                width={node.x1 - node.x0}
                height={h}
                fill={isGhost ? "transparent" : meta.hex}
                stroke={isActive ? "#fff" : isGhost ? meta.hex : "transparent"}
                strokeWidth={isActive ? 1.5 : isGhost ? 1 : 0}
                strokeDasharray={isGhost ? "2 2" : undefined}
                rx={2}
              >
                <title>
                  {getStandardPhenotypeLabel(node.rawId)} ·{" "}
                  {isGhost ? `Not present in ${labelOnLeft ? "source" : "target"} year` : valueText}
                </title>
              </rect>
              <text
                x={labelX}
                y={labelY}
                textAnchor={labelAnchor}
                fontSize="11.5"
                fontWeight="700"
                letterSpacing="0.04em"
                fill={isGhost ? "var(--text-tertiary)" : "var(--text-primary)"}
              >
                {meta.label}
              </text>
              {h >= 18 && (
                <text
                  x={labelX}
                  y={valueY}
                  textAnchor={labelAnchor}
                  fontSize="10"
                  fontStyle={isGhost ? "italic" : "normal"}
                  fill="var(--text-tertiary)"
                >
                  {valueText}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function getPhenotypeShortLabelFor(id) {
  if (!id) return "—";
  if (PHENOTYPE_BY_ID[id]) {
    const fullLabel = getStandardPhenotypeLabel(id);
    return fullLabel.replace(new RegExp(`^${id}\\s*-\\s*`, "i"), "");
  }
  const tokens = [...new Set((id.match(/P[1-5]/gi) || []).map((x) => x.toUpperCase()))];
  if (tokens.length >= 2) {
    return tokens.map((t) => PHENOTYPE_BY_ID[t]?.name || t).join(" · ");
  }
  return id;
}

function InsightCard({ icon: Icon, eyebrow, phenotypeId, title, value, caption }) {
  const color = phenotypeId ? getPhenotypeChipMeta(phenotypeId).hex : "#787887";
  return (
    <div
      className="surface-2 is-interactive relative flex flex-col gap-3 rounded-md p-4"
      style={{
        background: `radial-gradient(circle 8rem at 0% 0%, ${color}10, transparent 65%), linear-gradient(180deg, var(--surface-2), var(--surface-1))`,
      }}
    >
      <span
        aria-hidden
        className="absolute left-4 right-4 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="flex items-center justify-between">
        <p className="text-eyebrow uppercase text-fg-tertiary">{eyebrow}</p>
        {Icon && (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md"
            style={{
              color,
              backgroundColor: `${color}14`,
              boxShadow: `inset 0 0 0 1px ${color}30`,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div>
        <p className="text-[15px] font-semibold leading-tight text-fg-primary">{title}</p>
        <p className="mt-1 text-[12px] text-fg-tertiary">{caption}</p>
      </div>
      <p className="text-metric-lg tabular text-fg-primary leading-none">{value}</p>
    </div>
  );
}
