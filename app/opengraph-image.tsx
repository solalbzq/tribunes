import { ImageResponse } from 'next/og'

export const alt = 'Tribunes — Votre club communique. Automatiquement.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff',
        }}
      >
        <svg width="180" height="180" viewBox="0 0 48 48">
          <g fill="#ffffff">
            <rect x="15" y="7" width="27" height="9.5" rx="4.75" />
            <rect x="23.5" y="7" width="9.5" height="31" rx="4.75" />
            <rect x="6" y="20.5" width="13" height="6" rx="3" opacity="0.9" />
            <rect x="2" y="30.5" width="17" height="6" rx="3" opacity="0.55" />
          </g>
        </svg>
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, marginTop: 24 }}>Tribunes</div>
        <div style={{ display: 'flex', fontSize: 44, marginTop: 16, color: '#eeb007' }}>
          Votre club communique. Automatiquement.
        </div>
      </div>
    ),
    size,
  )
}
