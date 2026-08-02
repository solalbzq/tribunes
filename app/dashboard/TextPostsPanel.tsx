'use client'

import { useState } from 'react'
import PublishPanel from './PublishPanel'
import PersonalizePostPanel from './PersonalizePostPanel'
import { PageHeader, GhostButton } from './ui'
import type { PostType } from '@/lib/postTypes'

type Posts = { instagram: string; facebook: string; whatsapp: string }
type PostIds = Partial<Record<keyof Posts, string>>

const PLATFORMS = [
  { key: 'instagram' as const, label: 'Instagram', color: '#E1306C' },
  { key: 'facebook' as const, label: 'Facebook', color: '#1877F2' },
  { key: 'whatsapp' as const, label: 'WhatsApp', color: '#25D366' },
]

/**
 * Résultats texte + publication. getImageBlob est optionnel : quand un
 * visuel canvas existe pour ce flux (programme, tournoi), on le branche
 * pour que "Publier" envoie l'image, pas juste le texte.
 */
export default function TextPostsPanel({
  posts,
  postIds,
  title,
  onReset,
  getImageBlob,
  onPersonalize,
  personalizing,
  bannedWordsWarning,
  postType,
}: {
  posts: Posts
  postIds?: PostIds | null
  title: string
  onReset: () => void
  getImageBlob?: () => Promise<Blob | null>
  onPersonalize?: (overrides: { tone?: string; customInstructions?: string }) => Promise<void>
  personalizing?: boolean
  /** Expressions interdites détectées par plateforme (lib/bannedWords.ts) — publication auto désactivée tant qu'elles subsistent. */
  bannedWordsWarning?: Record<string, string[]> | null
  /** Active "Enregistrer ces réglages pour ce type" dans le panneau de personnalisation ponctuelle. */
  postType?: PostType
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

      {bannedWordsWarning && Object.keys(bannedWordsWarning).length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Expression à éviter détectée</p>
          <p className="mt-1">
            {Object.entries(bannedWordsWarning).map(([platform, words]) => (
              <span key={platform} className="block">
                {platform} : {words.join(', ')}
              </span>
            ))}
          </p>
          <p className="mt-1 text-xs text-amber-700">La publication automatique est désactivée pour ce contenu — modifiez ou régénérez le texte avant de le publier.</p>
        </div>
      )}

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

      {getImageBlob && (
        <p className="text-xs font-medium text-muted">Le visuel généré sera joint automatiquement à la publication.</p>
      )}

      {onPersonalize && (
        <PersonalizePostPanel onRegenerate={onPersonalize} regenerating={personalizing} postType={postType} />
      )}

      <PublishPanel posts={posts} postIds={postIds} getImageBlob={getImageBlob ?? (async () => null)} />
    </div>
  )
}
