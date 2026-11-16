import { ImageResponse } from 'next/og'

const TAILLES = [192, 512]

export function generateStaticParams() {
  return TAILLES.map((taille) => ({ taille: String(taille) }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ taille: string }> }) {
  const { taille } = await params
  const size = Number(taille)
  if (!TAILLES.includes(size)) {
    return new Response('Introuvable', { status: 404 })
  }
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2563eb',
        }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 48 48">
          <g fill="#ffffff">
            <rect x="15" y="7" width="27" height="9.5" rx="4.75" />
            <rect x="23.5" y="7" width="9.5" height="31" rx="4.75" />
            <rect x="6" y="20.5" width="13" height="6" rx="3" opacity="0.9" />
            <rect x="2" y="30.5" width="17" height="6" rx="3" opacity="0.55" />
          </g>
        </svg>
      </div>
    ),
    { width: size, height: size },
  )
}
