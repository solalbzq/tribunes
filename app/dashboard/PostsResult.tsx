'use client'

import { useState } from 'react'
import VisualGenerator from './VisualGenerator'

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
  { key: 'instagram' as const, label: 'Instagram', icon: '📸', color: '#E1306C' },
  { key: 'facebook' as const, label: 'Facebook', icon: '👥', color: '#1877F2' },
  { key: 'whatsapp' as const, label: 'WhatsApp', icon: '💬', color: '#25D366' },
  { key: 'visual' as const, label: 'Visuel', icon: '🖼️', color: '#111827' },
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

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-extrabold text-[#111827]">Tes posts sont prêts ! 🎉</h2>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-[#2563eb] transition"
        >
          ← Nouveau match
        </button>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 mb-4">
        {PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => setActive(p.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              active === p.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'
            }`}
            style={active === p.key ? { background: p.color, borderColor: p.color } : {}}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Visual */}
      {active === 'visual' && (
        <VisualGenerator club={club} match={match} photoFile={photoFile} />
      )}

      {/* Post card */}
      {active !== 'visual' && PLATFORMS.map(p => p.key === active && (
        <div key={p.key} className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{p.icon}</span>
              <span className="font-bold text-[#111827]">{p.label}</span>
            </div>
            <button
              onClick={() => copyToClipboard(posts[p.key as keyof Posts], p.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
              style={{ background: copied === p.key ? '#22c55e' : p.color }}
            >
              {copied === p.key ? '✓ Copié !' : '📋 Copier'}
            </button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {posts[p.key as keyof Posts]}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-right">
            {posts[p.key as keyof Posts].length} caractères
          </p>
        </div>
      ))}

      {/* Copy all */}
      {active !== 'visual' && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              const all = PLATFORMS.filter(p => p.key !== 'visual')
                .map(p => `=== ${p.label} ===\n${posts[p.key as keyof Posts]}`).join('\n\n')
              copyToClipboard(all, 'all')
            }}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition ${
              copied === 'all'
                ? 'bg-[#22c55e] text-white border-[#22c55e]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {copied === 'all' ? '✓ Tous copiés !' : '📋 Copier tous les posts'}
          </button>
        </div>
      )}
    </div>
  )
}
