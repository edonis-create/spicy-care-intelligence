import clsx from 'clsx'

interface SectionCardProps {
  eyebrow?: string
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClass?: string
  animDelay?: number
}

export default function SectionCard({
  eyebrow,
  title,
  action,
  children,
  className,
  bodyClass,
  animDelay,
}: SectionCardProps) {
  return (
    <div
      className={clsx('s1 flex flex-col animate-fade-up', className)}
      style={animDelay ? { animationDelay: `${animDelay}ms` } : undefined}
    >
      {(eyebrow || title || action) && (
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            {eyebrow && <p className="text-eyebrow mb-0.5">{eyebrow}</p>}
            {title   && <p className="text-h2">{title}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={clsx('flex-1', bodyClass ?? 'p-5')}>
        {children}
      </div>
    </div>
  )
}
