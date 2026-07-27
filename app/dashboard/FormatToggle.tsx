'use client'

import type { VisualFormat } from '@/lib/visualLayout'

/** Sélecteur de format d'export réutilisé partout où un visuel est généré : post (carré/portrait) ou story (verticale 9:16). */
export default function FormatToggle({ value, onChange }: { value: VisualFormat; onChange: (f: VisualFormat) => void }) {
  return (
    <div className="inline-flex gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-1">
      <button type="button" onClick={() => onChange('post')}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${value === 'post' ? 'bg-white shadow text-[#111827]' : 'text-gray-500'}`}>
        Post
      </button>
      <button type="button" onClick={() => onChange('story')}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${value === 'story' ? 'bg-white shadow text-[#111827]' : 'text-gray-500'}`}>
        Story
      </button>
    </div>
  )
}
