import clsx from 'clsx'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'ghost'

interface BadgeProps {
  children: React.ReactNode
  tone?: Tone
  size?: 'sm' | 'md'
  className?: string
}

const STYLES: Record<Tone, { bg: string; color: string; border: string }> = {
  neutral: { bg: 'rgba(138,138,146,0.12)', color: 'var(--text-secondary)', border: 'rgba(138,138,146,0.2)' },
  accent:  { bg: 'rgba(255,42,42,0.12)',   color: 'var(--accent)',          border: 'rgba(255,42,42,0.25)' },
  success: { bg: 'rgba(52,211,153,0.12)',  color: 'var(--success)',         border: 'rgba(52,211,153,0.25)' },
  warning: { bg: 'rgba(245,180,92,0.12)',  color: 'var(--warning)',         border: 'rgba(245,180,92,0.25)' },
  danger:  { bg: 'rgba(248,113,113,0.12)', color: 'var(--danger)',          border: 'rgba(248,113,113,0.25)' },
  info:    { bg: 'rgba(122,162,247,0.12)', color: 'var(--info)',            border: 'rgba(122,162,247,0.25)' },
  ghost:   { bg: 'transparent',            color: 'var(--text-tertiary)',   border: 'rgba(255,255,255,0.12)' },
}

export default function Badge({ children, tone = 'neutral', size = 'sm', className }: BadgeProps) {
  const s = STYLES[tone]
  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold rounded-full tabular',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  )
}

/* ── Convenience helpers ─────────────────────────────────────────── */

export function riskBadge(group: string) {
  const map: Record<string, Tone> = {
    'Low':       'success',
    'Medium':    'warning',
    'High':      'danger',
    'Very High': 'accent',
  }
  return <Badge tone={map[group] ?? 'neutral'}>{group}</Badge>
}

export function errorTypeBadge(t: string) {
  const map: Record<string, Tone> = {
    true_positive:  'success',
    true_negative:  'info',
    false_positive: 'warning',
    false_negative: 'danger',
  }
  const labels: Record<string, string> = {
    true_positive:  'TP',
    true_negative:  'TN',
    false_positive: 'FP',
    false_negative: 'FN',
  }
  return <Badge tone={map[t] ?? 'neutral'}>{labels[t] ?? t}</Badge>
}

export function outcomeBadge(text: string) {
  return (
    <Badge tone={text === 'Non-adherent' ? 'danger' : 'success'}>
      {text}
    </Badge>
  )
}
