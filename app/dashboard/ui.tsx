import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'

/** Champs de formulaire — style unifié DA. */
export const FIELD =
  'w-full rounded-btn border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15'

/** En-tête de page/section : chip d'icône + titre + sous-titre + action. */
export function PageHeader({
  icon,
  title,
  subtitle,
  action,
  tone = 'brand',
}: {
  icon: IconName
  title: string
  subtitle?: string
  action?: ReactNode
  tone?: 'brand' | 'gold' | 'ink'
}) {
  const chip =
    tone === 'gold' ? 'bg-gold-soft text-gold-hover' : tone === 'ink' ? 'bg-subtle text-ink' : 'bg-brand-soft text-brand'
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-card ${chip}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.02em] text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/** Navigation segmentée (sous-onglets) avec icônes. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string; icon?: IconName }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-card border border-line bg-subtle p-1">
      {items.map(it => {
        const active = value === it.key
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={`inline-flex items-center gap-2 rounded-btn px-3.5 py-2 text-sm font-semibold transition ${
              active ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink'
            }`}
          >
            {it.icon && <Icon name={it.icon} className="h-[17px] w-[17px]" />}
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

/** Carte de contenu. */
export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div className={`rounded-card border border-line bg-white shadow-card ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}

/** Petit label de section interne (au-dessus d'un groupe de champs). */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-semibold text-ink">{children}</label>
}

/** Bouton principal (action unique par écran). */
export function PrimaryButton({
  children,
  icon,
  loading,
  className = '',
  ...props
}: {
  children: ReactNode
  icon?: IconName
  loading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-60 ${className}`}
    >
      {loading ? <Icon name="refresh" className="h-[18px] w-[18px] animate-spin" /> : icon && <Icon name={icon} className="h-[18px] w-[18px]" />}
      {children}
    </button>
  )
}

/** Bouton secondaire (contour). */
export function GhostButton({
  children,
  icon,
  className = '',
  ...props
}: {
  children: ReactNode
  icon?: IconName
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-btn border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-subtle disabled:opacity-50 ${className}`}
    >
      {icon && <Icon name={icon} className="h-[18px] w-[18px]" />}
      {children}
    </button>
  )
}
