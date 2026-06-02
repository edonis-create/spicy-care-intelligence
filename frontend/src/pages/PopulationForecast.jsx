import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Info, TrendingUp } from "lucide-react";
import { getApiErrorMessage, getForecast, getSummary } from "../api";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { StatusBanner } from "../components/StatusBanner";
import { Chip } from "../components/ui/Chip";
import { SectionCard } from "../components/ui/SectionCard";
import { FilterControl } from "../components/ui/FilterControl";
import { PremiumDropdown } from "../components/ui/PremiumDropdown";
import { AXIS_STYLE, ChartTooltip, GRID_STYLE } from "../components/ui/ChartTooltip";
import { PHENOTYPE_BY_ID, PHENOTYPES } from "../constants/phenotypes";
import { useYear } from "../context/yearContext";

const HORIZON_OPTIONS = [
  { value: 1, label: "1 year ahead" },
  { value: 2, label: "2 years ahead" },
  { value: 3, label: "3 years ahead" },
  { value: 5, label: "5 years ahead" },
];

function formatPct(v) {
  return `${Number(v || 0).toFixed(1)}%`;
}

function ForecastTooltip({ active, payload, label }) {
  return (
    <ChartTooltip
      active={active}
      payload={payload}
      label={label}
      render={(items) => (
        <>
          {items.map((entry) => (
            <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
              <span style={{ flex: 1, color: "var(--text-secondary)" }}>
                {PHENOTYPE_BY_ID[entry.name]?.name || entry.name}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-primary)", fontWeight: 600 }}>
                {formatPct(entry.value)}
              </span>
            </div>
          ))}
        </>
      )}
    />
  );
}

function P5TrendTooltip({ active, payload, label }) {
  return (
    <ChartTooltip
      active={active}
      payload={payload}
      label={label}
      render={(items) =>
        items.map((entry) => (
          <div key={entry.name} style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
            Highest Acuity:{" "}
            <span style={{ color: entry.color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatPct(entry.value)}
            </span>{" "}
            of cohort
          </div>
        ))
      }
    />
  );
}

/** A simple delta badge */
function Delta({ current, projected, label }) {
  const diff = projected - current;
  const color = diff > 1 ? "#e11d48" : diff > 0.2 ? "#d97706" : diff < -0.5 ? "#059669" : "#64748b";
  return (
    <div className="flex items-center justify-between rounded-lg border border-border-default bg-surface-1 px-4 py-3 shadow-xs">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">{label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[1.5rem] font-semibold leading-none tracking-[-0.03em] text-fg-primary tabular">
            {formatPct(projected)}
          </span>
          <span className="text-[12px] font-semibold" style={{ color }}>
            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}pp
          </span>
        </div>
        <p className="mt-0.5 text-[11.5px] text-fg-tertiary">from {formatPct(current)} today</p>
      </div>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-bold"
        style={{ color, backgroundColor: `${color}18` }}
      >
        {diff >= 0 ? "▲" : "▼"}
      </div>
    </div>
  );
}

export function PopulationForecast() {
  const { years, selectedYear } = useYear();
  const [horizon, setHorizon] = useState(3);
  const [forecast, setForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Use the latest available year as forecast anchor
  const fromYear = useMemo(() => (years.length ? Math.max(...years) : selectedYear), [years, selectedYear]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getForecast(fromYear, horizon)
      .then((data) => {
        if (mounted) {
          setForecast(data);
          setError("");
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(getApiErrorMessage(err, "Unable to load population forecast."));
          setIsLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [fromYear, horizon]);

  const phenotypeOrder = PHENOTYPES;

  /** Combined chart: base year + projected years */
  const compositionData = useMemo(() => {
    if (!forecast) return [];
    const rows = [];
    // Base year
    const baseRow = { year: String(fromYear), isProjected: false };
    phenotypeOrder.forEach((p) => {
      baseRow[p.id] = Number(forecast.base_distribution[p.id] || 0);
    });
    rows.push(baseRow);
    // Projected years
    (forecast.projected || []).forEach((proj) => {
      const row = { year: `${proj.year}★`, isProjected: true };
      phenotypeOrder.forEach((p) => {
        row[p.id] = Number(proj.distribution[p.id] || 0);
      });
      rows.push(row);
    });
    return rows;
  }, [forecast, fromYear, phenotypeOrder]);

  /** P5 trend for focused line chart */
  const p5TrendData = useMemo(() => {
    if (!forecast) return [];
    const base = { year: String(fromYear), p5: Number(forecast.base_distribution.P5 || 0), isProjected: false };
    const projected = (forecast.projected || []).map((proj) => ({
      year: `${proj.year}★`,
      p5: Number(proj.distribution.P5 || 0),
      isProjected: true,
    }));
    return [base, ...projected];
  }, [forecast, fromYear]);

  const baseP5 = forecast ? Number(forecast.base_distribution.P5 || 0) : 0;
  const lastProjected = forecast?.projected?.[forecast.projected.length - 1];
  const projP5 = lastProjected ? Number(lastProjected.distribution.P5 || 0) : 0;
  const projP1 = lastProjected ? Number(lastProjected.distribution.P1 || 0) : 0;
  const baseP1 = forecast ? Number(forecast.base_distribution.P1 || 0) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Population Forecast"
        description="Markov chain projections — where your patient population is heading if current trends continue."
        meta={
          <>
            <Chip tone="accent" size="md">From {fromYear}</Chip>
            <Chip size="md">+{horizon} yr{horizon > 1 ? "s" : ""} ahead</Chip>
          </>
        }
      />

      {/* ── Methodology note ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-500/25 bg-blue-500/10 p-4 text-[12.5px] text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <p>
          Projections use a <strong>Markov chain model</strong> built from year-on-year patient transition
          probabilities. The model assumes current transition rates remain stable — actual outcomes will differ
          if care practices or patient mix change. Use for planning and trend awareness, not clinical decisions.
        </p>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <SectionCard eyebrow="Configuration" title="Forecast settings" density="tight">
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterControl label="Anchor year">
            <div className="flex h-10 items-center rounded-md border border-border-default bg-surface-1 px-3 text-[13px] text-fg-secondary shadow-xs">
              {fromYear} (latest available)
            </div>
          </FilterControl>
          <FilterControl label="Projection horizon">
            <PremiumDropdown
              value={horizon}
              onChange={(v) => setHorizon(Number(v))}
              options={HORIZON_OPTIONS}
              listAriaLabel="Select forecast horizon"
            />
          </FilterControl>
        </div>
      </SectionCard>

      {isLoading && (
        <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-1 p-3.5 text-[13px] text-fg-tertiary shadow-xs">
          <Spinner /> Computing Markov projection…
        </div>
      )}
      {error && <StatusBanner tone="error" message={error} />}
      {!error && forecast?.status?.state === "warning" && (
        <StatusBanner tone="warning" message={forecast.status.message} />
      )}

      {!isLoading && forecast && (
        <>
          {/* ── Key projections ─────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Delta label="Highest Acuity (Tier 5)" current={baseP5} projected={projP5} />
            <Delta label="Minimal Burden (Tier 1)" current={baseP1} projected={projP1} />
            {(forecast.projected || []).slice(-1).map((proj) =>
              ["P3", "P4"].map((id) => (
                <Delta
                  key={id}
                  label={PHENOTYPE_BY_ID[id]?.name || id}
                  current={Number(forecast.base_distribution[id] || 0)}
                  projected={Number(proj.distribution[id] || 0)}
                />
              ))
            )}
          </div>

          {/* ── P5 escalation alert ──────────────────────────────────────── */}
          {projP5 - baseP5 > 1 && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="text-[13px] font-semibold text-red-300">Highest Acuity population growth projected</p>
                <p className="mt-0.5 text-[12.5px] text-red-400">
                  Tier 5 (Highest Acuity) patients are projected to grow from{" "}
                  <strong>{formatPct(baseP5)}</strong> to <strong>{formatPct(projP5)}</strong> over {horizon}{" "}
                  year{horizon > 1 ? "s" : ""} — a{" "}
                  <strong>+{(projP5 - baseP5).toFixed(1)} percentage point</strong> increase.
                  Consider targeted intervention programs for Tier 4 patients to slow this escalation.
                </p>
              </div>
            </div>
          )}

          {/* ── Composition chart ────────────────────────────────────────── */}
          <SectionCard
            eyebrow="Distribution projection"
            title="Risk tier composition — actual vs. projected"
            description={`Solid bars = ${fromYear} actual. Hatched bars = projected years. Each bar sums to 100%.`}
          >
            <div className="rounded-lg border border-border-subtle bg-surface-3 p-3">
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compositionData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barCategoryGap="22%">
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis
                      dataKey="year"
                      {...AXIS_STYLE}
                      tickFormatter={(v) => v}
                    />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...AXIS_STYLE} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} content={<ForecastTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ color: "var(--text-tertiary)", fontSize: 12, paddingTop: 8 }}
                      formatter={(value) => (
                        <span style={{ color: "var(--text-secondary)", marginRight: 4 }}>
                          {PHENOTYPE_BY_ID[value]?.name || value}
                        </span>
                      )}
                    />
                    {phenotypeOrder.map((p) => (
                      <Bar key={p.id} dataKey={p.id} stackId="comp" maxBarSize={52} radius={[0, 0, 0, 0]}>
                        {compositionData.map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={p.color.hex}
                            fillOpacity={entry.isProjected ? 0.55 : 1}
                          />
                        ))}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-center text-[11px] text-fg-quaternary">★ = projected year</p>
            </div>
          </SectionCard>

          {/* ── P5 focused trend ─────────────────────────────────────────── */}
          <SectionCard
            eyebrow="Highest acuity focus"
            title="Tier 5 — Highest Acuity trajectory"
            description="Track the most resource-intensive patient group over time."
            action={
              <Chip tone="ghost" size="md" leadingIcon={TrendingUp}>
                {projP5 > baseP5 ? "Growing" : "Stable"}
              </Chip>
            }
          >
            <div className="rounded-lg border border-border-subtle bg-surface-3 p-3">
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={p5TrendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="p5-forecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="year" {...AXIS_STYLE} />
                    <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} {...AXIS_STYLE} domain={["auto", "auto"]} />
                    <Tooltip content={<P5TrendTooltip />} cursor={{ stroke: "#7C3AED", strokeDasharray: "3 3" }} />
                    <Area
                      type="monotone"
                      dataKey="p5"
                      stroke="#7C3AED"
                      strokeWidth={2}
                      fill="url(#p5-forecast)"
                      activeDot={{ r: 5, stroke: "var(--bg-canvas)", strokeWidth: 2, fill: "#7C3AED" }}
                      isAnimationActive
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Year-by-year breakdown table */}
            <div className="mt-4 overflow-hidden rounded-lg border border-border-default">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-3">
                    <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">Year</th>
                    {phenotypeOrder.map((p) => (
                      <th key={p.id} className="px-4 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: p.color.hex }}>
                        {p.id}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Base year */}
                  <tr className="border-b border-border-subtle bg-surface-1">
                    <td className="px-4 py-3 font-semibold text-fg-primary">{fromYear}</td>
                    {phenotypeOrder.map((p) => (
                      <td key={p.id} className="px-4 py-3 text-right tabular text-fg-secondary">
                        {formatPct(forecast.base_distribution[p.id] || 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300">Actual</span>
                    </td>
                  </tr>
                  {(forecast.projected || []).map((proj) => (
                    <tr key={proj.year} className="border-b border-border-subtle last:border-0 hover:bg-surface-3 transition-colors">
                      <td className="px-4 py-3 font-semibold text-fg-primary">{proj.year}</td>
                      {phenotypeOrder.map((p) => {
                        const val = Number(proj.distribution[p.id] || 0);
                        const base = Number(forecast.base_distribution[p.id] || 0);
                        const diff = val - base;
                        return (
                          <td key={p.id} className="px-4 py-3 text-right tabular">
                            <span className="text-fg-primary">{formatPct(val)}</span>
                            {Math.abs(diff) > 0.05 && (
                              <span className={`ml-1 text-[10.5px] ${diff > 0 && p.id === "P5" ? "text-red-500" : diff > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                                ({diff > 0 ? "+" : ""}{diff.toFixed(1)})
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">Forecast</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
