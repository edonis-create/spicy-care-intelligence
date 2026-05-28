import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/disease/ui/PageHeader";
import { StatusBadge } from "@/components/disease/ui/StatusBadge";
import { useDashboardBundle } from "@/routes/DiseaseDashboardLayout";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = any;

const REQUIRED_BEFORE_CLINICAL_USE = [
  "Complete real-institution partner site validation with non-synthetic data splits",
  "Independent external validation on a held-out population",
  "Clinical stakeholder review of risk band thresholds and recommended actions",
  "Data governance and privacy impact assessment for patient-level deployment",
  "Secure production deployment with RBAC, audit logging, and access controls",
  "Calibration verification on target deployment population",
  "Regulatory and ethics approval as required by jurisdiction",
];

export function GovernancePage() {
  const data = useDashboardBundle();

  const limitationsDoc = data.limitations as AnyJson;
  const limitationsArr: Array<{ id: string; description: string }> =
    Array.isArray(limitationsDoc?.limitations) ? limitationsDoc.limitations : [];

  const productLimitations: string[] = Array.isArray(data.productRiskSummary?.limitations)
    ? data.productRiskSummary.limitations
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governance & Limitations"
        description="Required reading before using risk scores in any patient-facing workflow. This product is for planning use only."
      />

      {/* Status banner */}
      <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-4 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Not approved for direct clinical use</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">
            This dashboard provides aggregate population risk scores for planning and prioritisation purposes only.
            No individual clinical action should be taken based solely on these scores without completing the required
            validation steps listed below and obtaining appropriate governance approvals.
          </p>
        </div>
      </div>

      {/* What this product is / is not */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel p-6 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Appropriate uses</h2>
          </div>
          <ul className="space-y-2">
            {[
              "Population-level risk stratification for prevention programme planning",
              "Capacity planning: how many patients to prioritise for outreach",
              "Internal stakeholder presentations and funding cases",
              "Research and exploratory analysis of cohort risk profiles",
              "Evaluation of model readiness before production deployment",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="surface-panel p-6 space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-[var(--danger)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Not appropriate for</h2>
          </div>
          <ul className="space-y-2">
            {[
              "Direct clinical decision-making for individual patients",
              "Withholding or prioritising care without clinical oversight",
              "Communicating individual risk scores to patients without governance approval",
              "Replacing clinical judgement or established screening guidelines",
              "Any production patient-facing workflow before completing required steps below",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Required before clinical use */}
      <div className="surface-panel p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Required before clinical deployment</h2>
        <p className="text-xs text-[var(--text-muted)]">All items must be completed before use in any patient-facing workflow</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {REQUIRED_BEFORE_CLINICAL_USE.map((item) => (
            <div key={item} className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
              <StatusBadge tone="warning" label="Pending" />
              <p className="text-xs text-[var(--text-secondary)] leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Model & data limitations */}
      <div className="grid gap-4 lg:grid-cols-2">
        {limitationsArr.length > 0 && (
          <div className="surface-panel p-6 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Known limitations</h2>
            <ul className="space-y-2">
              {limitationsArr.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm text-[var(--text-tertiary)]">
                  <span className="mt-0.5 rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--text-muted)]">
                    {item.id}
                  </span>
                  {item.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {productLimitations.length > 0 && (
          <div className="surface-panel p-6 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Scoring run notes</h2>
            <ul className="space-y-2">
              {productLimitations.map((item) => (
                <li key={item} className="border-l-2 border-[var(--border-default)] pl-3 text-sm text-[var(--text-tertiary)] leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-subtle)] pt-4">
        {data.productRiskSummary?.privacy_note} · Aggregate dashboard only — no patient identifiers present.
      </p>
    </div>
  );
}
