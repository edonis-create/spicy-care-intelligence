import { useEffect, useMemo, useState } from "react";
import { Filter, GitBranch } from "lucide-react";
import { getApiErrorMessage, getProfiles, getSummary } from "../api";
import { PageHeader } from "../components/PageHeader";
import { SortableTable } from "../components/SortableTable";
import { Spinner } from "../components/Spinner";
import { StatusBanner } from "../components/StatusBanner";
import { Chip } from "../components/ui/Chip";
import { FilterControl } from "../components/ui/FilterControl";
import { SectionCard } from "../components/ui/SectionCard";
import { PremiumDropdown } from "../components/ui/PremiumDropdown";
import { getStandardPhenotypeLabel, PHENOTYPE_BY_ID } from "../constants/phenotypes";
import { useYear } from "../context/yearContext";
import { getHeatmapCellStyle, HEATMAP_LEGEND_GRADIENT } from "../utils/heatmapStyle";

function formatHeatmapValue(value) {
  return Number(value || 0).toFixed(4).replace(/\.?0+$/, "");
}

export function YearlyStratification() {
  const { years, selectedYear, setSelectedYear } = useYear();
  const [summary, setSummary] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("source_cluster_id");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedPhenotypeId, setSelectedPhenotypeId] = useState("ALL");

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    Promise.all([getSummary(selectedYear), getProfiles(selectedYear)])
      .then(([summaryPayload, profilePayload]) => {
        if (mounted) {
          setSummary(summaryPayload);
          setProfiles(profilePayload.profiles || []);
          setError("");
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(getApiErrorMessage(err, "Unable to load yearly stratification."));
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [selectedYear]);

  const rows = useMemo(() => {
    const source = (summary?.phenotypes || [])
      .filter((item) => Number(item.patient_count || 0) > 0)
      .map((item, index) => ({
        ...item,
        label: getStandardPhenotypeLabel(item.id),
        source_cluster_id: index,
        share_percent: Number(item.share || 0) * 100,
      }));
    const sorted = [...source].sort((a, b) => {
      const left = a[sortBy];
      const right = b[sortBy];
      if (left === right) return 0;
      if (sortOrder === "asc") return left > right ? 1 : -1;
      return left < right ? 1 : -1;
    });
    return sorted;
  }, [summary, sortBy, sortOrder]);

  const phenotypeOptions = useMemo(
    () =>
      (summary?.phenotypes || [])
        .filter((item) => Number(item.patient_count || 0) > 0)
        .map((item) => ({
          id: item.id,
          label: getStandardPhenotypeLabel(item.id),
        })),
    [summary],
  );

  useEffect(() => {
    if (selectedPhenotypeId === "ALL") return;
    const exists = phenotypeOptions.some((item) => item.id === selectedPhenotypeId);
    if (!exists) {
      setSelectedPhenotypeId("ALL");
    }
  }, [phenotypeOptions, selectedPhenotypeId]);

  const filteredRows = useMemo(() => {
    if (selectedPhenotypeId === "ALL") return rows;
    return rows.filter((row) => row.id === selectedPhenotypeId);
  }, [rows, selectedPhenotypeId]);

  const centroidDistanceMatrix = useMemo(() => {
    if (!profiles.length) return [];
    return profiles.map((fromProfile) =>
      profiles.map((toProfile) => {
        const a = fromProfile.source_features || {};
        const b = toProfile.source_features || {};
        const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
        if (!keys.length) return 0;
        let sumSquares = 0;
        for (const key of keys) {
          const delta = Number(a[key] || 0) - Number(b[key] || 0);
          sumSquares += delta * delta;
        }
        return Math.sqrt(sumSquares);
      }),
    );
  }, [profiles]);

  const heatmapKeys = useMemo(() => profiles.map((profile) => profile.id), [profiles]);
  const heatmapData = useMemo(
    () =>
      centroidDistanceMatrix.map((row) =>
        row.map((value) => Number((value || 0).toFixed(4))),
      ),
    [centroidDistanceMatrix],
  );
  const heatmapMaxValue = useMemo(() => {
    if (!centroidDistanceMatrix.length) return 1;
    return Math.max(...centroidDistanceMatrix.flat());
  }, [centroidDistanceMatrix]);

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortOrder("asc");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Population Health"
        description="Patient counts and risk tier profiles for the selected year — how the population is distributed across care complexity levels."
        meta={
          <>
            <Chip tone="accent" size="md">
              {selectedYear}
            </Chip>
            <Chip size="md" leadingIcon={Filter}>
              {selectedPhenotypeId === "ALL" ? "All risk tiers" : selectedPhenotypeId}
            </Chip>
          </>
        }
      />

      <SectionCard
        className="relative z-20"
        eyebrow="Filters"
        title="Refine the cohort"
        description="Select a year and optionally focus on a specific risk tier."
        density="compact"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FilterControl label="Year">
            <PremiumDropdown
              value={selectedYear}
              onChange={(v) => setSelectedYear(Number(v))}
              options={years.map((year) => ({ value: year, label: String(year) }))}
              listAriaLabel="Select year"
            />
          </FilterControl>
          <FilterControl label="Risk Tier">
            <PremiumDropdown
              value={selectedPhenotypeId}
              onChange={setSelectedPhenotypeId}
              disabled={isLoading}
              options={[
                { value: "ALL", label: "All risk tiers" },
                ...phenotypeOptions.map((item) => ({ value: item.id, label: item.label })),
              ]}
              listAriaLabel="Select phenotype"
            />
          </FilterControl>
        </div>
      </SectionCard>

      {isLoading && (
        <div className="surface-2 flex items-center gap-3 rounded-md p-3.5 text-[13px] text-fg-tertiary">
          <Spinner />
          Loading yearly stratification…
        </div>
      )}
      {error && <StatusBanner tone="error" message={error} />}
      {!error && summary?.status?.state === "warning" && (
        <StatusBanner
          tone="warning"
          message={summary.status.message}
          details={summary.status.missing_files || []}
        />
      )}

      <SectionCard
        title="Risk tier breakdown"
        description="Patient counts and shares per risk tier. Click any column header to sort."
      >
        <SortableTable
          columns={[
            {
              key: "source_cluster_id",
              label: "Cluster",
              align: "left",
              tabular: true,
              render: (row) => (
                <span className="font-semibold tabular text-fg-primary">
                  {row.source_cluster_id}
                </span>
              ),
            },
            {
              key: "id",
              label: "Code",
              render: (row) => (
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold"
                  style={{
                    color: PHENOTYPE_BY_ID[row.id]?.color.hex,
                    backgroundColor: `${PHENOTYPE_BY_ID[row.id]?.color.hex}14`,
                    borderColor: `${PHENOTYPE_BY_ID[row.id]?.color.hex}40`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: PHENOTYPE_BY_ID[row.id]?.color.hex }}
                  />
                  {row.id}
                </span>
              ),
            },
            {
              key: "label",
              label: "Phenotype",
              render: (row) => (
                <span className="text-fg-secondary">
                  {row.label.replace(/^[^-]*-\s*/, "")}
                </span>
              ),
            },
            {
              key: "patient_count",
              label: "Count",
              align: "right",
              tabular: true,
              render: (row) => (
                <span className="font-semibold text-fg-primary">
                  {row.patient_count.toLocaleString()}
                </span>
              ),
            },
            {
              key: "share_percent",
              label: "Share",
              align: "right",
              tabular: true,
              render: (row) => {
                const color = PHENOTYPE_BY_ID[row.id]?.color.hex || "var(--accent)";
                return (
                  <div className="flex items-center justify-end gap-3">
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, row.share_percent)}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-semibold text-fg-primary tabular">
                      {row.share_percent.toFixed(1)}%
                    </span>
                  </div>
                );
              },
            },
          ]}
          rows={filteredRows}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={toggleSort}
          emptyMessage="No yearly stratification rows available."
        />
      </SectionCard>

      <SectionCard
        eyebrow="Clinical differentiation"
        title="Risk tier separation"
        description="How clinically distinct each risk tier is from the others. Well-separated tiers indicate clear, actionable patient groupings."
        action={
          <Chip tone="ghost" size="md" leadingIcon={GitBranch}>
            {profiles.length} profiles
          </Chip>
        }
      >
        {centroidDistanceMatrix.length === 0 ? (
          <div className="rounded-md border border-border-subtle bg-surface-3 p-4 text-[13px] text-fg-tertiary">
            Centroid distance data unavailable for this year.
          </div>
        ) : (
          <div className="rounded-md border border-border-subtle bg-surface-3 p-3">
            <div className="overflow-x-auto">
              <div
                className="grid min-w-[760px] overflow-hidden rounded-md border border-border-subtle"
                style={{
                  gridTemplateColumns: `7rem repeat(${heatmapKeys.length}, minmax(6rem, 1fr))`,
                }}
              >
                <div className="bg-white/[0.025] px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
                  From / To
                </div>
                {heatmapKeys.map((label) => (
                  <div
                    key={`heatmap-x-${label}`}
                    className="bg-white/[0.025] px-2.5 py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: PHENOTYPE_BY_ID[label]?.color.hex || "var(--text-tertiary)" }}
                  >
                    {label}
                  </div>
                ))}
                {heatmapData.map((row, rowIndex) => (
                  <div key={`heatmap-row-${heatmapKeys[rowIndex]}`} className="contents">
                    <div
                      className="border-t border-border-subtle bg-white/[0.025] px-3 py-3 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
                      style={{
                        color: PHENOTYPE_BY_ID[heatmapKeys[rowIndex]]?.color.hex || "var(--text-tertiary)",
                      }}
                    >
                      {heatmapKeys[rowIndex]}
                    </div>
                    {row.map((value, colIndex) => (
                      <div
                        key={`heatmap-cell-${rowIndex}-${colIndex}`}
                        className="flex min-h-[58px] items-center justify-center border-t border-border-subtle px-2 py-3 text-center text-[12.5px] font-semibold tabular transition hover:brightness-125"
                        style={getHeatmapCellStyle(value, heatmapMaxValue)}
                        title={`${getStandardPhenotypeLabel(heatmapKeys[rowIndex])} → ${getStandardPhenotypeLabel(heatmapKeys[colIndex])}: ${formatHeatmapValue(value)}`}
                      >
                        {formatHeatmapValue(value)}
                      </div>
                    ))}
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
        )}
      </SectionCard>
    </div>
  );
}
