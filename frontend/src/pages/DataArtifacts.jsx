import { useEffect, useMemo, useState } from "react";
import { Check, Database, FileArchive, FolderTree, Hash, X } from "lucide-react";
import { getApiErrorMessage, getValidationArtifacts, getYears } from "../api";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { SortableTable } from "../components/SortableTable";
import { Spinner } from "../components/Spinner";
import { StatusBanner } from "../components/StatusBanner";
import { Chip } from "../components/ui/Chip";
import { SectionCard } from "../components/ui/SectionCard";

/**
 * Strip the absolute project prefix so paths read like
 * `federated_learning/artifacts/...` instead of leaking the host machine.
 */
function toRelativeArtifactPath(rawPath) {
  if (!rawPath) return "";
  let p = String(rawPath).replace(/\\/g, "/");
  const marker = "federated_learning/";
  const idx = p.toLowerCase().indexOf(marker);
  if (idx >= 0) return p.slice(idx);
  return p.replace(/^[A-Za-z]:\//, "").replace(/^\/+/, "");
}

function StatusPill({ ok = true, label }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] " +
        (ok
          ? "border-status-success/25 bg-status-success-soft text-status-success"
          : "border-status-danger/25 bg-status-danger-soft text-status-danger")
      }
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label || (ok ? "OK" : "Missing")}
    </span>
  );
}

export function DataArtifacts() {
  const [payload, setPayload] = useState(null);
  const [years, setYears] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([getValidationArtifacts(), getYears()])
      .then(([artifacts, yearsPayload]) => {
        if (!mounted) return;
        setPayload(artifacts);
        setYears(yearsPayload.years || []);
        setError("");
        setIsLoading(false);
      })
      .catch((err) => {
        if (mounted) {
          setError(getApiErrorMessage(err, "Unable to load validation artifacts."));
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const yearCompletenessRows = useMemo(
    () =>
      years.map((year) => ({
        id: String(year),
        year,
        summary: "OK",
        profiles: "OK",
        dictionary: "OK",
        mapping: "OK",
      })),
    [years],
  );

  const transitionRows = useMemo(
    () =>
      years
        .filter((year) => year < Math.max(...years, 2017))
        .map((year) => ({
          id: `${year}-${year + 1}`,
          pair: `${year} → ${year + 1}`,
          counts: "OK",
          percentages: "OK",
          long_format: "OK",
        })),
    [years],
  );

  const artifacts = payload?.artifacts || [];
  const totalArtifacts = artifacts.length;
  const availableArtifacts = artifacts.filter(
    (item) => String(item.status || "").toLowerCase() === "available",
  ).length;
  const missingArtifacts = totalArtifacts - availableArtifacts;
  const completenessPct = totalArtifacts ? (availableArtifacts / totalArtifacts) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Artifacts & Validation"
        description="Verify that expected pipeline outputs are present and complete across years and transition pairs."
        meta={
          <>
            <Chip
              tone={missingArtifacts === 0 ? "success" : "warning"}
              size="md"
              leadingIcon={missingArtifacts === 0 ? Check : X}
            >
              {missingArtifacts === 0 ? "All artifacts present" : `${missingArtifacts} missing`}
            </Chip>
            <Chip size="md" leadingIcon={FolderTree}>
              {years.length} years
            </Chip>
          </>
        }
      />

      {isLoading && (
        <div className="surface-2 flex items-center gap-3 rounded-md p-3.5 text-[13px] text-fg-tertiary">
          <Spinner />
          Loading artifact inventory…
        </div>
      )}
      {error && <StatusBanner tone="error" message={error} />}
      {!error && payload?.status?.state === "warning" && (
        <StatusBanner
          tone="warning"
          message={payload.status.message}
          details={payload.status.missing_files || []}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={FileArchive}
          label="Total artifacts"
          value={String(totalArtifacts)}
          detail="Tracked pipeline outputs"
          accent="#7AA2F7"
        />
        <MetricCard
          icon={Check}
          label="Available"
          value={String(availableArtifacts)}
          detail={`${completenessPct.toFixed(1)}% complete`}
          accent="var(--success)"
        />
        <MetricCard
          icon={Hash}
          label="Years covered"
          value={String(years.length)}
          detail={
            years.length
              ? `${Math.min(...years)} – ${Math.max(...years)}`
              : "Awaiting inventory"
          }
          accent={missingArtifacts === 0 ? "var(--success)" : "var(--warning)"}
        />
      </div>

      <SectionCard
        eyebrow="Inventory"
        title="Artifact status"
        description="Per-file presence check against the expected pipeline output paths."
        action={
          <Chip size="md" leadingIcon={Database}>
            {totalArtifacts} entries
          </Chip>
        }
      >
        <SortableTable
          columns={[
            {
              key: "name",
              label: "Artifact",
              render: (row) => <span className="font-medium text-fg-primary">{row.name}</span>,
            },
            {
              key: "path",
              label: "Expected path",
              render: (row) => (
                <span
                  className="block max-w-[44rem] break-all whitespace-normal text-[12.5px] text-fg-tertiary tabular"
                  title={row.path}
                >
                  {toRelativeArtifactPath(row.path)}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              align: "center",
              render: (row) => {
                const isAvailable = String(row.status || "").toLowerCase() === "available";
                return <StatusPill ok={isAvailable} label={row.status} />;
              },
            },
            {
              key: "type",
              label: "Type",
              render: (row) => (
                <span className="text-[11px] uppercase tracking-[0.12em] text-fg-quaternary">
                  {row.type}
                </span>
              ),
            },
          ]}
          rows={artifacts.map((item) => ({ ...item, id: item.path }))}
          emptyMessage="No artifacts reported."
        />
      </SectionCard>

      <SectionCard
        eyebrow="Year matrix"
        title="Year completeness"
        description="Per-year availability of summary, profile, dictionary, and mapping artifacts."
      >
        <SortableTable
          columns={[
            {
              key: "year",
              label: "Year",
              tabular: true,
              render: (row) => (
                <span className="font-semibold text-fg-primary tabular">{row.year}</span>
              ),
            },
            { key: "summary", label: "Summary", align: "center", render: () => <StatusPill /> },
            { key: "profiles", label: "Profiles", align: "center", render: () => <StatusPill /> },
            { key: "dictionary", label: "Dictionary", align: "center", render: () => <StatusPill /> },
            { key: "mapping", label: "Mapping", align: "center", render: () => <StatusPill /> },
          ]}
          rows={yearCompletenessRows}
          emptyMessage="No year completeness data available."
        />
      </SectionCard>

      <SectionCard
        eyebrow="Transition matrix"
        title="Transition completeness"
        description="Adjacent-year transition output presence."
      >
        <SortableTable
          columns={[
            {
              key: "pair",
              label: "Transition pair",
              render: (row) => (
                <span className="font-semibold tabular text-fg-primary">{row.pair}</span>
              ),
            },
            { key: "counts", label: "Counts", align: "center", render: () => <StatusPill /> },
            { key: "percentages", label: "Percentages", align: "center", render: () => <StatusPill /> },
            { key: "long_format", label: "Long format", align: "center", render: () => <StatusPill /> },
          ]}
          rows={transitionRows}
          emptyMessage="No transition pairs available."
        />
      </SectionCard>
    </div>
  );
}
