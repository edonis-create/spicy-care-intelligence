import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, getPatients, getTrajectory } from "../api";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { StatusBanner } from "../components/StatusBanner";
import { PHENOTYPE_BY_ID, PHENOTYPES, getStandardPhenotypeLabel } from "../constants/phenotypes";

const PATIENT_LEVEL_ACCESS_ENABLED = String(import.meta.env.VITE_ENABLE_PATIENT_LEVEL_ACCESS || "").toLowerCase() === "true";
const PHENOTYPE_ORDER = ["P1", "P2", "P3", "P4", "P5"];

const TIER_COLORS = {
  P1: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  P2: "bg-sky-500/10 text-sky-300 border-sky-500/25",
  P3: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  P4: "bg-orange-500/10 text-orange-300 border-orange-500/25",
  P5: "bg-red-500/10 text-red-300 border-red-500/25",
};

const TIER_TIMELINE = {
  P1: "bg-emerald-500",
  P2: "bg-sky-500",
  P3: "bg-amber-500",
  P4: "bg-orange-500",
  P5: "bg-red-500",
};

function TierBadge({ tierId }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TIER_COLORS[tierId] || "bg-white/[0.08] text-fg-secondary border-white/[0.12]"}`}>
      {tierId} · {getStandardPhenotypeLabel(tierId)}
    </span>
  );
}

export function PatientTrajectory() {
  const [tierFilter, setTierFilter] = useState("all");
  const [patientList, setPatientList] = useState([]);
  const [patientListLoading, setPatientListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!PATIENT_LEVEL_ACCESS_ENABLED) return;
    setPatientListLoading(true);
    getPatients()
      .then((data) => {
        const patients = data?.patients || [];
        setPatientList(patients);
        if (patients.length) setSelectedId(patients[0].patient_id);
      })
      .catch(() => {})
      .finally(() => setPatientListLoading(false));
  }, []);

  const filteredPatients = useMemo(
    () =>
      tierFilter === "all"
        ? patientList
        : patientList.filter((p) => p.dominant_tier === tierFilter),
    [patientList, tierFilter],
  );

  const loadTrajectory = async (pid = selectedId) => {
    if (!PATIENT_LEVEL_ACCESS_ENABLED || !pid) return;
    setIsLoading(true);
    setError("");
    setPayload(null);
    try {
      const data = await getTrajectory(pid);
      setPayload(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load patient trajectory."));
    } finally {
      setIsLoading(false);
    }
  };

  const transitionInsight = useMemo(() => {
    const points = payload?.trajectory || [];
    if (points.length < 2) return "";
    let maxStep = -1;
    let startYear = null;
    let endYear = null;
    points.forEach((point, index) => {
      if (index === 0) return;
      const prev = points[index - 1];
      const prevRank = PHENOTYPE_ORDER.indexOf(prev.phenotype_id);
      const nextRank = PHENOTYPE_ORDER.indexOf(point.phenotype_id);
      if (prevRank < 0 || nextRank < 0) return;
      const step = Math.abs(nextRank - prevRank);
      if (step > maxStep) {
        maxStep = step;
        startYear = prev.year;
        endYear = point.year;
      }
    });
    if (maxStep <= 0) return "No major year-over-year tier change observed.";
    return `Largest tier transition occurred between ${startYear} and ${endYear}.`;
  }, [payload]);

  const trajectoryPoints = payload?.trajectory || [];
  const firstPoint = trajectoryPoints[0];
  const lastPoint = trajectoryPoints[trajectoryPoints.length - 1];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Patient Journey"
        description="Follow an individual patient's risk tier trajectory year by year. Requires patient-level data access."
      />

      {!PATIENT_LEVEL_ACCESS_ENABLED && (
        <StatusBanner
          tone="warning"
          message="Patient-level access is disabled. Enable VITE_ENABLE_PATIENT_LEVEL_ACCESS=true to use this page."
        />
      )}

      {PATIENT_LEVEL_ACCESS_ENABLED && (
        <section className="rounded-3xl border border-border-default bg-surface-1 p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-fg-primary">Select Patient</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="text-sm font-medium text-fg-secondary">
              Filter by risk tier
              <select
                className="mt-2 w-full rounded-xl border border-border-default px-3 py-2 text-sm"
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value);
                  setPayload(null);
                }}
              >
                <option value="all">All tiers</option>
                {PHENOTYPES.map((p) => (
                  <option key={p.id} value={p.id}>{p.id} · {p.label}</option>
                ))}
              </select>
            </label>

            <label className="flex-1 text-sm font-medium text-fg-secondary">
              Patient
              {patientListLoading ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-fg-tertiary"><Spinner />Loading patients...</div>
              ) : (
                <select
                  className="mt-2 w-full rounded-xl border border-border-default px-3 py-2 text-sm"
                  value={selectedId}
                  onChange={(e) => { setSelectedId(e.target.value); setPayload(null); }}
                >
                  {filteredPatients.length === 0 && <option value="">No patients available</option>}
                  {filteredPatients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.patient_id} · {p.dominant_tier} · {p.years_observed} yrs
                    </option>
                  ))}
                </select>
              )}
            </label>

            <button
              type="button"
              onClick={() => loadTrajectory(selectedId)}
              disabled={!selectedId || isLoading}
              className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Load
            </button>
          </div>
          <p className="mt-3 text-xs text-fg-tertiary">
            {patientList.length} patients available across all risk tiers · IDs are hashed (no PII)
          </p>
        </section>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-border-default bg-surface-1 p-4 text-sm text-fg-secondary">
          <Spinner />Loading patient trajectory...
        </div>
      )}
      {error && <StatusBanner tone="error" message={error} />}
      {!error && payload?.status?.state === "warning" && (
        <StatusBanner tone="warning" message={payload.status.message} details={payload.status.missing_files || []} />
      )}

      {payload && trajectoryPoints.length > 0 && (
        <>
          {/* Summary cards */}
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border-default bg-surface-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Starting Tier</p>
              <div className="mt-2"><TierBadge tierId={firstPoint.phenotype_id} /></div>
              <p className="mt-1 text-xs text-fg-tertiary">{firstPoint.year}</p>
            </div>
            <div className="rounded-2xl border border-border-default bg-surface-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Latest Tier</p>
              <div className="mt-2"><TierBadge tierId={lastPoint.phenotype_id} /></div>
              <p className="mt-1 text-xs text-fg-tertiary">{lastPoint.year}</p>
            </div>
            <div className="rounded-2xl border border-border-default bg-surface-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Years Observed</p>
              <p className="mt-2 text-2xl font-semibold text-fg-primary">{trajectoryPoints.length}</p>
              <p className="mt-1 text-xs text-fg-tertiary">{firstPoint.year} – {lastPoint.year}</p>
            </div>
          </section>

          {/* Timeline */}
          <section className="rounded-3xl border border-border-default bg-surface-1 p-6 shadow-sm">
            <h2 className="mb-5 text-base font-semibold text-fg-primary">Risk Tier Timeline</h2>
            <div className="flex flex-wrap items-center gap-2">
              {trajectoryPoints.map((point, index) => (
                <div key={`${point.year}-${point.phenotype_id}`} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-semibold text-slate-400">{point.year}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${TIER_TIMELINE[point.phenotype_id] || "bg-slate-500"}`}>
                      {point.phenotype_id}
                    </span>
                  </div>
                  {index < trajectoryPoints.length - 1 && (
                    <span className="mb-1 text-slate-300">›</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-border-subtle bg-surface-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Clinical Interpretation</p>
              <p className="mt-1.5 text-sm text-fg-secondary">{payload.interpretation}</p>
              {transitionInsight && (
                <p className="mt-1 text-sm text-fg-tertiary">{transitionInsight}</p>
              )}
            </div>
          </section>

          {/* Year-by-year clinical detail */}
          <section className="rounded-3xl border border-border-default bg-surface-1 p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-fg-primary">Year-by-Year Clinical Snapshot</h2>
            <div className="overflow-x-auto rounded-2xl border border-border-default">
              <table className="min-w-full text-sm">
                <thead className="bg-white/[0.025]">
                  <tr>
                    {["Year","Risk Tier","Age","Gender","Conditions","Prescriptions","Admissions","Outpatient","Polypharmacy","Confidence"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-tertiary whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trajectoryPoints.map((point, idx) => {
                    const raw = payload._raw_trajectory?.[idx];
                    return (
                      <tr key={point.year} className={`transition hover:bg-white/[0.025] ${idx % 2 === 1 ? "bg-white/[0.015]" : ""}`}>
                        <td className="px-4 py-3 font-semibold text-fg-primary">{point.year}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${TIER_COLORS[point.phenotype_id] || ""}`}>
                            {point.phenotype_id}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-fg-secondary">{point.age ?? "—"}</td>
                        <td className="px-4 py-3 text-fg-secondary">{point.gender ?? "—"}</td>
                        <td className="px-4 py-3 text-fg-secondary">{point.conditions ?? "—"}</td>
                        <td className="px-4 py-3 text-fg-secondary">{point.prescriptions ?? "—"}</td>
                        <td className="px-4 py-3 text-fg-secondary">{point.admissions ?? "—"}</td>
                        <td className="px-4 py-3 text-fg-secondary">{point.outpatient_visits ?? "—"}</td>
                        <td className="px-4 py-3 text-fg-secondary">{point.polypharmacy != null ? (point.polypharmacy ? "Yes" : "No") : "—"}</td>
                        <td className="px-4 py-3 text-fg-tertiary capitalize">{point.confidence ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {payload && trajectoryPoints.length === 0 && (
        <div className="rounded-2xl border border-border-default bg-surface-3 p-6 text-center text-sm text-fg-tertiary">
          No trajectory data available for this patient.
        </div>
      )}
    </div>
  );
}
