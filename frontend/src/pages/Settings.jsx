import { PageHeader } from "../components/PageHeader";
import { PhenotypeLegend } from "../components/PhenotypeLegend";
import { SectionCard } from "../components/ui/SectionCard";

const SETTING_ROWS = [
  {
    title: "Year defaults",
    description:
      "Pin a default year and the order used in stratification navigation. Controls are not wired in this build.",
  },
  {
    title: "Artifact paths",
    description:
      "Expected output directories for summaries, profiles, mappings, and validation files. Configure in the deployment environment.",
  },
  {
    title: "Phenotype palette",
    description:
      "Colors, codes, and legend order across charts. Preview below; editing is not available yet.",
  },
];

const PRIVACY_POINTS = [
  "PHI fields are never transferred to the dashboard runtime.",
  "Cell suppression: groups with n < 10 are not displayed.",
  "Federated runs aggregate per-site centroids, not raw rows.",
  "Audit log is written to /logs/dashboard-access.log.",
];

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace defaults, data sources, and display preferences. Most options are informational until backend wiring lands."
        showEyebrow={false}
      />

      <SectionCard density="tight" title="Configuration" description="What this workspace expects.">
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
          {SETTING_ROWS.map((row) => (
            <li key={row.title} className="px-4 py-3.5">
              <p className="text-[13.5px] font-semibold text-fg-primary">{row.title}</p>
              <p className="mt-1 text-[13px] leading-5 text-fg-tertiary">{row.description}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        density="tight"
        eyebrow="Display"
        title="Phenotype palette preview"
        description="Colors and codes used across the dashboard."
      >
        <PhenotypeLegend />
      </SectionCard>

      <SectionCard
        density="tight"
        eyebrow="Compliance"
        title="Privacy and access"
        description="Patient-level features stay off in this build. Exports follow aggregate rules and site thresholds."
      >
        <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-fg-secondary marker:text-fg-tertiary">
          {PRIVACY_POINTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
