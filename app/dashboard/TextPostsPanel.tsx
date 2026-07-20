'use client'

import { useState } from 'react'
import PublishPanel from './PublishPanel'
import { PageHeader, GhostButton } from './ui'

type Posts = { instagram: string; facebook: string; whatsapp: string }
type PostIds = Partial<Record<keyof Posts, string>>

const PLATFORMS = [
  { key: 'instagram' as const, label: 'Instagram', color: '#E1306C' },
  { key: 'facebook' as const, label: 'Facebook', color: '#1877F2' },
  { key: 'whatsapp' as const, label: 'WhatsApp', color: '#25D366' },
]

/**
 * Résultats texte seul (sans visuel canvas), pour les posts programme/tournoi
 * des sports collectifs — pas de gabarit d'image dédié pour l'instant.
 */
export default function TextPostsPanel({
  posts,
  postIds,
  title,
  onReset,
}: {
  posts: Posts
  postIds?: PostIds | null
  title: string
  onReset: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const [active, setActive] = useState<'instagram' | 'facebook' | 'whatsapp'>('instagram')

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader icon="check" title={title} tone="gold" />
        <GhostButton icon="arrowLeft" onClick={onReset}>Recommencer</GhostButton>
      </div>

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

      {PLATFORMS.map(p => p.key === active && (
        <div key={p.key} className="rounded-card border border-line bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-bold text-ink">{p.label}</span>
            <button
              onClick={() => copyToClipboard(posts[p.key], p.key)}
              className="inline-flex items-center gap-1.5 rounded-btn px-4 py-2 text-sm font-semibold text-white transition"
              style={{ background: copied === p.key ? '#22c55e' : p.color }}
            >
              {copied === p.key ? 'Copié' : 'Copier'}
            </button>
          </div>
          <div className="whitespace-pre-wrap rounded-btn bg-subtle p-4 text-sm leading-relaxed text-gray-700">
            {posts[p.key]}
          </div>
          <p className="mt-3 text-right text-xs text-muted">{posts[p.key].length} caractères</p>
        </div>
      ))}

      <PublishPanel posts={posts} postIds={postIds} getImageBlob={async () => null} />
    </div>
  )
}
