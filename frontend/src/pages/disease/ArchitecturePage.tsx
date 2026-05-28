import { Server } from "lucide-react";
import { GovernanceBanner } from "@/components/disease/ui/GovernanceBanner";
import { PageHeader } from "@/components/disease/ui/PageHeader";
import { useDashboardBundle } from "@/routes/DiseaseDashboardLayout";

export function ArchitecturePage() {
  const data = useDashboardBundle();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Federated learning architecture"
        description="Four simulated clients train with FedAvg: data stays on each client; only model updates go to the server. Proof-of-concept only."
      />

      <GovernanceBanner title="Privacy framing">
        FL still has privacy limits (see limitations). Secure aggregation and differential privacy are not in this step.
      </GovernanceBanner>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-panel p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Logical topology</h2>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Each client keeps its own data. Each round they send updates; the server averages them (FedAvg).
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Clients</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)] tabular-nums">
                {data.projectSummary.number_of_clients}
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">Synthetic random split — not institution-based.</p>
            </div>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Server role</p>
              <div className="mt-2 flex items-center gap-2 text-[var(--text-primary)]">
                <Server className="h-8 w-8 text-[var(--accent)]" />
                <span className="text-sm font-medium">Global model orchestration</span>
              </div>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">Local simulator, not a production FL deployment.</p>
            </div>
          </div>
        </div>

        <div className="surface-panel p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">FedAvg in this project</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--text-tertiary)]">
            <li>Clients train on local batches; the server merges updates each round.</li>
            <li>Who joined each round is on the Federated Training page.</li>
            <li>Global validation numbers are for monitoring only.</li>
          </ul>
          <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)]/60 p-4 text-xs text-[var(--text-muted)]">
            {data.limitations.limitations.slice(0, 4).map((line) => (
              <p key={line} className="leading-relaxed">
                — {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
