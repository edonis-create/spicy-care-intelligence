import calibrationCsv from "@disease-data/calibration_summary.csv?raw";
import centralizedCsv from "@disease-data/centralized_vs_federated_metrics.csv?raw";
import featureCsv from "@disease-data/feature_importance_summary.csv?raw";
import flClientCsv from "@disease-data/fl_client_summary.csv?raw";
import flRoundsCsv from "@disease-data/fl_training_rounds.csv?raw";
import thresholdCsv from "@disease-data/threshold_analysis_summary.csv?raw";
import temporalCsv from "@disease-data/temporal_validation_metrics.csv?raw";
import dashboardManifest from "@disease-data/dashboard_manifest.json";
import limitationsJson from "@disease-data/limitations.json";
import modelRegistryJson from "@disease-data/model_registry.json";
import projectSummaryJson from "@disease-data/project_summary.json";
import riskBandSummaryJson from "@disease-data/risk_band_summary.json";
import topKJson from "@disease-data/top_k_intervention_summary.json";
import thresholdScenariosJson from "@disease-data/threshold_scenario_summary.json";
import riskDistributionJson from "@disease-data/risk_score_distribution.json";
import productRiskSummaryJson from "@disease-data/product_risk_scoring_summary.json";
import demoPatientsJson from "@disease-data/patient_demo_sample.json";
import { parseCsv } from "./parseCsv";
import type {
  CalibrationRow,
  CentralizedVsFederatedRow,
  DashboardBundle,
  FeatureImportanceRow,
  FlClientSummaryRow,
  FlTrainingRoundRow,
  TemporalValidationRow,
  ThresholdAnalysisRow,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = any;

export function loadDashboardBundle(): DashboardBundle {
  return {
    manifest: dashboardManifest as AnyJson,
    projectSummary: projectSummaryJson as AnyJson,
    modelRegistry: modelRegistryJson as AnyJson,
    centralizedVsFederated: parseCsv<CentralizedVsFederatedRow>(centralizedCsv),
    flTrainingRounds: parseCsv<FlTrainingRoundRow>(flRoundsCsv),
    flClientSummary: parseCsv<FlClientSummaryRow>(flClientCsv),
    thresholdAnalysis: parseCsv<ThresholdAnalysisRow>(thresholdCsv),
    calibration: parseCsv<CalibrationRow>(calibrationCsv),
    temporalValidation: parseCsv<TemporalValidationRow>(temporalCsv),
    featureImportance: parseCsv<FeatureImportanceRow>(featureCsv),
    limitations: limitationsJson as AnyJson,
    // Risk scoring (Step 25)
    riskBands: (riskBandSummaryJson as { risk_bands: DashboardBundle["riskBands"] }).risk_bands,
    topKIntervention: (topKJson as { top_k_groups: DashboardBundle["topKIntervention"] }).top_k_groups,
    thresholdScenarios: (thresholdScenariosJson as { thresholds: DashboardBundle["thresholdScenarios"] }).thresholds,
    riskScoreDistribution: (riskDistributionJson as { distribution: DashboardBundle["riskScoreDistribution"] }).distribution,
    productRiskSummary: productRiskSummaryJson as DashboardBundle["productRiskSummary"],
    demoPatients: (demoPatientsJson as { patients: DashboardBundle["demoPatients"] }).patients,
  };
}
