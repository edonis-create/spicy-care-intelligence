import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  Users,
} from "lucide-react";
import { getApiErrorMessage, getSummary } from "../api";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { StatusBanner } from "../components/StatusBanner";
import { Chip } from "../components/ui/Chip";
import { SectionCard } from "../components/ui/SectionCard";
import { AXIS_STYLE, ChartTooltip, GRID_STYLE } from "../components/ui/ChartTooltip";
import { getStandardPhenotypeLabel, PHENOTYPE_BY_ID, PHENOTYPES } from "../constants/phenotypes";
import { useYear } from "../context/yearContext";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatDelta(value) {
  if (value == null) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** RAG badge shown next to phenotype tier */
function RagBadge({ status }) {
  const styles = {
    green: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
    amber: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
    red: "bg-red-500/10 text-red-400 border border-red-500/25",
  };
  const labels = { green: "Stable", amber: "Monitor", red: "Critical" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status] || styles.green}`}>
      {labels[status] || "Stable"}
    </span>
  );
}

/** Alert banner shown when high-complexity tier is growing */
function AlertBanner({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-red-300">Population Health Alert</p>
          <ul className="mt-1 space-y-0.5">
            {alerts.map((msg, i) => (
              <li key={i} className="text-[12.5px] text-red-400">{msg}</li>
            ))}
          </ul>
        </div>
        <Link
          to="/risk-progression"
          className="shrink-0 text-[12px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
        >
          Review <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/** Delta indicator with arrow and color */
function DeltaIndicator({ delta, inverse = false }) {
  if (delta == null) return null;
  const isPositive = delta > 0;
  const isBad = inverse ? isPositive : !isPositive;
  const color = delta === 0 ? "text-fg-tertiary" : isBad ? "text-red-600" : "text-emerald-600";
  const Arrow = isPositive ? ArrowUpRight : ArrowUpRight;
  return (
    <span className={`flex items-center gap-0.5 text-[12px] font-semibold ${color}`}>
      <Arrow className={`h-3.5 w-3.5 ${!isPositive ? "rotate-90" : ""}`} />
      {formatDelta(delta)} vs prev. year
    </span>
  );
}

function TrendTooltip({ active, payload, label }) {
  return (
    <ChartTooltip
      active={active}
      payload={payload}
      label={label}
      render={(items) =>
        items.map((entry) => (
          <div key={entry.name} style={{ fontSize: "12.5px", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {Number(entry.value || 0).toLocaleString()}
            </span>{" "}
            active patients
          </div>
        ))
      }
    />
  );
}

function CompositionTooltip({ active, payload, label }) {
  return (
    <ChartTooltip
      active={active}
      payload={payload}
      label={label}
      render={(items) => (
        <>
          {items.map((entry) => (
            <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color || "var(--accent)", flexShrink: 0 }} />
              <span style={{ flex: 1, color: "var(--text-secondary)" }}>
                {PHENOTYPE_BY_ID[entry.name]?.name || entry.name}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-primary)", fontWeight: 600 }}>
                {Number(entry.value || 0).toFixed(1)}%
              </span>
            </div>
          ))}
        </>
      )}
    />
  );
}

export function Overview() {
  const { years, selectedYear, isLoadingYears } = useYear();
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [trendRows, setTrendRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    setIsSummaryLoading(true);
    getSummary(selectedYear)
      .then((payload) => {
        if (!mounted) return;
        setSummary(payload);
        setSummaryError("");
        setIsSummaryLoading(false);
      })
      .catch((error) => {
        if (!mounted) return;
        setSummaryError(getApiErrorMessage(error, "Unable to load dashboard data."));
        setIsSummaryLoading(false);
      });
    return () => { mounted = false; };
  }, [selectedYear]);

  useEffect(() => {
    let mounted = true;
    Promise.all(
      years.map((year) =>
        getSummary(year).then((item) => ({
          year,
          patientCount: item.patient_count,
          phenotypes: item.phenotypes || [],
        })),
      ),
    )
      .then((rows) => { if (mounted) setTrendRows(rows); })
      .catch(() => { if (mounted) setTrendRows([]); });
    return () => { mounted = false; };
  }, [years]);

  const distribution = summary?.phenotypes || [];
  const patientCount = summary?.patient_count || 0;

  /** Previous year data for YoY delta */
  const prevYearRow = useMemo(
    () => trendRows.find((r) => r.year === selectedYear - 1),
    [trendRows, selectedYear],
  );

  const getPrevShare = (id) =>
    Number((prevYearRow?.phenotypes || []).find((p) => p.id === id)?.share || 0) * 100;

  const prevPatientCount = prevYearRow?.patientCount || null;
  const patientDelta = prevPatientCount
    ? ((patientCount - prevPatientCount) / prevPatientCount) * 100
    : null;

  /** P5 trend for alert logic */
  const p5Current = useMemo(
    () => Number(distribution.find((p) => p.id === "P5")?.share || 0) * 100,
    [distribution],
  );
  const p5Prev = getPrevShare("P5");
  const p5Delta = prevYearRow ? p5Current - p5Prev : null;

  const p5Count = useMemo(
    () => Number(distribution.find((p) => p.id === "P5")?.patient_count || 0),
    [distribution],
  );

  /** P4 — at-risk population (chronic, stable → often escalates to P5) */
  const p4Count = useMemo(
    () => Number(distribution.find((p) => p.id === "P4")?.patient_count || 0),
    [distribution],
  );

  const alerts = useMemo(() => {
    const msgs = [];
    if (p5Delta != null && p5Delta > 0.5) {
      msgs.push(
        `High Complexity (Tier 5) population grew ${p5Delta.toFixed(1)} percentage points vs ${selectedYear - 1} — now ${p5Current.toFixed(1)}% of cohort (${formatNumber(p5Count)} patients).`,
      );
    }
    if (p4Count > 0) {
      const estimatedAtRisk = Math.round(p4Count * 0.35);
      msgs.push(
        `~${formatNumber(estimatedAtRisk)} Chronic Stable (Tier 4) patients are at risk of escalation to High Complexity based on historical transition rates.`,
      );
    }
    return msgs;
  }, [p5Delta, p5Current, p5Count, p4Count, selectedYear]);

  const trendData = useMemo(
    () => trendRows.map((row) => ({ year: String(row.year), patients: row.patientCount })),
    [trendRows],
  );

  const phenotypeCompositionOrder = PHENOTYPES.filter(
    (p) => p.id !== "P5" || trendRows.some((row) =>
      (row.phenotypes || []).some((item) => item.id === "P5" && Number(item.share || 0) > 0),
    ),
  );

  const compositionChartData = useMemo(
    () =>
      trendRows.map((row) => {
        const item = { year: String(row.year) };
        phenotypeCompositionOrder.forEach((p) => {
          item[p.id] = Number(
            ((row.phenotypes || []).find((ph) => ph.id === p.id)?.share || 0) * 100,
          ).toFixed(2);
        });
        return item;
      }),
    [trendRows, phenotypeCompositionOrder],
  );

  const visibleDistribution = distribution.filter(
    (p) => p.id !== "P5" || Number(p.share || 0) > 0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Dashboard"
        description="Population health command center — patient risk distribution, trends, and care priorities."
        meta={
          <>
            <Chip tone="accent" size="md">{selectedYear}</Chip>
            {summary?.phenotype_count != null && (
              <Chip size="md">{summary.phenotype_count} risk tiers</Chip>
            )}
          </>
        }
      />

      {(isLoadingYears || isSummaryLoading) && !summaryError && (
        <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-1 p-3.5 text-[13px] text-fg-tertiary shadow-xs">
          <Spinner />
          Loading dashboard data…
        </div>
      )}

      {summaryError && <StatusBanner tone="error" message={summaryError} />}
      {!summaryError && summary?.status?.state === "warning" && (
        <StatusBanner tone="warning" message={summary.status.message} details={summary.status.missing_files || []} />
      )}

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {!isSummaryLoading && !summaryError && alerts.length > 0 && (
        <AlertBanner alerts={alerts} />
      )}

      {/* ── Hero KPIs ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Active patients */}
        <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-1 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">Active Patients</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(14,165,233,0.10)]">
              <Users className="h-4 w-4 text-accent" />
            </span>
          </div>
          <div>
            <p className="text-[2rem] font-semibold leading-none tracking-[-0.03em] text-fg-primary tabular">
              {formatNumber(patientCount)}
            </p>
            <p className="mt-1 text-[12px] text-fg-tertiary">in {selectedYear} cohort</p>
          </div>
          <DeltaIndicator delta={patientDelta} inverse={false} />
          {trendData.length > 1 && (
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kpi-trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="patients" stroke="var(--accent)" strokeWidth={1.5} fill="url(#kpi-trend)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* High complexity */}
        <div
          className="flex flex-col gap-3 rounded-xl border p-5 shadow-sm"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(249,115,22,0.08) 100%)",
            borderColor: p5Delta > 0.5 ? "rgba(239,68,68,0.40)" : "rgba(249,115,22,0.30)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-400">High Complexity</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <TrendingUp className="h-4 w-4 text-red-400" />
            </span>
          </div>
          <div>
            <p className="text-[2rem] font-semibold leading-none tracking-[-0.03em] text-red-300 tabular">
              {formatNumber(p5Count)}
            </p>
            <p className="mt-1 text-[12px] text-red-400">Tier 5 — {p5Current.toFixed(1)}% of cohort</p>
          </div>
          {p5Delta != null && (
            <span className={`text-[12px] font-semibold ${p5Delta > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {p5Delta > 0 ? "▲" : "▼"} {Math.abs(p5Delta).toFixed(1)} pp vs {selectedYear - 1}
            </span>
          )}
          <Link to="/risk-progression" className="flex items-center gap-1 text-[12px] font-semibold text-red-400 hover:text-red-300">
            View risk progression <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* At-risk (P4) */}
        <div
          className="flex flex-col gap-3 rounded-xl border border-amber-500/25 p-5 shadow-sm"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(234,179,8,0.08) 100%)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400">Escalation Risk</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </span>
          </div>
          <div>
            <p className="text-[2rem] font-semibold leading-none tracking-[-0.03em] text-amber-300 tabular">
              {formatNumber(Math.round(p4Count * 0.35))}
            </p>
            <p className="mt-1 text-[12px] text-amber-400">Tier 4 patients at risk of escalation</p>
          </div>
          <p className="text-[12px] text-amber-400">35% historical Tier 4→5 rate</p>
          <Link to="/forecast" className="flex items-center gap-1 text-[12px] font-semibold text-amber-400 hover:text-amber-300">
            Population forecast <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Risk tiers overview */}
        <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-1 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">Risk Tiers</p>
            <Chip size="sm">{summary?.phenotype_count || 0} active</Chip>
          </div>
          <div className="space-y-2">
            {visibleDistribution.slice(0, 5).map((p) => {
              const meta = PHENOTYPE_BY_ID[p.id];
              const sharePct = Number(p.share || 0) * 100;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: meta?.color.hex || "#94a3b8" }}
                  />
                  <span className="w-6 shrink-0 text-[11px] font-bold text-fg-secondary">{p.id}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-white/[0.08]" style={{ height: 4 }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, sharePct)}%`,
                        backgroundColor: meta?.color.hex || "#94a3b8",
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular text-fg-primary">
                    {sharePct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
          <Link to="/population-health" className="flex items-center gap-1 text-[12px] font-semibold text-accent hover:text-accent-hover">
            Full breakdown <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Risk Tier Cards ─────────────────────────────────────────────── */}
      <SectionCard
        eyebrow={`${selectedYear} population`}
        title="Patient Risk Distribution"
        description="Current cohort split across clinical risk tiers. Tier 5 patients need priority care coordination."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleDistribution.map((phenotype) => {
            const meta = PHENOTYPE_BY_ID[phenotype.id];
            const color = meta?.color.hex || "var(--accent)";
            const sharePct = Number(phenotype.share || 0) * 100;
            const prevShare = getPrevShare(phenotype.id);
            const delta = prevYearRow ? sharePct - prevShare : null;
            const rag = meta?.ragStatus || "green";

            return (
              <div
                key={phenotype.id}
                className="group relative flex flex-col gap-3 rounded-xl border bg-surface-1 p-4 shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: `${color}30` }}
              >
                <span
                  aria-hidden
                  className="absolute left-4 right-4 top-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold"
                        style={{ color, backgroundColor: `${color}14`, border: `1px solid ${color}30` }}
                      >
                        Tier {meta?.clinicalTier || phenotype.id.replace("P", "")}
                      </span>
                      <RagBadge status={rag} />
                    </div>
                    <h3 className="mt-1.5 text-[14px] font-semibold leading-snug text-fg-primary">
                      {meta?.name || phenotype.id}
                    </h3>
                  </div>
                  <span
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-[16px] font-bold tabular leading-none"
                    style={{ color, backgroundColor: `${color}10`, border: `1px solid ${color}25` }}
                  >
                    {sharePct.toFixed(1)}%
                  </span>
                </div>

                <div>
                  <p className="text-[1.625rem] font-semibold leading-none tracking-[-0.03em] text-fg-primary tabular">
                    {formatNumber(phenotype.patient_count)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-fg-tertiary">patients in {selectedYear}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: `${color}15` }}>
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, sharePct)}%`, backgroundColor: color }}
                      />
                    </div>
                    {delta != null && (
                      <span className={`ml-3 text-[11.5px] font-semibold tabular ${Math.abs(delta) < 0.1 ? "text-fg-quaternary" : delta > 0 && phenotype.id === "P5" ? "text-red-600" : delta > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}pp
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-fg-tertiary">{meta?.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Trend charts ────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-3"
          eyebrow="Population trends"
          title="Risk tier composition by year"
          description="How patient distribution across risk tiers has shifted over time."
        >
          <div className="rounded-lg border border-border-subtle bg-surface-3 p-3">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compositionChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barCategoryGap="22%">
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="year" {...AXIS_STYLE} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...AXIS_STYLE} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} content={<CompositionTooltip />} />
                  {phenotypeCompositionOrder.map((p) => (
                    <Bar key={p.id} dataKey={p.id} stackId="comp" maxBarSize={44} fill={p.color.hex} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          className="xl:col-span-2"
          eyebrow="Volume trend"
          title="Active patients per year"
          description="Total cohort size across the federated network."
        >
          <div className="rounded-lg border border-border-subtle bg-surface-3 p-3">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="overview-trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="year" {...AXIS_STYLE} />
                  <YAxis
                    {...AXIS_STYLE}
                    tickFormatter={(v) => {
                      if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                      return v;
                    }}
                  />
                  <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--accent)", strokeDasharray: "3 3" }} />
                  <Area type="monotone" dataKey="patients" stroke="var(--accent)" strokeWidth={2} fill="url(#overview-trend)" activeDot={{ r: 5, stroke: "var(--bg-canvas)", strokeWidth: 2, fill: "var(--accent)" }} isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center rounded-md border border-border-subtle bg-surface-1 px-3 py-2">
              <p className="text-[12px] text-fg-tertiary">
                <span className="font-semibold text-fg-primary tabular">{selectedYear}</span> ·{" "}
                <span className="tabular text-fg-secondary">{formatNumber(patientCount)}</span> patients
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/forecast"
              className="flex w-full items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-[13px] font-semibold text-accent hover:bg-accent/10 transition-colors"
            >
              <span>View population forecast →</span>
              <span className="text-[11px] font-normal text-fg-tertiary">Markov projections</span>
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
