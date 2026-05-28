import { useMemo, useState } from "react";
import { getApiErrorMessage, getCohortTrajectory } from "../api";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { StatusBanner } from "../components/StatusBanner";
import { getStandardPhenotypeLabel, PHENOTYPES } from "../constants/phenotypes";

export function CohortAnalysis() {
  const [filters, setFilters] = useState({
    startYear: 2012,
    endYear: 2016,
    startPhenotype: "P2",
    site: "all",
    demographics: "all",
  });
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = async (nextFilters = filters) => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getCohortTrajectory(nextFilters);
      setPayload(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load cohort analysis."));
    } finally {
      setIsLoading(false);
    }
  };

  const trajectoryYears = useMemo(
    () => (payload?.yearly_distribution || []).map((item) => item.year),
    [payload],
  );

  const trajectoryMatrix = useMemo(
    () =>
      PHENOTYPES.map((phenotype) => ({
        phenotypeId: phenotype.id,
        byYear: trajectoryYears.map((year) => {
          const yearRow = (payload?.yearly_distribution || []).find((item) => item.year === year);
          return Number(yearRow?.distribution?.[phenotype.id] || 0);
        }),
      })),
    [payload, trajectoryYears],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Patient Groups"
        description="Track how patient cohorts evolve across risk tiers over time. Define a starting risk tier and follow that population forward."
      />

      <section className="rounded-3xl border border-border-default bg-surface-1 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-fg-primary">Cohort Builder</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <label className="text-sm font-medium text-fg-secondary">
            Starting year
            <select
              className="mt-2 w-full rounded-xl border border-border-default px-3 py-2"
              value={filters.startYear}
              onChange={(event) => setFilters((prev) => ({ ...prev, startYear: Number(event.target.value) }))}
            >
              {[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017].map((year) => (
                <option key={`start-year-${year}`} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-fg-secondary">
            Starting phenotype
            <select
              className="mt-2 w-full rounded-xl border border-border-default px-3 py-2"
              value={filters.startPhenotype}
              onChange={(event) => setFilters((prev) => ({ ...prev, startPhenotype: event.target.value }))}
            >
              {PHENOTYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {getStandardPhenotypeLabel(item.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-fg-secondary">
            Track until
            <select
              className="mt-2 w-full rounded-xl border border-border-default px-3 py-2"
              value={filters.endYear}
              onChange={(event) => setFilters((prev) => ({ ...prev, endYear: Number(event.target.value) }))}
            >
              {[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017].map((year) => (
                <option key={`end-year-${year}`} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-fg-secondary">
            Optional client/site
            <select
              className="mt-2 w-full rounded-xl border border-border-default px-3 py-2"
              value={filters.site}
              onChange={(event) => setFilters((prev) => ({ ...prev, site: event.target.value }))}
            >
              <option value="all">All sites</option>
              <option value="site_1">Site 1</option>
              <option value="site_2">Site 2</option>
              <option value="site_3">Site 3</option>
              <option value="site_4">Site 4</option>
              <option value="site_5">Site 5</option>
            </select>
          </label>
          <label className="text-sm font-medium text-fg-secondary">
            Optional demographics
            <select
              className="mt-2 w-full rounded-xl border border-border-default px-3 py-2"
              value={filters.demographics}
              onChange={(event) => setFilters((prev) => ({ ...prev, demographics: event.target.value }))}
            >
              <option value="all">All permitted cohorts</option>
              <option value="age_band">Age band (if available)</option>
              <option value="sex">Sex (if permitted)</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => loadData(filters)}
              className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-950/20 transition hover:bg-red-700"
            >
              Apply
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-fg-tertiary">
          Site and demographic filters are optional and become active once cohort slicing artifacts are provided.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border-default bg-surface-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Cohort Question</p>
          <p className="mt-2 text-sm text-fg-secondary">Where do patients starting in <span className="font-semibold">{getStandardPhenotypeLabel(filters.startPhenotype)}</span> end up by {filters.endYear}?</p>
        </div>
        <div className="rounded-2xl border border-border-default bg-surface-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Escalation Signal</p>
          <p className="mt-2 text-sm text-fg-secondary">What share of this cohort progresses to a higher-complexity tier?</p>
        </div>
        <div className="rounded-2xl border border-border-default bg-surface-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Intervention Window</p>
          <p className="mt-2 text-sm text-fg-secondary">Track year-by-year to identify when the cohort diverges most.</p>
        </div>
      </section>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-border-default bg-surface-1 p-4 text-sm text-fg-secondary">
          <Spinner />
          Loading cohort trajectory...
        </div>
      )}
      {error && <StatusBanner tone="error" message={error} />}
      {!error && payload?.status?.state === "warning" && (
        <StatusBanner tone="warning" message={payload.status.message} details={payload.status.missing_files || []} />
      )}

      <section className="rounded-3xl border border-border-default bg-surface-1 p-6">
        <h2 className="mb-4 text-lg font-semibold text-fg-primary">Risk Tier Distribution Over Time</h2>
        <div className="overflow-x-auto rounded-2xl border border-border-default">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.025]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-fg-tertiary">Risk Tier</th>
                {trajectoryYears.map((year) => (
                  <th key={`trajectory-year-${year}`} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-fg-tertiary">
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trajectoryMatrix.map((row, rowIdx) => (
                <tr key={`trajectory-row-${row.phenotypeId}`} className={`transition hover:bg-white/[0.025] ${rowIdx % 2 === 1 ? "bg-white/[0.015]" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-fg-primary">{row.phenotypeId}</td>
                  {row.byYear.map((value, index) => (
                    <td key={`${row.phenotypeId}-${trajectoryYears[index]}`} className="px-4 py-3">
                      <span className="text-sm font-semibold text-fg-secondary">{value.toFixed(1)}%</span>
                    </td>
                  ))}
                </tr>
              ))}
              {!trajectoryYears.length && (
                <tr>
                  <td className="px-4 py-3 text-fg-tertiary" colSpan={6}>
                    No cohort trajectory values available. Apply filters to load data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-border-default bg-surface-1 p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-fg-primary">Year-1 Transition Summary</h2>
        <p className="mb-4 text-sm text-fg-tertiary">
          Measured from start year to the immediately following year. Progressed = moved to higher-complexity tier; Improved = moved to lower-complexity tier.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border-default bg-surface-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Remained Same Tier</p>
            <p className="mt-2 text-2xl font-semibold text-fg-primary">{payload?.summary?.persisted?.toFixed(1) || "—"}%</p>
            <p className="mt-1 text-xs text-fg-tertiary">Stable patients</p>
          </div>
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Progressed</p>
            <p className="mt-2 text-2xl font-semibold text-amber-300">{payload?.summary?.progressed?.toFixed(1) || "—"}%</p>
            <p className="mt-1 text-xs text-amber-400">Moved to higher-complexity tier</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Improved</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{payload?.summary?.regressed?.toFixed(1) || "—"}%</p>
            <p className="mt-1 text-xs text-emerald-400">Moved to lower-complexity tier</p>
          </div>
        </div>
      </section>
    </div>
  );
}
