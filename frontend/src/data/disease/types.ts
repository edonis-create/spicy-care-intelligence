export interface DashboardManifest {
  generated_at: string;
  data_files: string[];
  source_artifacts: string[];
  dashboard_pages_supported: string[];
  privacy_classification: string;
  warnings: string[];
}

export interface ProjectSummary {
  project_name: string;
  use_case: string;
  disease_definition: string;
  observation_window: string;
  prediction_horizon: string;
  data_sources: string[];
  modelling_status: string;
  best_centralized_model: string;
  federated_simulation_status: string;
  number_of_clients: number;
  total_patients: number;
  total_positives: number;
  total_negatives: number;
  positive_rate: number;
}

export interface ModelRegistryEntry {
  model_id: string;
  model_name: string;
  model_type: string;
  training_mode: string;
  feature_set: string;
  calibration_status: string;
  output_path: string;
  status: string;
  notes: string;
}

export interface ModelRegistry {
  models: ModelRegistryEntry[];
}

export interface CentralizedVsFederatedRow {
  model_id: string;
  model_name: string;
  training_mode: string;
  model_type: string;
  AUROC: string;
  AUPRC: string;
  Brier: string;
  precision_at_0_5: string;
  recall_at_0_5: string;
  specificity_at_0_5: string;
  f1_at_0_5: string;
  notes: string;
}

export interface FlTrainingRoundRow {
  round: string;
  global_weighted_loss: string;
  global_weighted_auroc: string;
  global_weighted_auprc: string;
  global_weighted_brier: string;
  global_weighted_precision_at_0_5: string;
  global_weighted_recall_at_0_5: string;
  global_weighted_specificity_at_0_5: string;
  global_weighted_f1_at_0_5: string;
  total_validation_rows: string;
  total_validation_positives: string;
  participating_clients: string;
}

export interface FlClientSummaryRow {
  client_id: string;
  rows: string;
  positives: string;
  negatives: string;
  positive_rate: string;
  final_auroc: string;
  final_auprc: string;
  final_brier: string;
  final_recall: string;
  final_precision: string;
}

export interface ThresholdAnalysisRow {
  prediction_year: string;
  probability_version: string;
  threshold: string;
  precision: string;
  recall_sensitivity: string;
  specificity: string;
  f1: string;
  true_positives: string;
  false_positives: string;
  true_negatives: string;
  false_negatives: string;
  predicted_positive_rate: string;
  source: string;
}

export interface CalibrationRow {
  probability_version: string;
  AUROC: string;
  AUPRC: string;
  Brier_score: string;
  log_loss: string;
  precision_at_0_5: string;
  recall_sensitivity_at_0_5: string;
  specificity_at_0_5: string;
  f1_at_0_5: string;
  predicted_probability_mean: string;
  predicted_probability_median: string;
  predicted_probability_p95: string;
  predicted_probability_p99: string;
  model_id: string;
  calibration_status: string;
  note: string;
}

export interface TemporalValidationRow {
  prediction_year: string;
  observation_start: string;
  observation_end: string;
  prediction_start: string;
  prediction_end: string;
  labelled_patients: string;
  observation_population_patients: string;
  sampled_rows: string;
  train_rows: string;
  calibration_rows: string;
  test_rows: string;
  positive_patients_total: string;
  positive_rate_total: string;
  test_positive_rate: string;
  probability_version: string;
  AUROC: string;
  AUPRC: string;
  Brier_score: string;
  log_loss: string;
  precision_at_0_5: string;
  recall_sensitivity_at_0_5: string;
  specificity_at_0_5: string;
  f1_at_0_5: string;
}

export interface FeatureImportanceRow {
  feature: string;
  importance_gain: string;
  importance_split: string;
  rank_gain: string;
  rank_split: string;
  product_group: string;
  interpretation_note: string;
}

export interface LimitationsDoc {
  limitations: string[];
  production_readiness: string;
  required_before_clinical_use: string[];
}

// ── Risk scoring types (Step 25) ──────────────────────────────────────────────

export interface RiskBandRow {
  risk_band: string;
  percentile_min: number;
  percentile_max: number;
  patient_count: number;
  patient_percent: number;
  observed_positive_count: number;
  observed_positive_rate: number;
  captured_positive_count: number;
  captured_positive_percent: number;
  risk_enrichment_vs_population: number;
  mean_calibrated_risk: number | null;
  median_calibrated_risk: number | null;
  min_calibrated_risk: number | null;
  max_calibrated_risk: number | null;
}

export interface TopKRow {
  top_k_group: string;
  selected_patient_count: number;
  selected_patient_percent: number;
  observed_positive_count: number;
  observed_positive_rate: number;
  captured_positive_percent: number;
  risk_enrichment_vs_population: number;
  estimated_false_positives: number;
  estimated_false_negatives: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
  number_needed_to_review: number | null;
}

export interface ThresholdScenarioRow {
  threshold: number;
  selected_patient_count: number;
  selected_patient_percent: number;
  observed_positive_count: number;
  observed_positive_rate: number;
  captured_positive_percent: number;
  estimated_false_positives: number;
  estimated_false_negatives: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
  number_needed_to_review: number | null;
  workload_level: string;
}

export interface RiskScoreDistributionRow {
  bin_label: string;
  risk_min: number;
  risk_max: number;
  patient_count: number;
  patient_percent: number;
  observed_positive_count: number;
  observed_positive_rate: number;
  mean_calibrated_risk: number | null;
}

export interface ProductRiskSummary {
  use_case: string;
  disease_definition: string;
  model_id: string;
  model_version: string;
  scoring_date: string;
  total_patients_scored: number;
  total_observed_positives: number;
  total_observed_negatives: number;
  overall_positive_rate: number;
  calibrated_risk_min: number;
  calibrated_risk_mean: number;
  calibrated_risk_median: number;
  calibrated_risk_max: number;
  calibrated_risk_p01: number;
  calibrated_risk_p05: number;
  calibrated_risk_p25: number;
  calibrated_risk_p75: number;
  calibrated_risk_p95: number;
  calibrated_risk_p99: number;
  highest_risk_band: string;
  top_k_groups_generated: string[];
  thresholds_generated: number[];
  privacy_note: string;
  product_recommendation: string;
  limitations: string[];
}

export interface DemoPatient {
  patient_id: string;
  risk_score: number;
  risk_score_uncalibrated: number;
  risk_percentile: number;
  risk_decile: number;
  risk_band: string;
  top_1_pct: boolean;
  top_5_pct: boolean;
  top_10_pct: boolean;
  top_20_pct: boolean;
  observed_onset: boolean;
  age: number | null;
  sex: string;
  hypertension: boolean;
  obesity: boolean;
  cardiovascular: boolean;
  lipid_disorder: boolean;
  kidney_disease: boolean;
  mental_health: boolean;
  prescription_count: number;
  antihypertensive_med: boolean;
  lipid_lowering_med: boolean;
  antithrombotic_med: boolean;
  healthcare_contacts: number;
  unique_diagnoses: number;
}

// ── Dashboard bundle ──────────────────────────────────────────────────────────

export interface DashboardBundle {
  manifest: DashboardManifest;
  projectSummary: ProjectSummary;
  modelRegistry: ModelRegistry;
  centralizedVsFederated: CentralizedVsFederatedRow[];
  flTrainingRounds: FlTrainingRoundRow[];
  flClientSummary: FlClientSummaryRow[];
  thresholdAnalysis: ThresholdAnalysisRow[];
  calibration: CalibrationRow[];
  temporalValidation: TemporalValidationRow[];
  featureImportance: FeatureImportanceRow[];
  limitations: LimitationsDoc;
  // Risk scoring (Step 25)
  riskBands: RiskBandRow[];
  topKIntervention: TopKRow[];
  thresholdScenarios: ThresholdScenarioRow[];
  riskScoreDistribution: RiskScoreDistributionRow[];
  productRiskSummary: ProductRiskSummary;
  demoPatients: DemoPatient[];
}
