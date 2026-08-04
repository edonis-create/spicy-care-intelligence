import { useState, useEffect, useMemo } from 'react'
import type { PatientRow, RiskGroup } from '@/lib/adherence-types'
import SectionCard from '@/components/adherence/SectionCard'
import Badge, { riskBadge, errorTypeBadge, outcomeBadge } from '@/components/adherence/Badge'
import clsx from 'clsx'

function fmt(v: number | null | undefined, decimals = 3) {
  if (v == null || isNaN(Number(v))) return '—'
  return Number(v).toFixed(decimals)
}
function pct(v: number | null | undefined) {
  if (v == null || isNaN(Number(v))) return '—'
  return (Number(v) * 100).toFixed(1) + '%'
}

const RISK_ORDER: RiskGroup[] = ['Low', 'Medium', 'High', 'Very High']
const ALL = '__all__'

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-eyebrow mb-1.5">{label}</p>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 focus:outline-none" style={{ background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontSize: 13 }}>
        <option value={ALL}>All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function riskColor(group: string) {
  const map: Record<string, string> = { 'Low': 'var(--success)', 'Medium': 'var(--warning)', 'High': 'var(--danger)', 'Very High': 'var(--accent)' }
  return map[group] ?? 'var(--text-tertiary)'
}

function PatientCard({ patient }: { patient: PatientRow }) {
  const hasDx = (v: number | null | undefined) => v === 1
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow mb-1">Patient ID</p>
          <p className="font-bold" style={{ fontSize: 16, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>{patient.demo_patient_id}</p>
        </div>
        {errorTypeBadge(patient.prediction_error_type)}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-eyebrow">Predicted Non-Adherence Risk</p>
          <span className="font-bold tabular" style={{ fontSize: 20, color: riskColor(patient.risk_group) }}>{(patient.predicted_risk * 100).toFixed(1)}%</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${patient.predicted_risk * 100}%`, background: riskColor(patient.risk_group) }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-muted" style={{ fontSize: 11 }}>Risk tier</span>
          {riskBadge(patient.risk_group)}
        </div>
      </div>
      <div className="s3 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-eyebrow mb-0.5">Observed Outcome</p>
          <p className="text-secondary" style={{ fontSize: 12 }}>PDC 2016: <span className="tabular font-medium" style={{ color: 'var(--text-primary)' }}>{fmt(patient.actual_pdc, 3)}</span></p>
          <p style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 2 }}>PDC = Proportion of Days Covered — share of days the patient had medication available</p>
        </div>
        {outcomeBadge(patient.actual_outcome_text)}
      </div>
      <div>
        <p className="text-eyebrow mb-0.5">2015 Adherence History</p>
        <p style={{ fontSize: 10, color: 'var(--text-quaternary)', marginBottom: 8 }}>C09 antihypertensive prescription patterns observed in the year before the prediction window</p>
        <div className="space-y-1">
          {[
            ['PDC 2015 (adherence score)', fmt(patient.c09_2015_pdc_observed, 3)],
            ['Non-adherent in 2015 (PDC < 0.80)', patient.c09_2015_pdc_low_80_flag === 1 ? 'Yes' : 'No'],
            ['Antihypertensive prescription fills', String(patient.c09_2015_records ?? '—')],
            ['Medication gaps ≥ 30 days', String(patient.c09_2015_gap_count_30d ?? '—')],
            ['Longest gap without medication (days)', fmt(patient.c09_2015_longest_gap_days, 1)],
            ['Had prescription fill in Q4 2015', patient.c09_2015_has_q4_fill === 1 ? 'Yes' : 'No'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-muted" style={{ fontSize: 12 }}>{label}</span>
              <span className="tabular font-medium" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-eyebrow mb-0.5">Diagnosis Flags 2015</p>
        <p style={{ fontSize: 10, color: 'var(--text-quaternary)', marginBottom: 8 }}>ICD-10 disease chapter presence recorded in the year before the prediction window</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Heart & blood vessels (ICD-I)', v: patient.dx_2015_has_I_circulatory },
            { label: 'Diabetes & hormones (ICD-E)', v: patient.dx_2015_has_E_endocrine },
            { label: 'Kidneys & bladder (ICD-N)', v: patient.dx_2015_has_N_genitourinary },
            { label: 'Lungs & airways (ICD-J)', v: patient.dx_2015_has_J_respiratory },
          ].map(({ label, v }) => (
            <div key={label} className="s3 px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-muted" style={{ fontSize: 11 }}>{label}</span>
              <Badge tone={hasDx(v) ? 'info' : 'ghost'} size="sm">{hasDx(v) ? 'Yes' : 'No'}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div className="s3 px-4 py-3">
        <p className="text-eyebrow mb-0.5">Demographics</p>
        <p style={{ fontSize: 10, color: 'var(--text-quaternary)', marginBottom: 8 }}>Patient characteristics recorded at the 2015 observation date</p>
        <div className="grid grid-cols-2 gap-2" style={{ fontSize: 12 }}>
          <div><span className="text-muted">Age group</span><br /><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{patient.age_group_2015 ?? '—'}</span></div>
          <div><span className="text-muted">County (megye)</span><br /><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{patient.megye_mode_2015 ?? '—'}</span></div>
          <div><span className="text-muted">Age at 2015</span><br /><span className="tabular font-medium" style={{ color: 'var(--text-primary)' }}>{patient.age_at_2015 != null ? Math.round(patient.age_at_2015) : '—'}</span></div>
          <div><span className="text-muted">Federated client (region)</span><br /><span className="font-medium" style={{ color: 'var(--info)' }}>{patient.client_id ?? '—'}</span></div>
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 20

export default function AdherenceExplorerPage() {
  const [allPatients, setAllPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PatientRow | null>(null)
  const [page, setPage] = useState(1)
  const [fRisk, setFRisk] = useState(ALL)
  const [fOutcome, setFOutcome] = useState(ALL)
  const [fError, setFError] = useState(ALL)
  const [fAge, setFAge] = useState(ALL)
  const [fClient, setFClient] = useState(ALL)
  const [sortKey, setSortKey] = useState<keyof PatientRow>('predicted_risk')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetch('/api/adherence/predictions')
      .then(r => r.json())
      .then((data: PatientRow[]) => { setAllPatients(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const ageOptions = useMemo(() => [...new Set(allPatients.map(p => p.age_group_2015).filter(Boolean) as string[])].sort(), [allPatients])
  const clientOptions = useMemo(() => [...new Set(allPatients.map(p => p.client_id).filter(Boolean) as string[])].sort(), [allPatients])

  const filtered = useMemo(() => {
    let rows = allPatients
    if (fRisk !== ALL) rows = rows.filter(p => p.risk_group === fRisk)
    if (fOutcome !== ALL) rows = rows.filter(p => p.actual_outcome_text === fOutcome)
    if (fError !== ALL) rows = rows.filter(p => p.prediction_error_type === fError)
    if (fAge !== ALL) rows = rows.filter(p => p.age_group_2015 === fAge)
    if (fClient !== ALL) rows = rows.filter(p => p.client_id === fClient)
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as number | string | null | undefined
      const bv = b[sortKey] as number | string | null | undefined
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [allPatients, fRisk, fOutcome, fError, fAge, fClient, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetFilters() { setFRisk(ALL); setFOutcome(ALL); setFError(ALL); setFAge(ALL); setFClient(ALL); setPage(1) }
  function toggleSort(k: keyof PatientRow) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const COL_HEADERS: { key: keyof PatientRow; label: string }[] = [
    { key: 'demo_patient_id', label: 'Patient ID' },
    { key: 'predicted_risk', label: 'Risk Score' },
    { key: 'risk_group', label: 'Risk Tier' },
    { key: 'actual_outcome_text', label: 'Observed' },
    { key: 'actual_pdc', label: 'Obs. PDC' },
    { key: 'prediction_error_type', label: 'Result' },
  ]

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex gap-5" style={{ alignItems: 'flex-start' }}>
        <div className="shrink-0 space-y-3 sticky top-0" style={{ width: 220 }}>
          <SectionCard eyebrow="Filters" title="Filter Patients" bodyClass="p-4 space-y-3">
            <FilterSelect label="Risk Tier" value={fRisk} onChange={v => { setFRisk(v); setPage(1) }} options={RISK_ORDER} />
            <FilterSelect label="Outcome" value={fOutcome} onChange={v => { setFOutcome(v); setPage(1) }} options={['Adherent', 'Non-adherent']} />
            <FilterSelect label="Prediction" value={fError} onChange={v => { setFError(v); setPage(1) }} options={['true_positive', 'false_positive', 'true_negative', 'false_negative']} />
            {ageOptions.length > 0 && <FilterSelect label="Age Group" value={fAge} onChange={v => { setFAge(v); setPage(1) }} options={ageOptions} />}
            {clientOptions.length > 0 && <FilterSelect label="FL Client" value={fClient} onChange={v => { setFClient(v); setPage(1) }} options={clientOptions} />}
            <button onClick={resetFilters} className="btn-ghost w-full justify-center mt-1" style={{ fontSize: 12 }}>Clear filters</button>
          </SectionCard>
          <div className="s3 p-3">
            <p className="text-eyebrow mb-1">Sample size</p>
            <p className="text-muted" style={{ fontSize: 11, lineHeight: 1.5 }}>Showing 1,000-row sample. Full dataset: 311,716 patients.</p>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <SectionCard eyebrow="Patients" title={`${filtered.length.toLocaleString()} patients`} action={<span className="text-muted" style={{ fontSize: 12 }}>Page {page} of {totalPages}</span>} bodyClass="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted" style={{ fontSize: 13 }}>Loading predictions…</div>
            ) : (
              <>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full border-collapse" style={{ minWidth: 560 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {COL_HEADERS.map(({ key, label }) => (
                          <th key={key} onClick={() => toggleSort(key)} className="px-4 py-3 text-eyebrow text-left cursor-pointer select-none whitespace-nowrap hover:text-secondary transition-colors">
                            {label}{sortKey === key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((p, i) => (
                        <tr key={p.demo_patient_id} onClick={() => setSelected(p)} className={clsx('table-row-stripe cursor-pointer transition-colors hover:bg-white/[0.03]', selected?.demo_patient_id === p.demo_patient_id && 'bg-accent/5')} style={{ borderBottom: i < pageRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <td className="px-4 py-2.5 font-medium tabular" style={{ fontSize: 12, color: 'var(--info)' }}>{p.demo_patient_id}</td>
                          <td className="px-4 py-2.5 text-right" style={{ fontSize: 13 }}>
                            <span className="font-semibold tabular" style={{ color: riskColor(p.risk_group) }}>{(p.predicted_risk * 100).toFixed(1)}%</span>
                          </td>
                          <td className="px-4 py-2.5">{riskBadge(p.risk_group)}</td>
                          <td className="px-4 py-2.5">{outcomeBadge(p.actual_outcome_text)}</td>
                          <td className="px-4 py-2.5 tabular" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.actual_pdc != null ? Number(p.actual_pdc).toFixed(3) : '—'}</td>
                          <td className="px-4 py-2.5">{errorTypeBadge(p.prediction_error_type)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost disabled:opacity-30" style={{ fontSize: 12 }}>← Prev</button>
                  <span className="text-muted" style={{ fontSize: 12 }}>{((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost disabled:opacity-30" style={{ fontSize: 12 }}>Next →</button>
                </div>
              </>
            )}
          </SectionCard>
          {selected ? (
            <SectionCard eyebrow="Selected Patient" title={selected.demo_patient_id} action={<button onClick={() => setSelected(null)} className="btn-ghost" style={{ fontSize: 12 }}>Close ✕</button>}>
              <PatientCard patient={selected} />
            </SectionCard>
          ) : (
            <div className="s2 flex items-center justify-center text-muted" style={{ height: 80, fontSize: 13 }}>Click a row to view patient details</div>
          )}
        </div>
      </div>
    </div>
  )
}
