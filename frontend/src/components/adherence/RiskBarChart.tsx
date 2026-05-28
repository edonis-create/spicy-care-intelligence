'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import type { RiskGroupRow } from '@/lib/adherence-types'

const COLORS: Record<string, string> = {
  'Low':       '#34d399',
  'Medium':    '#f5b45c',
  'High':      '#f87171',
  'Very High': '#ff2a2a',
}

interface Props {
  data: RiskGroupRow[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RiskGroupRow }> }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div
      className="rounded-xl p-3 text-caption"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        minWidth: 160,
      }}
    >
      <p className="font-semibold text-primary mb-2">{row.risk_group} Risk</p>
      <div className="space-y-1 text-muted" style={{ fontSize: 12 }}>
        <p>Patients: <span className="text-secondary tabular">{row.patient_count.toLocaleString()}</span></p>
        <p>Share: <span className="text-secondary tabular">{(row.patient_share * 100).toFixed(1)}%</span></p>
        <p>Avg predicted risk: <span className="text-secondary tabular">{row.average_predicted_risk?.toFixed(3)}</span></p>
        <p>
          Observed non-adherence:{' '}
          <span className="font-semibold tabular" style={{ color: COLORS[row.risk_group] }}>
            {((row.observed_non_adherence_rate ?? 0) * 100).toFixed(1)}%
          </span>
        </p>
      </div>
    </div>
  )
}

export default function RiskBarChart({ data }: Props) {
  const ORDER = ['Low', 'Medium', 'High', 'Very High']
  const sorted = [...data].sort((a, b) => ORDER.indexOf(a.risk_group) - ORDER.indexOf(b.risk_group))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sorted} barSize={36} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
        <XAxis
          dataKey="risk_group"
          tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="patient_count" radius={[6, 6, 0, 0]}>
          {sorted.map(row => (
            <Cell key={row.risk_group} fill={COLORS[row.risk_group]} fillOpacity={0.85} />
          ))}
          <LabelList
            dataKey="patient_count"
            position="top"
            formatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            style={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
