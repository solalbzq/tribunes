'use client'

import { useMemo, useState } from 'react'
import { HASHTAG_MOMENTS, HASHTAG_SPORTS, generateHashtags, type HashtagMomentKey } from '@/lib/hashtagTool'

const field = 'mt-1 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827]'

export default function HashtagTool() {
  const [sport, setSport] = useState(HASHTAG_SPORTS[0])
  const [moment, setMoment] = useState<HashtagMomentKey>('resultat')
  const [clubName, setClubName] = useState('')
  const [city, setCity] = useState('')
  const [copied, setCopied] = useState<'ok' | 'erreur' | null>(null)

  const tags = useMemo(() => generateHashtags({ sport, moment, clubName, city }), [sport, moment, clubName, city])
  const text = tags.join(' ')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied('ok')
    } catch {
      setCopied('erreur')
    }
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-[#111827]">
        Votre sport
        <select className={field} value={sport} onChange={(e) => { setSport(e.target.value); setCopied(null) }}>
          {HASHTAG_SPORTS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold text-[#111827]">
        Votre publication
        <select className={field} value={moment} onChange={(e) => { setMoment(e.target.value as HashtagMomentKey); setCopied(null) }}>
          {HASHTAG_MOMENTS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold text-[#111827]">
        Nom du club (facultatif)
        <input className={field} value={clubName} maxLength={60} onChange={(e) => { setClubName(e.target.value); setCopied(null) }} />
      </label>
      <label className="text-sm font-semibold text-[#111827]">
        Ville (facultatif)
        <input className={field} value={city} maxLength={60} onChange={(e) => { setCity(e.target.value); setCopied(null) }} />
      </label>

      <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 sm:col-span-2">
        <p className="text-sm font-semibold text-[#111827]">Vos hashtags</p>
        <p className="mt-2 break-words text-[15px] leading-[1.7] text-[#2563eb]" aria-live="polite">{text}</p>
        <button type="button" onClick={copy} className="mt-4 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white">
          Copier les hashtags
        </button>
        {copied === 'ok' && <span className="ml-3 text-sm text-[#166534]">Copié !</span>}
        {copied === 'erreur' && <span className="ml-3 text-sm text-[#b91c1c]">Copie impossible : sélectionnez le texte à la main.</span>}
      </div>
    </div>
  )
}
