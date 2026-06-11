import { useEffect, useState } from 'react'
import type { AppSummary, ModelComparisonRow, RiskGroupRow } from '@/lib/adherence-types'
import MetricCard from '@/components/adherence/MetricCard'
import SectionCard from '@/components/adherence/SectionCard'
import RiskBarChart from '@/components/adherence/RiskBarChart'
import Badge from '@/components/adherence/Badge'

function pct(v: number | null | undefined) {
  if (v == null) return '—'
  return (v * 100).toFixed(1) + '%'
}
function dec(v: number | null | undefined, d = 3) {
  if (v == null) return '—'
  return v.toFixed(d)
}
function StatRow({ label, value, highlight, desc }: { label: string; value: string; highlight?: boolean; desc?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <span className="text-muted" style={{ fontSize: 12 }}>{label}</span>
        {desc && <p style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 1 }}>{desc}</p>}
      </div>
      <span className="font-semibold tabular shrink-0" style={{ fontSize: 13, color: highlight ? 'var(--success)' : 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

const MODEL_DISPLAY: Record<string, { label: string; badge: string }> = {
  centralized_logistic_baseline: { label: 'Centralized Baseline', badge: 'info' },
  local_fedavg_pytorch:          { label: 'Local FedAvg (PyTorch)', badge: 'warning' },
  nvflare_fedavg_pytorch:        { label: 'NVIDIA FLARE FedAvg', badge: 'success' },
}

interface PageData {
  summary: AppSummary
  modelRows: ModelComparisonRow[]
  riskRows: RiskGroupRow[]
}

export default function AdherenceDashboardPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/adherence/summary').then(r => r.json()),
      fetch('/api/adherence/risk-groups').then(r => r.json()),
      fetch('/api/adherence/model-comparison').then(r => r.json()),
    ])
      .then(([summary, riskRows, modelRows]) => {
        setData({ summary, riskRows, modelRows })
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  if (loading) return <div className="p-8 text-center text-muted" style={{ fontSize: 13 }}>Loading adherence data…</div>
  if (error || !data) return <div className="p-8 text-center" style={{ color: 'var(--danger)', fontSize: 13 }}>Failed to load data. Make sure the backend is running.</div>

  const { summary: s, modelRows, riskRows } = data
  const cm = s.centralized_baseline_metrics
  const total = s.total_demo_patients
  const tp = s.true_positive_count, fp = s.false_positive_count
  const tn = s.true_negative_count, fn = s.false_negative_count

  const metricIcons = {
    patients: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6.5" r="3" fill="currentColor" opacity=".9"/><path d="M2 15.5c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>,
    risk:     <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l1.5 5h5L12 10.5l1.5 5L9 13l-4.5 2.5 1.5-5L2.5 7h5L9 2z" fill="currentColor" opacity=".8"/></svg>,
    nonadh:   <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M9 5.5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    auroc:    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 14C4 14 6 8 9 8s5 6 7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>,
    auprc:    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="10" width="3" height="6" rx="1" fill="currentColor" opacity=".5"/><rect x="7" y="6" width="3" height="10" rx="1" fill="currentColor" opacity=".7"/><rect x="12" y="2" width="3" height="14" rx="1" fill="currentColor"/></svg>,
    brier:    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="9" cy="9" r="2.5" fill="currentColor" opacity=".7"/></svg>,
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard eyebrow="Test-set patients" value={total.toLocaleString()} sub="15% stratified test split · random_state 42" tone="neutral" icon={metricIcons.patients} animDelay={0} />
        <MetricCard eyebrow="Avg predicted risk" value={s.average_predicted_risk.toFixed(3)} sub="Mean probability of 2016 non-adherence" tone="warning" icon={metricIcons.risk} animDelay={60} />
        <MetricCard eyebrow="Observed non-adherence" value={pct(s.observed_non_adherence_rate)} sub="PDC < 0.80 in 2016 prediction window" tone="danger" icon={metricIcons.nonadh} animDelay={120} />
        <MetricCard eyebrow="AUROC" value={dec(cm.auroc, 4)} sub="Area under ROC curve · centralized baseline" tone="success" icon={metricIcons.auroc} animDelay={180} />
        <MetricCard eyebrow="AUPRC" value={dec(cm.auprc, 4)} sub="Area under precision-recall curve" tone="info" icon={metricIcons.auprc} animDelay={240} />
        <MetricCard eyebrow="Brier Score" value={dec(cm.brier_score, 4)} sub="Calibration quality (lower = better)" tone="neutral" icon={metricIcons.brier} animDelay={300} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard eyebrow="Risk Profile" title="Risk Group Distribution" animDelay={360}>
          <RiskBarChart data={riskRows} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            {riskRows.map(r => (
              <div key={r.risk_group} className="s3 px-3 py-2 flex items-center justify-between">
                <span className="text-muted" style={{ fontSize: 12 }}>{r.risk_group}</span>
                <div className="text-right">
                  <span className="tabular font-semibold" style={{ fontSize: 13 }}>{r.patient_count.toLocaleString()}</span>
                  <span className="text-muted ml-1.5" style={{ fontSize: 11 }}>({pct(r.patient_share)})</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Model Performance" title="Prediction at Threshold 0.50" animDelay={420}>
          <StatRow label="Accuracy" value={pct(cm.accuracy)} desc="Share of all patients correctly classified as adherent or non-adherent" />
          <StatRow label="Precision (PPV)" value={pct(cm.precision)} desc="Of patients flagged non-adherent, how many truly are — minimises unnecessary interventions" />
          <StatRow label="Recall (Sensitivity)" value={pct(cm.recall)} desc="Share of truly non-adherent patients the model correctly identifies — minimises missed cases" />
          <StatRow label="Specificity" value={pct(cm.specificity)} desc="Share of adherent patients correctly identified as low-risk" />
          <StatRow label="F1 Score" value={dec(cm.f1, 4)} desc="Harmonic mean of Precision and Recall — useful when classes are imbalanced" />
          <StatRow label="Balanced Accuracy" value={pct(cm.balanced_accuracy)} highlight desc="Average of Sensitivity and Specificity — key metric for imbalanced datasets" />
          <StatRow label="Brier Score" value={dec(cm.brier_score, 4)} desc="Mean squared error of predicted probabilities — lower is better, 0 is perfect" />
          <div className="mt-4">
            <p className="text-eyebrow mb-2">Confusion Matrix</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'True Positive', value: tp, tone: 'success' as const },
                { label: 'False Positive', value: fp, tone: 'warning' as const },
                { label: 'False Negative', value: fn, tone: 'danger' as const },
                { label: 'True Negative', value: tn, tone: 'info' as const },
              ].map(({ label, value, tone }) => (
                <div key={label} className="s3 px-3 py-2 text-center">
                  <p className="text-muted" style={{ fontSize: 11 }}>{label}</p>
                  <p className={`font-semibold tabular text-${tone}`} style={{ fontSize: 18 }}>{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between s3 px-3 py-2">
            <span className="text-muted" style={{ fontSize: 12 }}>Prediction correct rate</span>
            <span className="text-success font-semibold tabular" style={{ fontSize: 15 }}>{pct(s.prediction_correct_rate_at_0_5)}</span>
          </div>
        </SectionCard>
      </div>

      <SectionCard eyebrow="Federated Learning" title="Model Comparison — Test Set" animDelay={480} bodyClass="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Model', 'Training Mode', 'AUROC', 'AUPRC', 'Accuracy', 'Precision', 'Recall', 'F1', 'Brier'].map(h => (
                  <th key={h} className="px-4 py-3 text-eyebrow text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelRows.map((row, i) => {
                const meta = MODEL_DISPLAY[row.model_name] ?? { label: row.model_name, badge: 'neutral' }
                return (
                  <tr key={row.model_name} className="table-row-stripe" style={{ borderBottom: i < modelRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td className="px-4 py-3" style={{ fontSize: 13 }}>
                      <Badge tone={meta.badge as 'neutral' | 'info' | 'warning' | 'success'}>{meta.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted" style={{ fontSize: 12 }}>{row.training_mode}</td>
                    {[row.auroc, row.auprc, row.accuracy, row.precision, row.recall, row.f1, row.brier_score].map((v, j) => (
                      <td key={j} className="px-4 py-3 text-right tabular text-secondary" style={{ fontSize: 13 }}>{v != null ? v.toFixed(4) : '—'}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Cohort" title="Dataset & Target Definition" animDelay={540}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Medication Group', value: 'C09 Antihypertensives' },
            { label: 'Observation Window', value: s.observation_window },
            { label: 'Prediction Window', value: s.prediction_window },
            { label: 'Non-adherence', value: 'PDC < 0.80' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-eyebrow mb-1">{label}</p>
              <p className="font-medium" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,42,42,0.05)', border: '1px solid rgba(255,42,42,0.1)' }}>
          <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>Disclaimer: </span>
            Claims-based risk signal. Not clinically validated.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
