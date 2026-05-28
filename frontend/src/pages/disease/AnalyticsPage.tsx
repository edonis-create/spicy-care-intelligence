import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/disease/charts/ChartCard";
import { PageHeader } from "@/components/disease/ui/PageHeader";
import { chartAxisColor, chartColors, chartGridStroke, chartTooltipProps } from "@/charts/disease/chartTheme";
import { useTheme } from "@/context/disease/AppProviders";
import { useDashboardBundle } from "@/routes/DiseaseDashboardLayout";
import { formatInt } from "@/lib/disease/format";

const BAND_ORDER = ["very_low", "low", "moderate", "high", "very_high"] as const;
type Band = (typeof BAND_ORDER)[number];

const BAND_LABEL: Record<Band, string> = {
  very_low: "Very Low",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  very_high: "Very High",
};

const BAND_COLOR: Record<Band, string> = {
  very_low: "#34d399",
  low: "#84cc16",
  moderate: "#f5b45c",
  high: "#f97316",
  very_high: "#f87171",
};

const GROUP_COLOR: Record<string, string> = {
  "Demographics": "#7aa2f7",
  "Medication burden": "#f87171",
  "Utilization / clinical history": "#f5b45c",
  "Diagnosis history": "#a78bfa",
  "Comorbidity flags": "#34d399",
};

function groupColor(group: string): string {
  return GROUP_COLOR[group] ?? chartColors.primary;
}

const FEATURE_LABEL: Record<string, string> = {
  atc_C_flag: "Cardiovascular medication use",
  age_at_index: "Patient age",
  total_dot: "Total treatment days",
  prescription_count_last_12_months: "Recent prescriptions (12 mo)",
  unique_atc_groups: "Unique medication classes",
  total_diag_count: "Total diagnosis count",
  contacts_last_12_months: "Healthcare contacts (12 mo)",
  hypertension_flag: "Hypertension history",
  obesity_flag: "Obesity history",
  cardiovascular_flag: "Cardiovascular history",
  lipid_disorder_flag: "Lipid disorder history",
  kidney_disease_flag: "Kidney disease history",
  mental_health_flag: "Mental health history",
  antihypertensive_flag: "Antihypertensive medication",
  lipid_lowering_flag: "Lipid-lowering medication",
  unique_diagnoses_count: "Unique diagnoses",
};

function featureLabel(feature: string): string {
  return FEATURE_LABEL[feature] ?? feature.replaceAll("_", " ");
}

const COMORBIDITY_FIELDS: { key: string; label: string }[] = [
  { key: "hypertension", label: "Hypertension" },
  { key: "obesity", label: "Obesity" },
  { key: "cardiovascular", label: "Cardiovascular" },
  { key: "lipid_disorder", label: "Lipid disorder" },
  { key: "kidney_disease", label: "Kidney disease" },
  { key: "mental_health", label: "Mental health" },
];

const TOP_K_LABEL: Record<string, string> = {
  top_1_percent: "Top 1%",
  top_2_percent: "Top 2%",
  top_5_percent: "Top 5%",
  top_10_percent: "Top 10%",
  top_20_percent: "Top 20%",
};

function bandAlpha(pct: number): string {
  const a = Math.round(0x22 + (pct / 100) * 0xaa);
  return a.toString(16).padStart(2, "0");
}

export function AnalyticsPage() {
  const data = useDashboardBundle();
  const { theme: t } = useTheme();
  const s = data.productRiskSummary;
  const [selectedPct, setSelectedPct] = useState("top_5_percent");

  const bands = useMemo(
    () =>
      [...data.riskBands].sort(
        (a, b) => BAND_ORDER.indexOf(a.risk_band as Band) - BAND_ORDER.indexOf(b.risk_band as Band),
      ),
    [data.riskBands],
  );

  const bandPopData = bands.map((b) => ({
    band: BAND_LABEL[b.risk_band as Band] ?? b.risk_band,
    patients: b.patient_count,
    fill: BAND_COLOR[b.risk_band as Band] ?? "#888",
  }));

  const enrichmentData = bands.map((b) => ({
    band: BAND_LABEL[b.risk_band as Band] ?? b.risk_band,
    enrichment: +b.risk_enrichment_vs_population.toFixed(2),
    casePct: +b.captured_positive_percent.toFixed(1),
    fill: BAND_COLOR[b.risk_band as Band] ?? "#888",
  }));

  const distData = useMemo(
    () =>
      data.riskScoreDistribution.map((r) => ({
        label: r.bin_label,
        patients: r.patient_count,
      })),
    [data.riskScoreDistribution],
  );

  const topFeatures = useMemo(
    () =>
      [...data.featureImportance]
        .sort((a, b) => +a.rank_gain - +b.rank_gain)
        .slice(0, 12)
        .map((r) => ({
          label: featureLabel(r.feature),
          gain: +r.importance_gain,
          group: r.product_group,
          fill: groupColor(r.product_group),
        }))
        .reverse(),
    [data.featureImportance],
  );

  const maxGain = topFeatures[topFeatures.length - 1]?.gain ?? 1;

  // ── 1. Cumulative lift curve ───────────────────────────────────────────────
  const liftData = useMemo(() => {
    const sorted = [...data.topKIntervention].sort(
      (a, b) => a.selected_patient_percent - b.selected_patient_percent,
    );
    return [
      { pct: 0, actual: 0, random: 0 },
      ...sorted.map((r) => ({
        pct: r.selected_patient_percent,
        actual: +r.captured_positive_percent.toFixed(1),
        random: +r.selected_patient_percent.toFixed(1),
      })),
      { pct: 100, actual: 100, random: 100 },
    ];
  }, [data.topKIntervention]);

  // ── 2. Percentile explorer ────────────────────────────────────────────────
  const explorerRow = useMemo(
    () => data.topKIntervention.find((r) => r.top_k_group === selectedPct) ?? data.topKIntervention[0],
    [data.topKIntervention, selectedPct],
  );

  // ── 3. Comorbidity profile by band (from demo sample) ────────────────────
  const comorbidityRows = useMemo(() => {
    return COMORBIDITY_FIELDS.map((field) => {
      const row: Record<string, string | number> = { comorbidity: field.label };
      BAND_ORDER.forEach((band) => {
        const pts = data.demoPatients.filter((p) => p.risk_band === band);
        const n = pts.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row[band] = n > 0 ? Math.round((pts.filter((p) => !!(p as any)[field.key]).length / n) * 100) : 0;
      });
      return row;
    });
  }, [data.demoPatients]);

  // ── 4. Demographics by band ───────────────────────────────────────────────
  const demographicsRows = useMemo(() => {
    return BAND_ORDER.map((band) => {
      const pts = data.demoPatients.filter((p) => p.risk_band === band);
      const n = pts.length;
      const meanAge = n > 0 ? Math.round(pts.reduce((s, p) => s + (p.age ?? 0), 0) / n) : 0;
      const malePct = n > 0 ? Math.round((pts.filter((p) => p.sex === "Male").length / n) * 100) : 0;
      const femalePct = n > 0 ? Math.round((pts.filter((p) => p.sex === "Female").length / n) * 100) : 0;
      return { band, label: BAND_LABEL[band], meanAge, malePct, femalePct, n };
    });
  }, [data.demoPatients]);

  // ── 5. Calibration check ──────────────────────────────────────────────────
  const calibrationRows = useMemo(() => {
    return bands.map((b) => {
      const predicted = b.mean_calibrated_risk ?? null;
      const observed = b.observed_positive_rate;
      const ratio = predicted !== null && observed > 0 ? +(predicted / observed).toFixed(2) : null;
      return {
        band: BAND_LABEL[b.risk_band as Band] ?? b.risk_band,
        predictedPct: predicted !== null ? +(predicted * 100).toFixed(2) : null,
        observedPct: +(observed * 100).toFixed(2),
        ratio,
        fill: BAND_COLOR[b.risk_band as Band] ?? "#888",
      };
    });
  }, [bands]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Population Analytics"
        description={`Aggregate risk distribution, enrichment and key risk drivers across ${formatInt(s.total_patients_scored)} patients scored on ${s.scoring_date}.`}
      />

      {/* ── Cumulative case capture (lift curve) ───────────────────────────── */}
      <ChartCard
        title="Cumulative case capture curve"
        subtitle="Contacting patients from highest to lowest risk — what % of all diabetes cases are captured? Model (solid) vs random selection (dashed)."
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={liftData} margin={{ top: 12, right: 24, left: 0, bottom: 20 }}>
            <CartesianGrid stroke={chartGridStroke(t)} />
            <XAxis
              dataKey="pct"
              tick={{ fill: chartAxisColor(t), fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
              label={{ value: "% of population contacted (highest risk first)", position: "insideBottom", offset: -12, fill: chartAxisColor(t), fontSize: 10 }}
            />
            <YAxis
              tick={{ fill: chartAxisColor(t), fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
              label={{ value: "% of cases captured", angle: -90, position: "insideLeft", offset: 8, fill: chartAxisColor(t), fontSize: 10 }}
            />
            <Tooltip
              {...chartTooltipProps(t)}
              formatter={(v: number, name: string) => [
                `${v}%`,
                name === "actual" ? "Model — cases captured" : "Random baseline",
              ]}
              labelFormatter={(v: number) => `Top ${v}% of patients contacted`}
            />
            <ReferenceLine
              x={5}
              stroke="#f87171"
              strokeDasharray="3 3"
              label={{ value: "Top 5% → 46.6% of cases", position: "top", fill: "#f87171", fontSize: 9 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={chartColors.primary}
              strokeWidth={2.5}
              dot={{ r: 4, fill: chartColors.primary, strokeWidth: 0 }}
              name="actual"
            />
            <Line
              type="monotone"
              dataKey="random"
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              name="random"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Percentile explorer ────────────────────────────────────────────── */}
      <section className="surface-panel p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Percentile explorer</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Select a population cut-off to see how many patients and cases fall within it
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {data.topKIntervention.map((r) => (
            <button
              key={r.top_k_group}
              onClick={() => setSelectedPct(r.top_k_group)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                selectedPct === r.top_k_group
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--surface-4,var(--surface-3))]"
              }`}
            >
              {TOP_K_LABEL[r.top_k_group] ?? r.top_k_group}
            </button>
          ))}
        </div>

        {explorerRow && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[var(--surface-3)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Patients selected</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {formatInt(explorerRow.selected_patient_count)}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{explorerRow.selected_patient_percent}% of population</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-3)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Cases captured</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {explorerRow.captured_positive_percent.toFixed(1)}%
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{formatInt(explorerRow.observed_positive_count)} confirmed</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-3)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Contacts per case found</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {explorerRow.number_needed_to_review !== null
                  ? explorerRow.number_needed_to_review.toFixed(0)
                  : "—"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">1 in {explorerRow.number_needed_to_review?.toFixed(0) ?? "—"} finds a case</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-3)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Enrichment vs average</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {explorerRow.risk_enrichment_vs_population.toFixed(1)}×
              </p>
              <p className="text-xs text-[var(--text-secondary)]">more likely than population</p>
            </div>
          </div>
        )}
      </section>

      {/* ── Population by band ─────────────────────────────────────────────── */}
      <ChartCard
        title="Population by risk band"
        subtitle="Number of patients in each risk tier — total cohort"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={bandPopData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke(t)} />
            <XAxis dataKey="band" tick={{ fill: chartAxisColor(t), fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: chartAxisColor(t), fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
            />
            <Tooltip
              {...chartTooltipProps(t)}
              formatter={(v: number) => [formatInt(v), "Patients"]}
            />
            <Bar dataKey="patients" name="patients" radius={[4, 4, 0, 0]}>
              {bandPopData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Enrichment + case capture ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Risk enrichment vs population"
          subtitle="How many times more likely to have diabetes than population average (1.0 = average)"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={enrichmentData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGridStroke(t)} />
              <XAxis dataKey="band" tick={{ fill: chartAxisColor(t), fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: chartAxisColor(t), fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}×`}
              />
              <Tooltip
                {...chartTooltipProps(t)}
                formatter={(v: number) => [`${v}×`, "Enrichment"]}
              />
              <Bar dataKey="enrichment" radius={[4, 4, 0, 0]}>
                {enrichmentData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Confirmed case capture by band"
          subtitle="% of all confirmed diabetes cases captured within each risk band"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[...enrichmentData].reverse()}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke={chartGridStroke(t)} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: chartAxisColor(t), fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="band"
                tick={{ fill: chartAxisColor(t), fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                {...chartTooltipProps(t)}
                formatter={(v: number) => [`${v}%`, "Cases captured"]}
              />
              <Bar dataKey="casePct" radius={[0, 4, 4, 0]}>
                {[...enrichmentData].reverse().map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Comorbidity profile by band ────────────────────────────────────── */}
      <section className="surface-panel p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Comorbidity profile by risk band</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            % of patients in each band with each condition — based on {data.demoPatients.length}-patient representative sample. Darker cells indicate higher prevalence.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium text-[var(--text-muted)] pb-3 pr-6">Condition</th>
                {BAND_ORDER.map((b) => (
                  <th key={b} className="text-center font-semibold pb-3 px-3" style={{ color: BAND_COLOR[b] }}>
                    {BAND_LABEL[b]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {comorbidityRows.map((row) => (
                <tr key={row.comorbidity as string}>
                  <td className="py-2.5 pr-6 font-medium text-[var(--text-secondary)]">{row.comorbidity}</td>
                  {BAND_ORDER.map((b) => {
                    const pct = row[b] as number;
                    return (
                      <td key={b} className="py-2.5 px-3 text-center">
                        <span
                          className="inline-block rounded px-2.5 py-0.5 font-semibold tabular-nums"
                          style={{
                            backgroundColor: BAND_COLOR[b] + bandAlpha(pct),
                            color: pct > 55 ? "#111827" : BAND_COLOR[b],
                          }}
                        >
                          {pct}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Demographics by band ───────────────────────────────────────────── */}
      <section className="surface-panel p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Patient demographics by risk band</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Age and sex distribution across risk tiers — from {data.demoPatients.length}-patient representative sample
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--text-muted)]">
                <th className="font-medium pb-3 pr-4">Band</th>
                <th className="font-medium pb-3 px-4 text-center">Sample</th>
                <th className="font-medium pb-3 px-4 text-center">Mean age</th>
                <th className="font-medium pb-3 px-4">Sex split</th>
                <th className="font-medium pb-3 pl-4 text-right">M / F</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {demographicsRows.map((row) => (
                <tr key={row.band}>
                  <td className="py-3 pr-4">
                    <span className="font-semibold" style={{ color: BAND_COLOR[row.band as Band] }}>
                      {row.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-[var(--text-muted)]">n={row.n}</td>
                  <td className="py-3 px-4 text-center font-bold text-[var(--text-primary)]">{row.meanAge} yrs</td>
                  <td className="py-3 px-4 w-48">
                    <div className="flex h-4 rounded-full overflow-hidden text-[9px] font-semibold">
                      <div
                        className="flex items-center justify-center text-white transition-all"
                        style={{ width: `${row.malePct}%`, backgroundColor: "#7aa2f7" }}
                      >
                        {row.malePct > 18 ? `${row.malePct}%` : ""}
                      </div>
                      <div
                        className="flex items-center justify-center text-white transition-all"
                        style={{ width: `${row.femalePct}%`, backgroundColor: "#f472b6" }}
                      >
                        {row.femalePct > 18 ? `${row.femalePct}%` : ""}
                      </div>
                      <div className="flex-1 bg-[var(--surface-3)]" />
                    </div>
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                    <span style={{ color: "#7aa2f7" }}>{row.malePct}%</span>
                    {" / "}
                    <span style={{ color: "#f472b6" }}>{row.femalePct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex gap-4 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#7aa2f7]" /> Male</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f472b6]" /> Female</span>
          </div>
        </div>
      </section>

      {/* ── Calibration quality check ──────────────────────────────────────── */}
      <section className="surface-panel p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Calibration quality by band</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Mean predicted risk vs observed diabetes rate per band. Ratio near 1.0 = well calibrated. Required for governance sign-off.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--text-muted)]">
                <th className="font-medium pb-3 pr-4">Band</th>
                <th className="font-medium pb-3 px-4 text-right">Mean predicted</th>
                <th className="font-medium pb-3 px-4 text-right">Observed rate</th>
                <th className="font-medium pb-3 px-4 text-center">Ratio</th>
                <th className="font-medium pb-3 pl-4">Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {calibrationRows.map((row) => {
                const r = row.ratio;
                const label =
                  r === null ? "N/A"
                  : r < 0.7 ? "Under-predicts"
                  : r > 1.4 ? "Over-predicts"
                  : r < 0.85 || r > 1.15 ? "Slight drift"
                  : "Well calibrated";
                const color =
                  r === null ? "var(--text-muted)"
                  : r < 0.7 || r > 1.4 ? "#f87171"
                  : r < 0.85 || r > 1.15 ? "#f5b45c"
                  : "#34d399";
                return (
                  <tr key={row.band}>
                    <td className="py-2.5 pr-4 font-semibold" style={{ color: row.fill }}>{row.band}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-[var(--text-secondary)]">
                      {row.predictedPct !== null ? `${row.predictedPct}%` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-[var(--text-secondary)]">
                      {row.observedPct}%
                    </td>
                    <td className="py-2.5 px-4 text-center tabular-nums font-bold" style={{ color }}>
                      {r !== null ? r.toFixed(2) : "—"}
                    </td>
                    <td className="py-2.5 pl-4 font-medium" style={{ color }}>
                      {label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-3">
          Calibration verification on the target deployment population is required before clinical use. These figures are from the training/scoring population only.
        </p>
      </section>

      {/* ── Score distribution ─────────────────────────────────────────────── */}
      <ChartCard
        title="Calibrated risk score distribution"
        subtitle="Patient count per risk score bin — shows the population skew towards low baseline risk"
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={distData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke(t)} />
            <XAxis
              dataKey="label"
              tick={{ fill: chartAxisColor(t), fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: chartAxisColor(t), fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
            />
            <Tooltip
              {...chartTooltipProps(t)}
              formatter={(v: number) => [formatInt(v), "Patients"]}
            />
            <Bar dataKey="patients" fill={chartColors.primary} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Feature importance ─────────────────────────────────────────────── */}
      <section className="surface-panel p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Top risk drivers</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Top 12 features by LightGBM gain importance — statistical associations, not causal factors
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {Object.entries(GROUP_COLOR).map(([group, color]) => (
            <span key={group} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              {group}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          {topFeatures.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-52 shrink-0 text-right text-xs text-[var(--text-secondary)] leading-tight">
                {f.label}
              </span>
              <div className="flex-1 h-5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                <div
                  className="h-5 rounded-full transition-all"
                  style={{ width: `${(f.gain / maxGain) * 100}%`, backgroundColor: f.fill, opacity: 0.85 }}
                />
              </div>
              <span className="w-20 text-xs text-[var(--text-muted)] tabular-nums">
                {(f.gain / 1_000_000).toFixed(2)}M gain
              </span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-3">
          Feature importance describes statistical association within this dataset only — it does not imply causality.
          These drivers are intended for aggregate cohort-level understanding, not individual clinical decisions.
        </p>
      </section>
    </div>
  );
}
