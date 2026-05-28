import clsx from 'clsx'

interface MetricCardProps {
  eyebrow: string
  value: string
  sub?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
  icon?: React.ReactNode
  className?: string
  animDelay?: number
}

const TONE_COLORS: Record<string, string> = {
  neutral: 'var(--text-tertiary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger:  'var(--danger)',
  info:    'var(--info)',
  accent:  'var(--accent)',
}

const TONE_BG: Record<string, string> = {
  neutral: 'rgba(138,138,146,0.10)',
  success: 'rgba(52,211,153,0.10)',
  warning: 'rgba(245,180,92,0.10)',
  danger:  'rgba(248,113,113,0.10)',
  info:    'rgba(122,162,247,0.10)',
  accent:  'rgba(255,42,42,0.10)',
}

export default function MetricCard({
  eyebrow,
  value,
  sub,
  tone = 'neutral',
  icon,
  className,
  animDelay,
}: MetricCardProps) {
  const color = TONE_COLORS[tone]
  const bg    = TONE_BG[tone]

  return (
    <div
      className={clsx('s1 p-5 animate-fade-up', className)}
      style={animDelay ? { animationDelay: `${animDelay}ms` } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-eyebrow mb-3">{eyebrow}</p>
          <p className="text-metric tabular leading-none">{value}</p>
          {sub && (
            <p className="text-muted mt-1.5" style={{ fontSize: 12 }}>{sub}</p>
          )}
        </div>
        {icon && (
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 36, height: 36, background: bg, color }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
