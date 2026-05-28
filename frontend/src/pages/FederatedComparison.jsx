import { useEffect, useState } from "react";
import { getApiErrorMessage, getComparison } from "../api";
import { PageHeader } from "../components/PageHeader";
import { SortableTable } from "../components/SortableTable";
import { Spinner } from "../components/Spinner";
import { StatusBanner } from "../components/StatusBanner";
import { useYear } from "../context/yearContext";

export function FederatedComparison() {
  const { selectedYear } = useYear();
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getComparison(selectedYear)
      .then((data) => {
        if (!mounted) return;
        setPayload(data);
        setError("");
        setIsLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(getApiErrorMessage(err, "Unable to load federated vs centralized comparison."));
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedYear]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Federated vs Centralized Comparison"
        description="Compare federated outcomes against centralized baselines for metrics and phenotype shares."
      />

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <Spinner />
          Loading comparison metrics...
        </div>
      )}
      {error && <StatusBanner tone="error" message={error} />}
      {!error && payload?.status?.state === "warning" && (
        <StatusBanner tone="warning" message={payload.status.message} details={payload.status.missing_files || []} />
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Side-by-Side Metrics</h2>
        <SortableTable
          columns={[
            { key: "metric", label: "Metric" },
            { key: "centralized", label: "Centralized", render: (row) => Number(row.centralized).toFixed(3) },
            { key: "federated", label: "Federated", render: (row) => Number(row.federated).toFixed(3) },
            { key: "difference", label: "Difference", render: (row) => Number(row.difference).toFixed(3) },
          ]}
          rows={(payload?.metrics || []).map((item) => ({ ...item, id: item.metric }))}
          emptyMessage="No comparison metrics available."
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Cluster Share Comparison</h2>
        <SortableTable
          columns={[
            { key: "phenotype_id", label: "Phenotype" },
            { key: "centralized_share", label: "Centralized Share", render: (row) => `${Number(row.centralized_share).toFixed(2)}%` },
            { key: "federated_share", label: "Federated Share", render: (row) => `${Number(row.federated_share).toFixed(2)}%` },
            { key: "difference", label: "Difference", render: (row) => `${Number(row.difference).toFixed(2)}%` },
          ]}
          rows={(payload?.cluster_share_comparison || []).map((item) => ({ ...item, id: item.phenotype_id }))}
          emptyMessage="No cluster share comparison rows available."
        />
      </section>
    </div>
  );
}
