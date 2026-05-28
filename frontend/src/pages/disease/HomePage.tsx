import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, Database, Target, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/disease/ui/StatCard";
import { StatusBadge } from "@/components/disease/ui/StatusBadge";
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

function QuickLink({ to, label, description }: { to: string; label: string; description: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-3 transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-3)]"
    >
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]" />
    </Link>
  );
}

export function HomePage() {
  const data = useDashboardBundle();
  const s = data.productRiskSummary;

  const bands = useMemo(
    () =>
      [...data.riskBands].sort(
        (a, b) => BAND_ORDER.indexOf(a.risk_band as Band) - BAND_ORDER.indexOf(b.risk_band as Band),
      ),
    [data.riskBands],
  );

  const veryHigh = bands.find((b) => b.risk_band === "very_high");
  const high = bands.find((b) => b.risk_band === "high");
  const highPlusCount = (veryHigh?.patient_count ?? 0) + (high?.patient_count ?? 0);
  const highPlusPct = (veryHigh?.patient_percent ?? 0) + (high?.patient_percent ?? 0);
  const highPlusCases = (veryHigh?.observed_positive_count ?? 0) + (high?.observed_positive_count ?? 0);
  const highPlusCasesPct = (
    ((highPlusCases / s.total_observed_positives) * 100)
  ).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[var(--border-accent)] bg-[var(--accent-softer)] px-3 py-0.5 text-xs font-semibold text-[var(--accent)]">
              HELIX CareRisk
            </span>
            <span className="text-xs text-[var(--text-muted)]">UC1 · Broad Diabetes Onset Prediction</span>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Population Risk Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Calibrated diabetes onset risk across the full patient cohort · Enhanced Clinical LightGBM · Sigmoid calibrated · v1
          </p>
        </div>
        <StatusBadge tone="warning" label="For planning use only — not for direct clinical action" />
      </div>

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Patients scored"
          value={formatInt(s.total_patients_scored)}
          hint={`Scored ${s.scoring_date}`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="High + Very High risk"
          value={formatInt(highPlusCount)}
          hint={`${highPlusPct.toFixed(0)}% of population · ${highPlusCasesPct}% of confirmed cases`}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          label="Confirmed cases in cohort"
          value={formatInt(s.total_observed_positives)}
          hint={`${(s.overall_positive_rate * 100).toFixed(2)}% population prevalence`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Last scored"
          value={s.scoring_date}
          hint="Enhanced Clinical LightGBM · Sigmoid calibrated"
          icon={<Calendar className="h-5 w-5" />}
        />
      </section>

      {/* Risk band population bar */}
      <section className="surface-panel p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Risk band population split</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {formatInt(s.total_patients_scored)} patients across five calibrated risk bands
            </p>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="flex h-10 w-full overflow-hidden rounded-xl">
          {bands.map((b) => (
            <div
              key={b.risk_band}
              style={{ width: `${b.patient_percent}%`, backgroundColor: BAND_COLOR[b.risk_band as Band] }}
              title={`${BAND_LABEL[b.risk_band as Band]}: ${b.patient_percent.toFixed(0)}%`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {bands.map((b) => (
            <div key={b.risk_band} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: BAND_COLOR[b.risk_band as Band] }}
                />
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {BAND_LABEL[b.risk_band as Band]}
                </span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] tabular-nums">{formatInt(b.patient_count)} pts</p>
              <p className="text-[10px] text-[var(--text-muted)]">{b.patient_percent.toFixed(0)}% of cohort</p>
              <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
                {formatInt(b.observed_positive_count)} cases
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Action spotlight + model info */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Spotlight */}
        <div className="surface-panel p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Where to focus</h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">Top priority based on enrichment and case capture</p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--accent-softer)] p-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Very High band — 9.3× population rate</p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              The top 5% of patients ({formatInt(veryHigh?.patient_count ?? 0)} individuals) carry{" "}
              <strong>{veryHigh?.observed_positive_rate !== undefined ? (veryHigh.observed_positive_rate * 100).toFixed(1) : "—"}%</strong>{" "}
              diabetes onset rate — nearly 10× the population average. Reviewing this group captures{" "}
              <strong>{veryHigh?.captured_positive_percent.toFixed(1)}%</strong> of all confirmed cases.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Recommended starting point
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              For teams reviewing <strong>~58K patients</strong> (top 1%), expect 1 confirmed case every 15 reviews
              with 21% recall. Scaling to top 5% captures 47% of all cases.
            </p>
          </div>
        </div>

        {/* Band action guide */}
        <div className="surface-panel p-6 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recommended actions by band</h2>
          <p className="text-xs text-[var(--text-muted)]">Clinical guidance for each risk tier</p>
          <div className="space-y-2 mt-2">
            {[...BAND_ORDER].reverse().map((band) => (
              <div
                key={band}
                className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
              >
                <span
                  className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: BAND_COLOR[band] }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{BAND_LABEL[band]}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-tertiary)] leading-snug">
                    {BAND_ACTION[band].summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model & data info */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Model</p>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Algorithm</span>
              <span className="font-medium text-[var(--text-primary)]">LightGBM</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Calibration</span>
              <span className="font-medium text-[var(--text-primary)]">Sigmoid (Platt)</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Version</span>
              <span className="font-medium text-[var(--text-primary)]">{s.model_version}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Disease</span>
              <span className="font-medium text-[var(--text-primary)]">ICD-10 E10–E14</span>
            </div>
          </div>
        </div>

        <div className="surface-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Data</p>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Patients</span>
              <span className="font-medium text-[var(--text-primary)] tabular-nums">
                {formatInt(s.total_patients_scored)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Confirmed cases</span>
              <span className="font-medium text-[var(--text-primary)] tabular-nums">
                {formatInt(s.total_observed_positives)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Prevalence</span>
              <span className="font-medium text-[var(--text-primary)] tabular-nums">
                {(s.overall_positive_rate * 100).toFixed(3)}%
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Scored</span>
              <span className="font-medium text-[var(--text-primary)]">{s.scoring_date}</span>
            </div>
          </div>
        </div>

        <div className="surface-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-[var(--info)]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Next steps</p>
          </div>
          <div className="space-y-2">
            <QuickLink to="/patients" label="Patient Explorer" description="Look up patients and see risk details" />
            <QuickLink to="/intervention" label="Intervention Planner" description="Plan outreach based on team capacity" />
            <QuickLink to="/analytics" label="Population Analytics" description="Explore risk drivers and distribution" />
          </div>
        </div>
      </div>

      {/* Privacy notice */}
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-subtle)] pt-4">
        {s.privacy_note} · Aggregate data only — no patient identifiers present in this dashboard.
      </p>
    </div>
  );
}
