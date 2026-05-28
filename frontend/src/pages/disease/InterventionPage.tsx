import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  CalendarDays,
  Crosshair,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { ChartCard } from "@/components/disease/charts/ChartCard";
import { GovernanceBanner } from "@/components/disease/ui/GovernanceBanner";
import { PageHeader } from "@/components/disease/ui/PageHeader";
import { StatCard } from "@/components/disease/ui/StatCard";
import { StatusBadge } from "@/components/disease/ui/StatusBadge";
import { chartAxisColor, chartColors, chartGridStroke, chartTooltipProps } from "@/charts/disease/chartTheme";
import { useTheme } from "@/context/disease/AppProviders";
import { useDashboardBundle } from "@/routes/DiseaseDashboardLayout";
import { formatFixed, formatInt } from "@/lib/disease/format";
import type { ThresholdScenarioRow, TopKRow } from "@/data/disease/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_COHORT = 5_840_319;

const TOP_K_LABELS: Record<string, string> = {
  top_1_percent: "Top 1%",
  top_2_percent: "Top 2%",
  top_5_percent: "Top 5%",
  top_10_percent: "Top 10%",
  top_20_percent: "Top 20%",
};

const TOP_K_INTERVENTION: Record<string, { type: string; action: string; timing: string }> = {
  top_1_percent: {
    type: "Urgent clinic referral",
    action: "Comprehensive metabolic assessment — HbA1c, fasting glucose, full lipid panel. Multidisciplinary risk management plan.",
    timing: "Contact within 30 days",
  },
  top_2_percent: {
    type: "Priority GP appointment",
    action: "Structured diabetes prevention programme referral. Cardiovascular risk assessment. Medication review.",
    timing: "Contact within 6 weeks",
  },
  top_5_percent: {
    type: "GP-initiated lifestyle prescription",
    action: "HbA1c screening + lifestyle prescription (diet, activity). Scheduled 3-month follow-up.",
    timing: "Contact within 3 months",
  },
  top_10_percent: {
    type: "Lifestyle programme invitation",
    action: "GP letter with metabolic review request. Invitation to structured lifestyle programme.",
    timing: "Contact within 6 months",
  },
  top_20_percent: {
    type: "Health promotion outreach",
    action: "Health promotion materials (diet, physical activity). Annual metabolic review reminder.",
    timing: "Include in annual review cycle",
  },
};

const WORKLOAD_TONE: Record<string, "success" | "neutral" | "warning" | "danger" | "info"> = {
  very_low: "success",
  low: "success",
  moderate: "warning",
  high: "danger",
  very_high: "danger",
};

function nnrValue(row: TopKRow | ThresholdScenarioRow): number {
  return row.number_needed_to_review ?? 0;
}

// ── NNR Visual ────────────────────────────────────────────────────────────────

function NNRVisual({ nnr }: { nnr: number }) {
  const n = Math.min(Math.round(nnr), 30);
  const positiveAt = n;
  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        For every <strong className="text-[var(--text-primary)]">{Math.round(nnr)} patients</strong> your
        team contacts, you will find{" "}
        <strong className="text-[var(--danger)]">1 confirmed diabetes case</strong>.
      </p>
      <div className="flex flex-wrap gap-1.5 py-1">
        {Array.from({ length: n }, (_, i) => (
          <span
            key={i}
            title={i + 1 === positiveAt ? "Confirmed case" : "No confirmed onset"}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
              i + 1 === positiveAt
                ? "bg-[var(--danger)] text-white"
                : "bg-[var(--surface-3)] text-[var(--text-muted)]"
            }`}
          >
            {i + 1 === positiveAt ? "✓" : "·"}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-[var(--text-muted)]">
        Each icon = 1 patient contacted · Red = confirmed diabetes case found
      </p>
    </div>
  );
}

// ── Capacity Calculator ───────────────────────────────────────────────────────

function CapacityCalculator({
  rows,
  onSelectGroup,
}: {
  rows: TopKRow[];
  onSelectGroup: (group: string) => void;
}) {
  const [teamSize, setTeamSize] = useState(5);
  const [contactsPerWeek, setContactsPerWeek] = useState(50);
  const [sitePopulation, setSitePopulation] = useState(10000);

  const weeklyCapacity = teamSize * contactsPerWeek;
  const monthlyCapacity = weeklyCapacity * 4;

  const bestGroup = useMemo(() => {
    let best = rows[0];
    let bestDiff = Infinity;
    for (const r of rows) {
      const diff = Math.abs(r.selected_patient_count - monthlyCapacity);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = r;
      }
    }
    return best;
  }, [rows, monthlyCapacity]);

  const weeksToComplete = bestGroup
    ? Math.ceil(bestGroup.selected_patient_count / weeklyCapacity)
    : 0;

  const siteRatio = sitePopulation / TOTAL_COHORT;

  return (
    <div className="surface-panel p-6 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Capacity calculator</h2>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Tell us your team's capacity and we'll recommend the right patient group
        </p>
      </div>

      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Team members
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={500}
              value={teamSize}
              onChange={(e) => setTeamSize(Math.max(1, +e.target.value))}
              className="input-control w-full"
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">People doing outreach</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Contacts per person / week
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={contactsPerWeek}
            onChange={(e) => setContactsPerWeek(Math.max(1, +e.target.value))}
            className="input-control w-full"
          />
          <p className="text-[11px] text-[var(--text-muted)]">Calls, letters or appointments</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Your site population
          </label>
          <input
            type="number"
            min={100}
            max={5000000}
            step={1000}
            value={sitePopulation}
            onChange={(e) => setSitePopulation(Math.max(100, +e.target.value))}
            className="input-control w-full"
          />
          <p className="text-[11px] text-[var(--text-muted)]">Total registered patients</p>
        </div>
      </div>

      {/* Recommendation */}
      {bestGroup && (
        <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--accent-softer)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                Recommended group
              </p>
              <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                {TOP_K_LABELS[bestGroup.top_k_group] ?? bestGroup.top_k_group}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectGroup(bestGroup.top_k_group)}
              className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              Select this group
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Weekly capacity</p>
              <p className="font-semibold text-[var(--text-primary)] tabular-nums">
                {formatInt(weeklyCapacity)} contacts
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Patients in group</p>
              <p className="font-semibold text-[var(--text-primary)] tabular-nums">
                {formatInt(bestGroup.selected_patient_count)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Weeks to complete</p>
              <p className="font-semibold text-[var(--text-primary)] tabular-nums">
                ~{weeksToComplete} weeks
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Expected cases found</p>
              <p className="font-semibold text-[var(--danger)] tabular-nums">
                {formatInt(bestGroup.observed_positive_count)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Site scaling */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Your site estimates ({formatInt(sitePopulation)} patients)
        </p>
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
                {["Group", "Site patients", "Site cases (est.)", "Weeks at your capacity", "Intervention"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sitePatients = Math.round(r.selected_patient_count * siteRatio);
                const siteCases = Math.round(r.observed_positive_count * siteRatio);
                const weeks = Math.ceil(sitePatients / weeklyCapacity);
                const intervention = TOP_K_INTERVENTION[r.top_k_group];
                const isBest = r.top_k_group === bestGroup?.top_k_group;
                return (
                  <tr
                    key={r.top_k_group}
                    className={`border-b border-[var(--border-subtle)] last:border-0 ${isBest ? "bg-[var(--accent-softer)]" : ""}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                      {TOP_K_LABELS[r.top_k_group] ?? r.top_k_group}
                      {isBest && (
                        <span className="ml-2 text-[10px] font-semibold text-[var(--accent)]">← recommended</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-[var(--text-primary)]">{formatInt(sitePatients)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-[var(--danger)]">{formatInt(siteCases)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-[var(--text-secondary)]">~{weeks} wk</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{intervention?.type ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Site estimates scaled from full cohort ({formatInt(TOTAL_COHORT)} patients). Actual numbers will vary by site demographics.
        </p>
      </div>
    </div>
  );
}

// ── Top-K Section ─────────────────────────────────────────────────────────────

function TopKSection({ rows, externalSelected, onSelect }: {
  rows: TopKRow[];
  externalSelected: string | null;
  onSelect: (g: string) => void;
}) {
  const { theme } = useTheme();
  const groups = rows.map((r) => r.top_k_group);
  const [internalSelected, setInternalSelected] = useState<string>(groups[2] ?? groups[0] ?? "");
  const selected = externalSelected ?? internalSelected;

  function handleSelect(g: string) {
    setInternalSelected(g);
    onSelect(g);
  }

  const active = rows.find((r) => r.top_k_group === selected);
  const intervention = active ? TOP_K_INTERVENTION[active.top_k_group] : null;

  const chartData = rows.map((r) => ({
    label: TOP_K_LABELS[r.top_k_group] ?? r.top_k_group,
    "Recall %": +(r.recall * 100).toFixed(2),
    "Precision %": +(r.precision * 100).toFixed(2),
    "F1 %": +(r.f1 * 100).toFixed(2),
  }));

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Top-K group planner</h2>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Patients ranked by calibrated risk score · Select a group size to see workload, expected outcomes and recommended intervention
        </p>
      </div>

      {/* Group selector */}
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <button
            key={r.top_k_group}
            type="button"
            onClick={() => handleSelect(r.top_k_group)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              selected === r.top_k_group
                ? "border-[var(--accent)] bg-[var(--accent-softer)] text-[var(--accent)]"
                : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            }`}
          >
            {TOP_K_LABELS[r.top_k_group] ?? r.top_k_group}
          </button>
        ))}
      </div>

      {active && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* Left: stats */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Patients to contact"
                value={formatInt(active.selected_patient_count)}
                hint={`${active.selected_patient_percent.toFixed(1)}% of total population`}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                label="Confirmed cases captured"
                value={formatInt(active.observed_positive_count)}
                hint={`${active.captured_positive_percent.toFixed(1)}% of all diabetes cases in cohort`}
                icon={<UserCheck className="h-5 w-5" />}
              />
              <StatCard
                label="Risk enrichment"
                value={`${active.risk_enrichment_vs_population.toFixed(1)}×`}
                hint="Times more likely than population average to have diabetes"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <StatCard
                label="Recall"
                value={`${formatFixed(active.recall * 100, 1)}%`}
                hint="Percentage of all diabetes cases this group captures"
                icon={<Target className="h-5 w-5" />}
              />
            </div>

            {/* NNR plain language */}
            <div className="surface-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-[var(--accent)]" />
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Contact efficiency
                </p>
              </div>
              <NNRVisual nnr={nnrValue(active)} />
            </div>
          </div>

          {/* Right: intervention recommendation */}
          {intervention && (
            <div
              className="rounded-xl border border-[var(--border-default)] p-5 space-y-3"
              style={{ background: "var(--surface-1)" }}
            >
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Recommended intervention
                </p>
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">{intervention.type}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{intervention.action}</p>
              <div className="flex items-center gap-2 pt-1">
                <AlertTriangle className="h-3.5 w-3.5 text-[var(--warning)]" />
                <span className="text-xs font-medium text-[var(--warning)]">{intervention.timing}</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2">
                Intervention type is a planning guide only. Clinical teams must apply individual judgement.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
              {["Group", "Patients", "Pop %", "Cases found", "Recall", "1 in X contacts", "Enrichment", "Intervention type"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.top_k_group}
                onClick={() => handleSelect(r.top_k_group)}
                className={`cursor-pointer border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-2)] ${selected === r.top_k_group ? "bg-[var(--accent-softer)]" : ""}`}
              >
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                  {TOP_K_LABELS[r.top_k_group] ?? r.top_k_group}
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{formatInt(r.selected_patient_count)}</td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{r.selected_patient_percent.toFixed(1)}%</td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{formatInt(r.observed_positive_count)}</td>
                <td className="px-4 py-3 tabular-nums font-medium text-[var(--text-primary)]">{formatFixed(r.recall * 100, 1)}%</td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">
                  1 in {Math.round(nnrValue(r))}
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-primary)]">{r.risk_enrichment_vs_population.toFixed(1)}×</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {TOP_K_INTERVENTION[r.top_k_group]?.type ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <ChartCard
        title="Recall vs precision by group size"
        subtitle="Recall (cases captured) rises as group widens; precision (contact efficiency) falls — pick the balance your capacity allows"
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={chartGridStroke(theme)} />
            <XAxis dataKey="label" tick={{ fill: chartAxisColor(theme), fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chartAxisColor(theme), fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip {...chartTooltipProps(theme)} formatter={(v, name) => [`${v}%`, name]} />
            <Legend />
            <Line type="monotone" dataKey="Recall %" stroke={chartColors.primary} strokeWidth={2} dot />
            <Line type="monotone" dataKey="Precision %" stroke={chartColors.secondary} strokeWidth={2} dot />
            <Line type="monotone" dataKey="F1 %" stroke="#a78bfa" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}

// ── Threshold Section ─────────────────────────────────────────────────────────

function ThresholdSection({ rows }: { rows: ThresholdScenarioRow[] }) {
  // Hide thresholds that select zero patients (model max ~0.17, so 0.2 and 0.5 are empty)
  const activeRows = rows.filter((r) => r.selected_patient_count > 0);
  const hiddenCount = rows.length - activeRows.length;

  const [activeThreshold, setActiveThreshold] = useState<number>(
    activeRows[3]?.threshold ?? activeRows[0]?.threshold ?? 0.01,
  );
  const { theme } = useTheme();

  const active = activeRows.find((r) => r.threshold === activeThreshold);

  const chartData = activeRows.map((r) => ({
    t: r.threshold,
    "Recall %": +(r.recall * 100).toFixed(2),
    "Precision %": +(r.precision * 100).toFixed(2),
    "% Population": +r.selected_patient_percent.toFixed(2),
  }));

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Probability threshold planner</h2>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Select patients at or above a risk score threshold · Lower threshold = wider net, more cases, more contacts · Higher threshold = tighter, more efficient
        </p>
      </div>

      {hiddenCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warning)]" />
          <p className="text-xs text-[var(--text-muted)]">
            {hiddenCount} threshold{hiddenCount > 1 ? "s" : ""} (≥ 0.20) hidden — they select zero patients because the
            model's maximum calibrated score is ~17%. Operational range for this model is{" "}
            <strong>0.005 – 0.10</strong>.
          </p>
        </div>
      )}

      {/* Threshold selector */}
      <div className="flex flex-wrap gap-2">
        {activeRows.map((r) => (
          <button
            key={r.threshold}
            type="button"
            onClick={() => setActiveThreshold(r.threshold)}
            className={`rounded-full border px-3 py-1 text-xs font-mono transition-colors ${
              activeThreshold === r.threshold
                ? "border-[var(--accent)] bg-[var(--accent-softer)] text-[var(--accent)]"
                : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
            }`}
          >
            ≥ {r.threshold}
          </button>
        ))}
      </div>

      {active && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Patients selected"
            value={formatInt(active.selected_patient_count)}
            hint={`${active.selected_patient_percent.toFixed(2)}% of population`}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Cases captured"
            value={formatInt(active.observed_positive_count)}
            hint={`${active.captured_positive_percent.toFixed(1)}% of all diabetes cases`}
            icon={<UserCheck className="h-5 w-5" />}
          />
          <StatCard
            label="1 in X contacts finds a case"
            value={`1 in ${Math.round(nnrValue(active))}`}
            hint="Contact efficiency at this threshold"
            icon={<Crosshair className="h-5 w-5" />}
          />
          <div className="surface-card p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Workload level</p>
            <div className="mt-3">
              <StatusBadge
                tone={WORKLOAD_TONE[active.workload_level] ?? "neutral"}
                label={active.workload_level.replaceAll("_", " ")}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Relative to full cohort capacity</p>
          </div>
        </div>
      )}

      {/* Threshold table — usable thresholds only */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
              {["Threshold", "Selected", "Pop %", "Cases", "Recall", "1 in X", "Workload"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeRows.map((r) => (
              <tr
                key={r.threshold}
                onClick={() => setActiveThreshold(r.threshold)}
                className={`cursor-pointer border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-2)] ${activeThreshold === r.threshold ? "bg-[var(--accent-softer)]" : ""}`}
              >
                <td className="px-4 py-3 font-mono text-[var(--text-primary)]">≥ {r.threshold}</td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{formatInt(r.selected_patient_count)}</td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{r.selected_patient_percent.toFixed(2)}%</td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{formatInt(r.observed_positive_count)}</td>
                <td className="px-4 py-3 tabular-nums font-medium text-[var(--text-primary)]">{formatFixed(r.recall * 100, 1)}%</td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">1 in {Math.round(nnrValue(r))}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={WORKLOAD_TONE[r.workload_level] ?? "neutral"} label={r.workload_level.replaceAll("_", " ")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ChartCard
        title="Recall vs precision by threshold"
        subtitle="Recall falls and precision rises as threshold increases — choose based on your capacity and how many cases you can afford to miss"
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={chartGridStroke(theme)} />
            <XAxis dataKey="t" tick={{ fill: chartAxisColor(theme), fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => String(v)} />
            <YAxis tick={{ fill: chartAxisColor(theme), fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip {...chartTooltipProps(theme)} formatter={(v, name) => [`${v}%`, name]} />
            <Legend />
            <Line type="monotone" dataKey="Recall %" stroke={chartColors.primary} strokeWidth={2} dot />
            <Line type="monotone" dataKey="Precision %" stroke={chartColors.secondary} strokeWidth={2} dot />
            <Line type="monotone" dataKey="% Population" stroke="#a78bfa" strokeWidth={1} strokeDasharray="4 2" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function InterventionPage() {
  const data = useDashboardBundle();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Intervention Planner"
        description="Enter your team's capacity to get a tailored recommendation — then see expected workload, case capture and intervention type for each patient group."
      />

      <GovernanceBanner>
        Planning estimates based on observed administrative labels. Not deployment decisions — clinical stakeholder
        and governance review required before any patient-facing workflow is launched.
      </GovernanceBanner>

      {/* 1. Capacity calculator */}
      <CapacityCalculator
        rows={data.topKIntervention}
        onSelectGroup={(g) => setSelectedGroup(g)}
      />

      <hr className="border-[var(--border-subtle)]" />

      {/* 2. Top-K planner */}
      <TopKSection
        rows={data.topKIntervention}
        externalSelected={selectedGroup}
        onSelect={setSelectedGroup}
      />

      <hr className="border-[var(--border-subtle)]" />

      {/* 3. Threshold planner */}
      <ThresholdSection rows={data.thresholdScenarios} />
    </div>
  );
}
