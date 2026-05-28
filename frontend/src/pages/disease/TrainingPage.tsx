import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/disease/charts/ChartCard";
import { DataTable, type Column } from "@/components/disease/ui/DataTable";
import { PageHeader } from "@/components/disease/ui/PageHeader";
import { GovernanceBanner } from "@/components/disease/ui/GovernanceBanner";
import { chartAxisColor, chartColors, chartGridStroke, chartTooltipProps } from "@/charts/disease/chartTheme";
import { useTheme } from "@/context/disease/AppProviders";
import { useDashboardBundle } from "@/routes/DiseaseDashboardLayout";
import { formatFixed, formatInt } from "@/lib/disease/format";
import { num } from "@/lib/disease/numbers";
import type { FlTrainingRoundRow } from "@/data/disease/types";

export function TrainingPage() {
  const data = useDashboardBundle();
  const { theme } = useTheme();

  const rounds = data.flTrainingRounds.map((r) => ({
    round: Number(r.round),
    loss: num(r.global_weighted_loss),
    auroc: num(r.global_weighted_auroc),
    auprc: num(r.global_weighted_auprc),
    brier: num(r.global_weighted_brier),
    participating: Number(r.participating_clients),
  }));

  const participationColumns: Column<FlTrainingRoundRow>[] = [
    { key: "r", header: "Round", render: (r) => r.round },
    {
      key: "p",
      header: "Participating clients",
      render: (r) => r.participating_clients,
    },
    {
      key: "rows",
      header: "Validation rows",
      render: (r) => formatInt(num(r.total_validation_rows)),
    },
    {
      key: "pos",
      header: "Validation positives",
      render: (r) => formatInt(num(r.total_validation_positives)),
    },
    {
      key: "auroc",
      header: "AUROC",
      render: (r) => formatFixed(num(r.global_weighted_auroc), 4),
    },
    {
      key: "auprc",
      header: "AUPRC",
      render: (r) => formatFixed(num(r.global_weighted_auprc), 4),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Federated training progress"
        description="Global weighted validation metrics by FL round for the random four-client PyTorch MLP path."
      />

      <GovernanceBanner>
        FL probabilities are not calibrated in Step 23 — interpret probability-derived fields alongside the calibration
        page for the centralized path only.
      </GovernanceBanner>

      <ChartCard title="Discrimination and ranking metrics" subtitle="AUROC and AUPRC across rounds">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={rounds} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke(theme)} />
            <XAxis dataKey="round" tick={{ fill: chartAxisColor(theme), fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" domain={["auto", "auto"]} tick={{ fill: chartAxisColor(theme), fontSize: 12 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={["auto", "auto"]}
              tick={{ fill: chartAxisColor(theme), fontSize: 12 }}
            />
            <Tooltip {...chartTooltipProps(theme)} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="auroc" name="AUROC" stroke={chartColors.primary} dot={false} strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="auprc" name="AUPRC" stroke={chartColors.secondary} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Loss and Brier score" subtitle="Optimization signal vs probability error">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={rounds} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke(theme)} />
            <XAxis dataKey="round" tick={{ fill: chartAxisColor(theme), fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" domain={["auto", "auto"]} tick={{ fill: chartAxisColor(theme), fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" domain={["auto", "auto"]} tick={{ fill: chartAxisColor(theme), fontSize: 12 }} />
            <Tooltip {...chartTooltipProps(theme)} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="loss" name="Loss" stroke={chartColors.quaternary} strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="brier" name="Brier" stroke={chartColors.tertiary} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Round participation table</h2>
        <DataTable columns={participationColumns} rows={data.flTrainingRounds} rowKey={(r) => r.round} />
      </div>
    </div>
  );
}
