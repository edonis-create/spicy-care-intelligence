import { useEffect, useState } from 'react'
import type { AppSummary } from '@/lib/adherence-types'
import SectionCard from '@/components/adherence/SectionCard'
import Badge from '@/components/adherence/Badge'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
      <span className="text-muted shrink-0" style={{ width: 160, minWidth: 160 }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }} className="flex-1">{value}</span>
    </div>
  )
}

function ListItem({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'danger' | 'warning' | 'info' | 'neutral' }) {
  const colors = { danger: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)', neutral: 'var(--text-tertiary)' }
  return (
    <li className="flex gap-2.5" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 6, color: 'var(--text-secondary)' }}>
      <span className="shrink-0 mt-0.5" style={{ color: colors[tone] }}>•</span>
      {children}
    </li>
  )
}

export default function AdherenceModelCardPage() {
  const [s, setS] = useState<AppSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/adherence/summary').then(r => r.json()).then(data => { setS(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-muted" style={{ fontSize: 13 }}>Loading…</div>
  if (!s) return <div className="p-8 text-center" style={{ color: 'var(--danger)', fontSize: 13 }}>Failed to load data.</div>

  return (
    <div className="max-w-[1100px] mx-auto space-y-5 animate-fade-in">
      <SectionCard eyebrow="Intended Use" title="What This App Is For" animDelay={0}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-eyebrow mb-2" style={{ color: 'var(--success)' }}>Approved uses</p>
            <ul className="space-y-1">
              {['Business development demonstration of adherence risk intelligence.', 'Analytical review of antihypertensives cohort non-adherence risk distribution.', 'Evidence of federated learning feasibility for multi-site analytics.', 'Exploration of claims-based adherence risk signal characteristics.'].map(t => <ListItem key={t} tone="info">{t}</ListItem>)}
            </ul>
          </div>
          <div>
            <p className="text-eyebrow mb-2" style={{ color: 'var(--danger)' }}>Prohibited uses</p>
            <ul className="space-y-1">
              {['Clinical diagnosis or treatment recommendation.', 'Patient outreach or care coordination triggers.', 'Regulatory-grade clinical decision support.', 'Live scoring of new patients in a production context.'].map(t => <ListItem key={t} tone="danger">{t}</ListItem>)}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Data" title="Data Source and Target Definition" animDelay={60}>
        <Row label="Data source" value="VENY prescription dispensing records (Hungarian national claims)" />
        <Row label="Medication group" value="C09 Antihypertensives (ATC C09 — ACE inhibitors, ARBs, beta-blockers)" />
        <Row label="Cohort size" value="2,078,105 labelled patients" />
        <Row label="Observation window" value={s.observation_window} />
        <Row label="Prediction window" value={s.prediction_window} />
        <Row label="Non-adherence def." value="PDC < 0.80 in the 2016 prediction window" />
        <Row label="Non-adherence rate" value={`${(s.observed_non_adherence_rate * 100).toFixed(1)}% in test set`} />
      </SectionCard>

      <SectionCard eyebrow="Model" title="Model Architecture and Training" animDelay={120}>
        <Row label="Model type" value="L2-regularized logistic regression (scikit-learn, saga solver)" />
        <Row label="Feature count" value="67 features (65 numeric, 2 categorical)" />
        <Row label="Train / Val / Test" value="1,454,673 / 311,716 / 311,716 (70 / 15 / 15%)" />
        <Row label="Class weighting" value="class_weight='balanced'" />
        <Row label="AUROC (test)" value={s.centralized_baseline_metrics.auroc?.toFixed(4) ?? '—'} />
        <Row label="AUPRC (test)" value={s.centralized_baseline_metrics.auprc?.toFixed(4) ?? '—'} />
        <Row label="Brier score" value={s.centralized_baseline_metrics.brier_score?.toFixed(4) ?? '—'} />
        <Row label="Known issues" value={<Badge tone="warning">max_iter convergence warning recorded during training</Badge>} />
      </SectionCard>

      <SectionCard eyebrow="Features" title="Feature Group Summary" animDelay={180}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { group: 'Antihypertensive adherence history', examples: 'PDC, gap counts, last fill, Q4 flag', color: 'var(--accent)' },
            { group: 'All-medication features', examples: 'Total records, ATC diversity, polypharmacy', color: 'var(--info)' },
            { group: 'Cardiovascular features', examples: 'CV record count, antihypertensive share of CV', color: 'var(--warning)' },
            { group: 'Demographics', examples: 'Age, age group, county mode', color: 'var(--success)' },
          ].map(({ group, examples, color }) => (
            <div key={group} className="s3 p-4">
              <p className="font-semibold mb-1" style={{ fontSize: 13, color }}>{group}</p>
              <p className="text-muted" style={{ fontSize: 11, lineHeight: 1.5 }}>{examples}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Limitations" title="Known Limitations" animDelay={240}>
        <ul className="space-y-0">
          {s.limitations.map(l => <ListItem key={l} tone="warning">{l}</ListItem>)}
        </ul>
      </SectionCard>

      <SectionCard eyebrow="Privacy" title="Privacy Design" animDelay={300}>
        <ul className="space-y-0">
          {s.privacy_notes.map(n => <ListItem key={n} tone="info">{n}</ListItem>)}
        </ul>
        <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,42,42,0.05)', border: '1px solid rgba(255,42,42,0.1)' }}>
          <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>Patient identifier policy: </span>
            {s.patient_identifier_policy}
          </p>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Validation Status" title="Clinical and Technical Readiness" animDelay={360}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Internal engineering', status: 'PASS', tone: 'success' as const, note: 'All critical validation checks passed.' },
            { label: 'Clinical validation', status: 'NOT DONE', tone: 'danger' as const, note: 'No clinical validation has been performed.' },
            { label: 'Production readiness', status: 'NOT READY', tone: 'danger' as const, note: 'Not deployment-ready. No secure FL, no RBAC, no audit logging.' },
          ].map(({ label, status, tone, note }) => (
            <div key={label} className="s3 p-4">
              <p className="text-eyebrow mb-2">{label}</p>
              <Badge tone={tone} size="md">{status}</Badge>
              <p className="text-muted mt-2" style={{ fontSize: 11, lineHeight: 1.5 }}>{note}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
