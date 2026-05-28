import type { CentralizedVsFederatedRow } from "@/data/disease/types";

const FEDERATED_FINAL_COMPARISON_ID = "federated_random_4_client_pytorch_mlp_final_round";
const CENTRALIZED_ENHANCED_CLINICAL_LGBM = "centralized_enhanced_clinical_lightgbm";
const CENTRALIZED_ENHANCED_CLINICAL_SIGMOID = "centralized_enhanced_clinical_sigmoid_calibrated";

function normModelId(modelId: string | undefined): string {
  return (modelId ?? "").trim().replace(/^\ufeff/, "");
}

function isFederatedFinalComparison(modelId: string | undefined): boolean {
  const id = normModelId(modelId);
  return (
    id === FEDERATED_FINAL_COMPARISON_ID ||
    id.endsWith("pytorch_mlp_final_round") ||
    (id.includes("federated") && id.includes("pytorch_mlp") && id.includes("final_round"))
  );
}

/** Metric table and prose: readable names only in UI; CSV `model_id` / `model_name` unchanged. */
export function comparisonModelDisplayName(row: Pick<CentralizedVsFederatedRow, "model_id" | "model_name">): string {
  if (isFederatedFinalComparison(row.model_id)) {
    return "Random 4-client FedAvg MLP (final round)";
  }
  const id = normModelId(row.model_id);
  if (id === CENTRALIZED_ENHANCED_CLINICAL_SIGMOID || id.includes("sigmoid_calibrated")) {
    return "Enhanced clinical LightGBM + sigmoid calibration";
  }
  if (id === CENTRALIZED_ENHANCED_CLINICAL_LGBM) {
    return "Enhanced clinical LightGBM";
  }
  return row.model_name;
}

/** Short category labels for bar charts (Compare + Overview). */
export function comparisonModelChartLabel(row: Pick<CentralizedVsFederatedRow, "model_id">): string {
  if (isFederatedFinalComparison(row.model_id)) {
    return "Random 4-client FedAvg MLP";
  }
  const id = normModelId(row.model_id);
  if (id.includes("federated")) return "FL final";
  if (id.includes("sigmoid")) return "Centralized calibrated";
  return "Centralized raw scores";
}
