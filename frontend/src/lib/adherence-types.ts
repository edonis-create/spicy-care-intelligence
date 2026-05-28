export interface AppSummary {
  generated_at_utc: string
  app_name: string
  app_version: string
  cohort: string
  medication_group: string
  observation_window: string
  prediction_window: string
  target_definition: string
  total_demo_patients: number
  average_predicted_risk: number
  observed_non_adherence_rate: number
  risk_group_counts: Record<string, number>
  risk_group_shares: Record<string, number>
  actual_outcome_counts: Record<string, number>
  prediction_correct_rate_at_0_5: number
  true_positive_count: number
  false_positive_count: number
  true_negative_count: number
  false_negative_count: number
  model_source: string
  centralized_baseline_metrics: ModelMetrics
  local_fl_metrics: ModelMetrics & { clients?: number; rounds?: number; algorithm?: string }
  nvflare_metrics: ModelMetrics & { clients?: number; rounds?: number; source_note?: string }
  federated_clients: number
  patient_identifier_policy: string
  privacy_notes: string[]
  limitations: string[]
  recommended_app_pages: string[]
  split_reconstruction_note?: string
}

export interface ModelMetrics {
  auroc?: number | null
  auprc?: number | null
  accuracy?: number | null
  precision?: number | null
  recall?: number | null
  specificity?: number | null
  f1?: number | null
  balanced_accuracy?: number | null
  brier_score?: number | null
  threshold?: number | null
}

export interface ModelComparisonRow {
  model_name: string
  training_mode: string
  auroc: number | null
  auprc: number | null
  accuracy: number | null
  precision: number | null
  recall: number | null
  specificity: number | null
  f1: number | null
  balanced_accuracy: number | null
  brier_score: number | null
  notes: string
}

export interface RiskGroupRow {
  risk_group: string
  patient_count: number
  patient_share: number
  average_predicted_risk: number | null
  observed_non_adherence_rate: number | null
  true_positive_count: number
  false_positive_count: number
  true_negative_count: number
  false_negative_count: number
}

export type RiskGroup = 'Low' | 'Medium' | 'High' | 'Very High'
export type ErrorType = 'true_positive' | 'false_positive' | 'true_negative' | 'false_negative'

export interface PatientRow {
  demo_patient_id: string
  predicted_risk: number
  risk_group: RiskGroup
  actual_label: number
  actual_outcome_text: string
  actual_pdc: number | null
  age_group_2015?: string
  age_at_2015?: number | null
  megye_mode_2015?: string
  client_id?: string
  c09_2015_pdc_observed?: number | null
  c09_2015_pdc_low_80_flag?: number | null
  c09_2015_records?: number | null
  c09_2015_gap_count_30d?: number | null
  c09_2015_gap_count_60d?: number | null
  c09_2015_longest_gap_days?: number | null
  c09_2015_days_since_last_fill_to_obs_end?: number | null
  c09_2015_has_q4_fill?: number | null
  all_rx_2015_records?: number | null
  all_rx_2015_unique_atc_l3?: number | null
  all_rx_2015_unique_ttt?: number | null
  all_rx_2015_polypharmacy_atc_l3_ge_5?: number | null
  all_rx_2015_polypharmacy_atc_l3_ge_10?: number | null
  cv_2015_records?: number | null
  cv_2015_c09_share_of_all_records?: number | null
  dx_2015_has_I_circulatory?: number | null
  dx_2015_has_E_endocrine?: number | null
  dx_2015_has_N_genitourinary?: number | null
  dx_2015_has_J_respiratory?: number | null
  prediction_correct: number
  prediction_error_type: ErrorType
  model_source: string
}

export type SortDir = 'asc' | 'desc'
