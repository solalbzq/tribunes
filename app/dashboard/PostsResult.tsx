'use client'

import { useRef, useState } from 'react'
import VisualGenerator from './VisualGenerator'
import PublishPanel from './PublishPanel'
import { PageHeader, GhostButton } from './ui'

type Posts = { instagram: string; facebook: string; whatsapp: string }

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

type MatchData = {
  opponent: string
  homeScore: number
  awayScore: number
  isHome: boolean
  competition: string
}

const PLATFORMS = [
  { key: 'instagram' as const, label: 'Instagram', icon: '', color: '#E1306C' },
  { key: 'facebook' as const, label: 'Facebook', icon: '', color: '#1877F2' },
  { key: 'whatsapp' as const, label: 'WhatsApp', icon: '', color: '#25D366' },
  { key: 'visual' as const, label: 'Visuel', icon: '', color: '#111827' },
]

export default function PostsResult({
  posts,
  club,
  match,
  photoFile,
  onReset,
}: {
  posts: Posts
  club: Club
  match: MatchData
  photoFile: File | null
  onReset: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const [active, setActive] = useState<'instagram' | 'facebook' | 'whatsapp' | 'visual'>('instagram')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader icon="check" title="Vos posts sont prêts" tone="gold" />
        <GhostButton icon="arrowLeft" onClick={onReset}>Nouveau match</GhostButton>
      </div>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => setActive(p.key)}
            className={`rounded-btn px-4 py-2 text-sm font-semibold border transition ${
              active === p.key ? 'text-white border-transparent' : 'bg-white text-muted border-line hover:border-gray-300'
            }`}
            style={active === p.key ? { background: p.color, borderColor: p.color } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Visual — toujours monté (canvas capturé pour la publication), affiché sur l'onglet Visuel */}
      <div className={active === 'visual' ? '' : 'hidden'}>
        <VisualGenerator club={club} match={match} photoFile={photoFile} onCanvasReady={c => { canvasRef.current = c }} />
      </div>

      {/* Post card */}
      {active !== 'visual' && PLATFORMS.map(p => p.key === active && (
        <div key={p.key} className="rounded-card border border-line bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-bold text-ink">{p.label}</span>
            <button
              onClick={() => copyToClipboard(posts[p.key as keyof Posts], p.key)}
              className="inline-flex items-center gap-1.5 rounded-btn px-4 py-2 text-sm font-semibold text-white transition"
              style={{ background: copied === p.key ? '#22c55e' : p.color }}
            >
              {copied === p.key ? 'Copié' : 'Copier'}
            </button>
          </div>
          <div className="whitespace-pre-wrap rounded-btn bg-subtle p-4 text-sm leading-relaxed text-gray-700">
            {posts[p.key as keyof Posts]}
          </div>
          <p className="mt-3 text-right text-xs text-muted">
            {posts[p.key as keyof Posts].length} caractères
          </p>
        </div>
      ))}

      {/* Publication directe */}
      <PublishPanel posts={posts} getImageBlob={getImageBlob} />
    </div>
  )
}
