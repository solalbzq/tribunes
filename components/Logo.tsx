import type { CSSProperties } from 'react'

type LogoProps = {
  /** Hauteur du mark en px (le wordmark s'adapte). */
  size?: number
  /** Affiche le mot "tribunes" à côté du mark. */
  withWordmark?: boolean
  /** Affiche la baseline sous le wordmark. */
  withTagline?: boolean
  /** Couleur du wordmark (le mark reste bleu marque). Ex: '#ffffff' sur fond sombre. */
  wordmarkColor?: string
  className?: string
  style?: CSSProperties
}

/** Mark "T" Tribunes avec lignes de vitesse — identité officielle. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g fill="#2563eb">
        {/* Barre haute du T */}
        <rect x="15" y="7" width="27" height="9.5" rx="4.75" />
        {/* Jambage vertical */}
        <rect x="23.5" y="7" width="9.5" height="31" rx="4.75" />
        {/* Lignes de vitesse */}
        <rect x="6" y="20.5" width="13" height="6" rx="3" fill="#2563eb" opacity="0.9" />
        <rect x="2" y="30.5" width="17" height="6" rx="3" fill="#2563eb" opacity="0.55" />
      </g>
    </svg>
  )
}

export function Logo({
  size = 28,
  withWordmark = true,
  withTagline = false,
  wordmarkColor = '#111827',
  className,
  style,
}: LogoProps) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, ...style }}>
      <LogoMark size={size} />
      {withWordmark && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: size * 0.86,
              letterSpacing: '-0.03em',
              color: wordmarkColor,
            }}
          >
            tribunes
          </span>
          {withTagline && (
            <span
              style={{
                marginTop: 3,
                fontWeight: 700,
                fontSize: size * 0.28,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#2563eb',
              }}
            >
              Votre club communique. Automatiquement.
            </span>
          )}
        </span>
      )}
    </span>
  )
}

export default Logo
