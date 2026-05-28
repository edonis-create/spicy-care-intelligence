import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Search,
  Shield,
  X,
} from "lucide-react";
import { ChartCard } from "@/components/disease/charts/ChartCard";
import { PageHeader } from "@/components/disease/ui/PageHeader";
import { StatCard } from "@/components/disease/ui/StatCard";
import { StatusBadge } from "@/components/disease/ui/StatusBadge";
import { chartAxisColor, chartGridStroke, chartTooltipProps } from "@/charts/disease/chartTheme";
import { useTheme } from "@/context/disease/AppProviders";
import { useDashboardBundle } from "@/routes/DiseaseDashboardLayout";
import { formatFixed, formatInt } from "@/lib/disease/format";
import type { DemoPatient, RiskBandRow } from "@/data/disease/types";

// ── Constants ─────────────────────────────────────────────────────────────────

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

const BAND_TONE: Record<Band, "success" | "neutral" | "warning" | "danger" | "info"> = {
  very_low: "success",
  low: "success",
  moderate: "warning",
  high: "danger",
  very_high: "danger",
};

const BAND_ACTION: Record<Band, { summary: string; steps: string[] }> = {
  very_low: {
    summary: "Standard care — no additional screening required.",
    steps: [
      "Continue routine annual health check",
      "No diabetes-specific follow-up needed at this time",
      "Reassess at next annual review",
    ],
  },
  low: {
    summary: "Lifestyle monitoring — flag for health promotion.",
    steps: [
      "Provide lifestyle counselling materials (diet, physical activity)",
      "Schedule annual metabolic review",
      "Assess modifiable risk factors at next contact",
    ],
  },
  moderate: {
    summary: "Enhanced monitoring — consider HbA1c screening.",
    steps: [
      "Order HbA1c screening within 6 months",
      "Structured lifestyle intervention referral",
      "Review current medications for diabetogenic risk",
    ],
  },
  high: {
    summary: "Priority outreach — schedule preventive consultation.",
    steps: [
      "Contact patient for preventive consultation within 3 months",
      "Comprehensive cardiovascular and metabolic risk assessment",
      "Consider referral to diabetes prevention programme",
    ],
  },
  very_high: {
    summary: "Urgent clinical review — contact within 30 days.",
    steps: [
      "Initiate outreach within 30 days",
      "Comprehensive metabolic assessment (HbA1c, fasting glucose, lipids)",
      "Multidisciplinary risk factor management plan",
      "Enrolment in intensive diabetes prevention programme",
    ],
  },
};

function bandColor(band: string): string {
  return BAND_COLOR[band as Band] ?? "var(--text-muted)";
}
function bandLabel(band: string): string {
  return BAND_LABEL[band as Band] ?? band;
}
function bandTone(band: string): "success" | "neutral" | "warning" | "danger" | "info" {
  return BAND_TONE[band as Band] ?? "neutral";
}
function bandAction(band: string): { summary: string; steps: string[] } {
  return BAND_ACTION[band as Band] ?? { summary: "—", steps: [] };
}

function sortedBands(rows: RiskBandRow[]): RiskBandRow[] {
  return [...rows].sort((a, b) => BAND_ORDER.indexOf(a.risk_band as Band) - BAND_ORDER.indexOf(b.risk_band as Band));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskGauge({ score, band }: { score: number; band: string }) {
  const pct = Math.min(score / 0.2, 1) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
          {(score * 100).toFixed(2)}%
        </span>
        <span className="text-sm text-[var(--text-tertiary)]">onset probability</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: bandColor(band) }}
        />
      </div>
    </div>
  );
}

function ComorbidityPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
          : "bg-[var(--surface-3)] text-[var(--text-muted)]"
      }`}
    >
      {active ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
      {label}
    </span>
  );
}

function MedPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? "bg-[var(--accent-softer)] text-[var(--accent)]"
          : "bg-[var(--surface-3)] text-[var(--text-muted)]"
      }`}
    >
      {active ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  );
}

function PatientDetailPanel({ patient, onClose }: { patient: DemoPatient; onClose: () => void }) {
  const action = bandAction(patient.risk_band);
  const topKFlags = [
    { label: "Top 1%", active: patient.top_1_pct },
    { label: "Top 5%", active: patient.top_5_pct },
    { label: "Top 10%", active: patient.top_10_pct },
    { label: "Top 20%", active: patient.top_20_pct },
  ];
  const highestFlag = topKFlags.filter((f) => f.active).at(-1);

  return (
    <div className="surface-panel flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Patient</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">{patient.patient_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={bandTone(patient.risk_band)} label={bandLabel(patient.risk_band)} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Risk gauge */}
      <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
        <RiskGauge score={patient.risk_score} band={patient.risk_band} />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Risk percentile</p>
            <p className="font-semibold text-[var(--text-primary)]">{patient.risk_percentile.toFixed(1)}th</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Risk decile</p>
            <p className="font-semibold text-[var(--text-primary)]">{patient.risk_decile} / 10</p>
          </div>
        </div>
        {highestFlag && (
          <p className="text-xs text-[var(--text-tertiary)]">
            In the <strong>{highestFlag.label}</strong> of the population by predicted onset risk.
          </p>
        )}
      </div>

      {/* Recommended action */}
      <div
        className="rounded-xl border p-4 space-y-2"
        style={{ borderColor: bandColor(patient.risk_band) + "44", backgroundColor: bandColor(patient.risk_band) + "11" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: bandColor(patient.risk_band) }}>
          Recommended action
        </p>
        <p className="text-sm font-medium text-[var(--text-primary)]">{action.summary}</p>
        <ul className="mt-1 space-y-1">
          {action.steps.map((step) => (
            <li key={step} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
              <span className="mt-0.5 text-[var(--text-muted)]">·</span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      {/* Demographics */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Demographics</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Age at index</p>
            <p className="font-medium text-[var(--text-primary)]">{patient.age !== null ? `${patient.age} yrs` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Sex</p>
            <p className="font-medium text-[var(--text-primary)]">{patient.sex}</p>
          </div>
        </div>
      </div>

      {/* Comorbidities */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Comorbidity history</p>
        <div className="flex flex-wrap gap-1.5">
          <ComorbidityPill label="Hypertension" active={patient.hypertension} />
          <ComorbidityPill label="Obesity" active={patient.obesity} />
          <ComorbidityPill label="Cardiovascular" active={patient.cardiovascular} />
          <ComorbidityPill label="Lipid disorder" active={patient.lipid_disorder} />
          <ComorbidityPill label="Kidney disease" active={patient.kidney_disease} />
          <ComorbidityPill label="Mental health" active={patient.mental_health} />
        </div>
      </div>

      {/* Medications */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Medication history</p>
        <div className="flex flex-wrap gap-1.5">
          <MedPill label="Antihypertensive" active={patient.antihypertensive_med} />
          <MedPill label="Lipid-lowering" active={patient.lipid_lowering_med} />
          <MedPill label="Antithrombotic" active={patient.antithrombotic_med} />
        </div>
      </div>

      {/* Utilisation */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Healthcare utilisation</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Contacts", value: patient.healthcare_contacts },
            { label: "Diagnoses", value: patient.unique_diagnoses },
            { label: "Prescriptions", value: patient.prescription_count },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-[var(--surface-2)] px-2 py-2.5">
              <p className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">{formatInt(value)}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Observed outcome */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Observed outcome (demo)</p>
        <div className="mt-1 flex items-center gap-2">
          {patient.observed_onset ? (
            <>
              <AlertCircle className="h-4 w-4 text-[var(--danger)]" />
              <span className="text-sm font-medium text-[var(--danger)]">Diabetes onset recorded in label window</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
              <span className="text-sm font-medium text-[var(--success)]">No onset recorded in label window</span>
            </>
          )}
        </div>
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
          Administrative label only · For planning purposes — not for clinical decision-making.
        </p>
      </div>
    </div>
  );
}

// ── Patient lookup ────────────────────────────────────────────────────────────

function PatientLookup({ patients }: { patients: DemoPatient[] }) {
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"risk_score" | "risk_percentile">("risk_score");
  const [selected, setSelected] = useState<DemoPatient | null>(patients[0] ?? null);

  const filtered = useMemo(() => {
    let rows = patients;
    if (bandFilter !== "all") rows = rows.filter((p) => p.risk_band === bandFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) => p.patient_id.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [patients, search, bandFilter, sortBy]);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1" style={{ minWidth: 180 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search patient ID…"
            className="input-control w-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-control"
          value={bandFilter}
          onChange={(e) => setBandFilter(e.target.value)}
        >
          <option value="all">All bands</option>
          {BAND_ORDER.slice().reverse().map((b) => (
            <option key={b} value={b}>{BAND_LABEL[b]}</option>
          ))}
        </select>
        <select
          className="input-control"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="risk_score">Sort: Risk score</option>
          <option value="risk_percentile">Sort: Percentile</option>
        </select>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        {filtered.length} of {patients.length} patients · Click a row to view full profile
      </p>

      {/* Fixed-height side-by-side layout */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]" style={{ alignItems: "start" }}>
        {/* Scrollable patient list */}
        <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Patients ({filtered.length})
            </p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No patients match.</p>
            ) : (
              filtered.map((p) => {
                const comorbCount = [p.hypertension, p.obesity, p.cardiovascular, p.lipid_disorder, p.kidney_disease, p.mental_health].filter(Boolean).length;
                const isActive = selected?.patient_id === p.patient_id;
                return (
                  <button
                    key={p.patient_id}
                    type="button"
                    onClick={() => setSelected(p)}
                    className={`w-full border-b border-[var(--border-subtle)] px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-[var(--surface-2)] ${
                      isActive ? "bg-[var(--accent-softer)] border-l-2 border-l-[var(--accent)]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {p.patient_id}
                      </span>
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: bandColor(p.risk_band) + "22",
                          color: bandColor(p.risk_band),
                        }}
                      >
                        {bandLabel(p.risk_band)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span className="tabular-nums font-medium text-[var(--text-secondary)]">
                        {(p.risk_score * 100).toFixed(2)}%
                      </span>
                      <span>{p.age !== null ? `${p.age} yrs` : "—"}</span>
                      <span>{p.sex}</span>
                      {comorbCount > 0 && (
                        <span className={comorbCount >= 3 ? "text-[var(--danger)]" : "text-[var(--warning)]"}>
                          {comorbCount} comorb.
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail panel — always visible */}
        <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
          {selected ? (
            <PatientDetailPanel patient={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-muted)]">
              Select a patient from the list
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PatientExplorerPage() {
  const data = useDashboardBundle();
  const { theme: t } = useTheme();

  const bands = useMemo(() => sortedBands(data.riskBands), [data.riskBands]);

  const bandChartData = bands.map((b) => ({
    band: BAND_LABEL[b.risk_band as Band] ?? b.risk_band,
    patients: b.patient_count,
    cases: b.observed_positive_count,
    enrichment: +b.risk_enrichment_vs_population.toFixed(2),
    fill: BAND_COLOR[b.risk_band as Band] ?? "#888",
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Patient Explorer"
        description="Browse risk bands, look up individual patients and see recommended clinical actions. Anonymised demo sample — 200 patients."
      />

      {/* Band summary KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {bands.map((b) => (
          <StatCard
            key={b.risk_band}
            label={BAND_LABEL[b.risk_band as Band] ?? b.risk_band}
            value={
              <span style={{ color: bandColor(b.risk_band) }}>
                {formatInt(b.patient_count)}
              </span>
            }
            hint={`${b.patient_percent.toFixed(0)}% · ${formatInt(b.observed_positive_count)} cases`}
            icon={<Activity className="h-4 w-4" style={{ color: bandColor(b.risk_band) }} />}
          />
        ))}
      </section>

      {/* Band enrichment chart */}
      <ChartCard
        title="Risk enrichment by band"
        subtitle="How much more likely to have diabetes onset vs. population average (1.0 = average)"
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={bandChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke(t)} />
            <XAxis dataKey="band" tick={{ fill: chartAxisColor(t), fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: chartAxisColor(t), fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}×`}
            />
            <Tooltip
              {...chartTooltipProps(t)}
              formatter={(v: number) => [`${v}×`, "Enrichment vs population"]}
            />
            <Bar dataKey="enrichment" radius={[4, 4, 0, 0]}>
              {bandChartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Band detail table */}
      <section className="surface-panel p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Risk band summary</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Full population across all five bands</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {["Band", "Patients", "% Cohort", "Cases", "Case rate", "Enrichment", "Avg risk score", "Action"].map((h) => (
                  <th
                    key={h}
                    className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...bands].reverse().map((b) => {
                const action = bandAction(b.risk_band);
                return (
                  <tr key={b.risk_band} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="py-3 pr-4">
                      <StatusBadge tone={bandTone(b.risk_band)} label={bandLabel(b.risk_band)} />
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-[var(--text-primary)]">
                      {formatInt(b.patient_count)}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-[var(--text-secondary)]">
                      {b.patient_percent.toFixed(0)}%
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-[var(--text-primary)]">
                      {formatInt(b.observed_positive_count)}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-[var(--text-secondary)]">
                      {(b.observed_positive_rate * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="tabular-nums font-semibold"
                        style={{ color: bandColor(b.risk_band) }}
                      >
                        {formatFixed(b.risk_enrichment_vs_population, 2)}×
                      </span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-[var(--text-secondary)]">
                      {b.mean_calibrated_risk !== null
                        ? `${(b.mean_calibrated_risk * 100).toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="py-3 text-xs text-[var(--text-muted)]">{action.summary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Patient lookup */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--success)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Patient risk lookup — demo sample</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          200 anonymised patients (PT-0001 – PT-0200) stratified across risk bands. Click any row to view
          full clinical profile and recommended action.
        </p>
        <PatientLookup patients={data.demoPatients} />
      </section>
    </div>
  );
}
