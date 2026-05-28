import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layers, Sparkles } from "lucide-react";
import { getApiErrorMessage, getPhenotypes, getProfiles, getSummary } from "../api";
import { PageHeader } from "../components/PageHeader";
import { PhenotypeLegend } from "../components/PhenotypeLegend";
import { SortableTable } from "../components/SortableTable";
import { Spinner } from "../components/Spinner";
import { StatusBanner } from "../components/StatusBanner";
import { Chip } from "../components/ui/Chip";
import { cn } from "../components/ui/cn";
import { FilterControl } from "../components/ui/FilterControl";
import { PremiumDropdown } from "../components/ui/PremiumDropdown";
import { SectionCard } from "../components/ui/SectionCard";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { AXIS_STYLE, ChartTooltip, GRID_STYLE } from "../components/ui/ChartTooltip";
import { getStandardPhenotypeLabel, PHENOTYPE_BY_ID } from "../constants/phenotypes";
import { useYear } from "../context/yearContext";

const FEATURE_INTERPRETATIONS = {
  AGE_std: "Age relative to cohort mean",
  dx_unique_count_log: "High diagnosis burden",
  inpatient_admissions_log: "Higher inpatient activity",
  prescription_count_log: "High medication use",
  outpatient_visits_log: "Higher outpatient utilization",
  procedure_count_log: "Higher procedure burden",
  chronic_rx_flag: "Chronic medication exposure",
};

const FEATURE_LABELS = {
  AGE_std: "Age",
  chronic_rx_flag: "Chronic Rx exposure",
  dx_unique_count_log: "Diagnosis burden",
  has_inpatient: "Inpatient admissions",
  inpatient_admissions_log: "Inpatient activity",
  outpatient_visits_log: "Outpatient visits",
  polypharmacy_flag: "Polypharmacy",
  prescription_count_log: "Prescription use",
  procedure_count_log: "Procedure burden",
  rx_atc_uniq_count_log: "Medication class diversity",
  GENDER_binary: "Gender indicator",
  dx_chapter_A_B_uniq: "Infectious & neoplasm dx",
  dx_chapter_C_D_uniq: "Neoplasm & blood dx",
  dx_chapter_E_uniq: "Endocrine & metabolic dx",
  dx_chapter_I_uniq: "Cardiovascular dx",
  dx_chapter_J_uniq: "Respiratory dx",
  dx_chapter_K_uniq: "Digestive dx",
  dx_chapter_N_uniq: "Genitourinary dx",
  dx_chapter_other_uniq: "Other diagnosis chapters",
};

function getFeatureLabel(name) {
  return FEATURE_LABELS[name] || name.replace(/_/g, " ");
}

function getPhenotypeShortLabel(id) {
  const fullLabel = getStandardPhenotypeLabel(id);
  return fullLabel.replace(new RegExp(`^${id}\\s*-\\s*`, "i"), "");
}

const BINARY_FEATURES = new Set([
  "chronic_rx_flag",
  "polypharmacy_flag",
  "has_inpatient",
  "GENDER_binary",
]);

const RADAR_FEATURES = [
  "AGE_std",
  "dx_unique_count_log",
  "inpatient_admissions_log",
  "outpatient_visits_log",
  "procedure_count_log",
  "prescription_count_log",
  "chronic_rx_flag",
];

function interpretLogLevel(value, lowThreshold, highThreshold, lowText, moderateText, highText) {
  if (value < lowThreshold) return lowText;
  if (value < highThreshold) return moderateText;
  return highText;
}

function interpretFeature(name, numeric, isBinary) {
  const percentageValue = numeric * 100;
  if (name === "AGE_std") {
    if (numeric > 0.1) return "Older than average";
    if (numeric < -0.1) return "Younger than average";
    return "Near cohort-average age";
  }
  if (isBinary) {
    if (name === "chronic_rx_flag")
      return `${percentageValue.toFixed(1)}% with chronic Rx exposure`;
    if (name === "has_inpatient")
      return `${percentageValue.toFixed(1)}% with inpatient admissions`;
    if (name === "polypharmacy_flag")
      return `${percentageValue.toFixed(1)}% meeting polypharmacy indicator`;
    if (name === "GENDER_binary")
      return `${percentageValue.toFixed(1)}% coded as gender=1`;
    return `${percentageValue.toFixed(1)}% prevalence`;
  }
  if (name === "dx_unique_count_log")
    return interpretLogLevel(numeric, 1.2, 2.0, "Lower diagnosis burden", "Moderate diagnosis burden", "High diagnosis burden");
  if (name === "prescription_count_log")
    return interpretLogLevel(numeric, 0.8, 1.8, "Lower medication use", "Moderate medication use", "High medication use");
  if (name === "inpatient_admissions_log")
    return interpretLogLevel(numeric, 0.1, 0.35, "Lower inpatient activity", "Moderate inpatient activity", "Higher inpatient activity");
  if (name === "outpatient_visits_log")
    return interpretLogLevel(numeric, 1.0, 1.8, "Lower outpatient utilization", "Moderate outpatient utilization", "Higher outpatient utilization");
  if (name === "procedure_count_log")
    return interpretLogLevel(numeric, 0.08, 0.25, "Lower procedure burden", "Moderate procedure burden", "Higher procedure burden");
  if (name === "rx_atc_uniq_count_log")
    return interpretLogLevel(numeric, 0.6, 1.4, "Lower medication class diversity", "Moderate medication class diversity", "Higher medication class diversity");
  if (name.startsWith("dx_chapter_"))
    return interpretLogLevel(numeric, 0.1, 0.5, "Lower chapter-specific dx burden", "Moderate chapter-specific dx burden", "Higher chapter-specific dx burden");
  return FEATURE_INTERPRETATIONS[name] || "Feature contribution summary";
}

function RadarTip({ active, payload, label }) {
  return (
    <ChartTooltip
      active={active}
      payload={payload}
      label={label}
      render={(items) => {
        const entry = items[0];
        const id = String(entry?.name || "");
        const rawValue = entry?.payload?.[`${id}Raw`];
        return (
          <div className="text-[12.5px] tabular text-fg-secondary">
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {id} · {getPhenotypeShortLabel(id)}
            </span>
            <div>
              {Number(entry?.value || 0).toFixed(1)}% scaled · {Number(rawValue || 0).toFixed(3)} raw
            </div>
          </div>
        );
      }}
    />
  );
}

function ComparisonTip({ active, payload, label, isBinary }) {
  return (
    <ChartTooltip
      active={active}
      payload={payload}
      label={label}
      render={(items) => {
        const value = Number(items[0]?.value || 0);
        return (
          <div className="text-[13px] tabular text-fg-primary">
            {isBinary ? `${(value * 100).toFixed(1)}%` : value.toFixed(3)}
          </div>
        );
      }}
    />
  );
}

export function PhenotypeExplorer() {
  const { years, selectedYear, setSelectedYear } = useYear();
  const [phenotypes, setPhenotypes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedPhenotypeId, setSelectedPhenotypeId] = useState("P1");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [featureKey, setFeatureKey] = useState("dx_unique_count_log");
  const [radarMode, setRadarMode] = useState("all");

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    Promise.all([getPhenotypes(), getProfiles(selectedYear), getSummary(selectedYear)])
      .then(([phenotypePayload, profilePayload, summaryPayload]) => {
        if (!mounted) return;
        setPhenotypes(phenotypePayload.phenotypes || []);
        setProfiles(profilePayload.profiles || []);
        setSummary(summaryPayload);
        const firstId = (phenotypePayload.phenotypes || [])[0]?.id || "P1";
        setSelectedPhenotypeId(firstId);
        setError("");
        setIsLoading(false);
      })
      .catch((err) => {
        if (mounted) {
          setError(getApiErrorMessage(err, "Unable to load phenotype explorer data."));
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [selectedYear]);

  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === selectedPhenotypeId),
    [profiles, selectedPhenotypeId],
  );

  const featureRows = useMemo(
    () =>
      Object.entries(selectedProfile?.source_features || {})
        .map(([name, value]) => {
          const numeric = Number(value);
          const isBinary = BINARY_FEATURES.has(name);
          const formatted = isBinary
            ? `${(numeric * 100).toFixed(1)}%`
            : numeric.toFixed(3);
          return {
            id: name,
            feature: getFeatureLabel(name),
            value: numeric,
            valueDisplay: formatted,
            interpretation: interpretFeature(name, numeric, isBinary),
          };
        })
        .sort((a, b) => a.feature.localeCompare(b.feature)),
    [selectedProfile],
  );

  const comparisonFeatureOptions = useMemo(() => {
    const keys = new Set();
    profiles.forEach((profile) => {
      Object.keys(profile.source_features || {}).forEach((key) => keys.add(key));
    });
    return Array.from(keys)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({
        key,
        label: FEATURE_INTERPRETATIONS[key]
          ? `${getFeatureLabel(key)}  —  ${FEATURE_INTERPRETATIONS[key]}`
          : getFeatureLabel(key),
      }));
  }, [profiles]);

  useEffect(() => {
    if (!comparisonFeatureOptions.length) return;
    const exists = comparisonFeatureOptions.some((option) => option.key === featureKey);
    if (!exists) setFeatureKey(comparisonFeatureOptions[0].key);
  }, [comparisonFeatureOptions, featureKey]);

  const comparisonChartData = useMemo(
    () =>
      profiles.map((item) => ({
        id: item.id,
        label: getStandardPhenotypeLabel(item.id),
        value: Number(item.source_features?.[featureKey] || 0),
        colorHex: PHENOTYPE_BY_ID[item.id]?.color.hex || "var(--accent)",
      })),
    [featureKey, profiles],
  );

  const radarRows = useMemo(
    () =>
      profiles.map((profile) => ({
        id: profile.id,
        label: getStandardPhenotypeLabel(profile.id),
        colorHex: PHENOTYPE_BY_ID[profile.id]?.color.hex || "var(--accent)",
        values: RADAR_FEATURES.map((feature) =>
          Number(profile.source_features?.[feature] || 0),
        ),
      })),
    [profiles],
  );

  const radarChartData = useMemo(() => {
    const featureMax = RADAR_FEATURES.map((_, featureIndex) => {
      const values = radarRows.map((row) => Math.abs(Number(row.values[featureIndex] || 0)));
      return Math.max(...values, 0.0001);
    });
    return RADAR_FEATURES.map((feature, featureIndex) => {
      const row = { feature, featureLabel: getFeatureLabel(feature) };
      radarRows.forEach((profile) => {
        const raw = Number(profile.values[featureIndex] || 0);
        row[profile.id] = Math.max(0, Math.min(100, (Math.abs(raw) / featureMax[featureIndex]) * 100));
        row[`${profile.id}Raw`] = raw;
      });
      return row;
    });
  }, [radarRows]);

  const showAllRadarProfiles = radarMode === "all";
  const radarProfiles = showAllRadarProfiles
    ? radarRows
    : radarRows.filter((row) => row.id === selectedPhenotypeId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phenotype Explorer"
        description="Inspect phenotype definitions, feature profiles, and side-by-side burden comparison."
        meta={
          <Chip
            size="md"
            dotColor={PHENOTYPE_BY_ID[selectedPhenotypeId]?.color.hex}
          >
            {selectedPhenotypeId} · {getPhenotypeShortLabel(selectedPhenotypeId)}
          </Chip>
        }
        actions={
          <Chip tone="accent" size="md">
            {selectedYear}
          </Chip>
        }
      />

      <PhenotypeLegend />

      {isLoading && (
        <div className="surface-2 flex items-center gap-3 rounded-md p-3.5 text-[13px] text-fg-tertiary">
          <Spinner />
          Loading phenotype explorer…
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
        className="relative z-20"
        eyebrow="Filters"
        title="Year"
        description="The year drives every chart on this page."
        density="compact"
      >
        <div className="max-w-xs">
          <FilterControl label="Year">
            <PremiumDropdown
              value={selectedYear}
              onChange={(v) => setSelectedYear(Number(v))}
              options={years.map((year) => ({ value: year, label: String(year) }))}
              listAriaLabel="Select year"
            />
          </FilterControl>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow={selectedPhenotypeId}
        title="Feature profile"
        description="Per-feature centroid values for the selected phenotype with plain-language interpretation."
        action={
          <Chip size="md" leadingIcon={Sparkles}>
            {featureRows.length} features
          </Chip>
        }
      >
        <SortableTable
          columns={[
            {
              key: "feature",
              label: "Feature",
              render: (row) => <span className="font-medium text-fg-primary">{row.feature}</span>,
            },
            {
              key: "valueDisplay",
              label: "Value",
              align: "right",
              tabular: true,
              render: (row) => (
                <span className="font-semibold text-fg-primary">{row.valueDisplay}</span>
              ),
            },
            {
              key: "interpretation",
              label: "Interpretation",
              render: (row) => (
                <span className="text-fg-secondary">{row.interpretation}</span>
              ),
            },
          ]}
          rows={featureRows}
          emptyMessage="No feature profile values available."
        />
      </SectionCard>

      <SectionCard
        className="relative z-10"
        eyebrow="Cross-phenotype"
        title="Feature comparison"
        description="Compare a single feature across every phenotype centroid."
      >
        <div className="relative z-20 mb-4 max-w-xl">
          <FilterControl label="Feature">
            <PremiumDropdown
              value={featureKey}
              onChange={setFeatureKey}
              disabled={comparisonFeatureOptions.length === 0}
              options={comparisonFeatureOptions.map((option) => ({
                value: option.key,
                label: option.label,
              }))}
              listAriaLabel="Select feature"
            />
          </FilterControl>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface-3 p-3">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonChartData}
                margin={{ top: 24, right: 16, left: -12, bottom: 8 }}
                barCategoryGap="22%"
              >
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="id" {...AXIS_STYLE} />
                <YAxis
                  {...AXIS_STYLE}
                  tickFormatter={(value) =>
                    BINARY_FEATURES.has(featureKey)
                      ? `${(Number(value || 0) * 100).toFixed(0)}%`
                      : Number(value || 0).toFixed(1)
                  }
                />
                <Tooltip
                  content={<ComparisonTip isBinary={BINARY_FEATURES.has(featureKey)} />}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="value" barSize={56} radius={[8, 8, 0, 0]}>
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(value) =>
                      BINARY_FEATURES.has(featureKey)
                        ? `${(Number(value || 0) * 100).toFixed(1)}%`
                        : Number(value || 0).toFixed(2)
                    }
                    style={{
                      fill: "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  />
                  {comparisonChartData.map((row) => (
                    <Cell key={`feature-bar-${row.id}`} fill={row.colorHex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        className="relative z-30"
        eyebrow="Multi-dimensional"
        title="Phenotype feature profile"
        description="Per-feature scaling 0–100 across age, diagnosis burden, utilization, and medication."
      >
        <div className="relative z-40 mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <FilterControl label="Phenotype">
              <PremiumDropdown
                value={selectedPhenotypeId}
                onChange={setSelectedPhenotypeId}
                disabled={isLoading || phenotypes.length === 0}
                options={phenotypes.map((item) => ({
                  value: item.id,
                  label: getStandardPhenotypeLabel(item.id),
                }))}
                listAriaLabel="Select phenotype for radar"
              />
            </FilterControl>
          </div>
          <div className="flex justify-start sm:justify-end">
            <SegmentedControl
              tone="accent"
              value={radarMode}
              onChange={setRadarMode}
              options={[
                { value: "selected", label: "Selected" },
                { value: "all", label: "Compare all", icon: Layers },
              ]}
            />
          </div>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface-3 p-3">
          <div className="h-[420px] sm:h-[460px] lg:h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarChartData} outerRadius="78%">
                <PolarGrid stroke="var(--border-default)" />
                <PolarAngleAxis
                  dataKey="featureLabel"
                  tick={{
                    fill: "var(--text-tertiary)",
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip content={<RadarTip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    color: "var(--text-tertiary)",
                    fontSize: 12,
                    paddingTop: 6,
                  }}
                  formatter={(value) => (
                    <span style={{ color: "var(--text-secondary)", marginRight: 4 }}>
                      {`${value} · ${getPhenotypeShortLabel(String(value))}`}
                    </span>
                  )}
                />
                {radarProfiles.map((row) => {
                  const isSelected = row.id === selectedPhenotypeId;
                  return (
                    <Radar
                      key={row.id}
                      name={row.id}
                      dataKey={row.id}
                      stroke={row.colorHex}
                      fill={row.colorHex}
                      fillOpacity={isSelected ? 0.32 : 0.08}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      dot={isSelected}
                    />
                  );
                })}
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 px-1 text-[11px] leading-snug text-fg-quaternary">
            Values scaled per feature so shapes are directly comparable. The selected phenotype is emphasized.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Linear breakdown"
        title="Feature breakdown per phenotype"
        description="The same six clinical features expressed as horizontal bars per phenotype — easier to scan than the polar form."
      >
        <div className="grid gap-2.5">
          {radarRows.map((row) => {
            const isSelected = row.id === selectedPhenotypeId;
            const maxRadar = 4;
            return (
              <div
                key={`bars-${row.id}`}
                className={cn(
                  "surface-2 group flex flex-col gap-3 rounded-md p-4 transition",
                  isSelected && "ring-1",
                )}
                style={{
                  background: `radial-gradient(circle 14rem at 0% 0%, ${row.colorHex}10, transparent 65%), linear-gradient(180deg, var(--surface-2), var(--surface-1))`,
                  ...(isSelected
                    ? { boxShadow: `inset 0 0 0 1px ${row.colorHex}50, var(--shadow-sm)` }
                    : null),
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-flex h-6 w-9 items-center justify-center rounded-md text-[11.5px] font-semibold tabular"
                      style={{
                        color: row.colorHex,
                        backgroundColor: `${row.colorHex}1c`,
                        boxShadow: `inset 0 0 0 1px ${row.colorHex}38`,
                      }}
                    >
                      {row.id}
                    </span>
                    <span className="text-[13.5px] font-medium text-fg-primary">
                      {getPhenotypeShortLabel(row.id)}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-quaternary">
                        Selected
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-fg-quaternary">
                    Feature breakdown
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {row.values.map((value, index) => {
                    const ratio = Math.max(0, Math.min(1, Math.abs(value) / maxRadar));
                    const heightPct = Math.max(6, ratio * 100);
                    const featureName = RADAR_FEATURES[index];
                    return (
                      <div
                        key={`${row.id}-${featureName}`}
                        className="flex min-w-0 flex-col items-center gap-1.5"
                        title={`${getFeatureLabel(featureName)} · ${Number(value || 0).toFixed(3)}`}
                      >
                        <div className="relative flex h-16 w-full items-end justify-center overflow-hidden rounded-md border border-border-subtle bg-white/[0.025]">
                          <div
                            className="w-3 rounded-t-sm transition-all duration-500 ease-out"
                            style={{
                              height: `${heightPct}%`,
                              background: `linear-gradient(180deg, ${row.colorHex} 0%, ${row.colorHex}99 100%)`,
                              boxShadow: `0 0 8px ${row.colorHex}55`,
                            }}
                          />
                        </div>
                        <p className="w-full truncate text-center text-[10px] leading-3 text-fg-quaternary">
                          {getFeatureLabel(featureName)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
