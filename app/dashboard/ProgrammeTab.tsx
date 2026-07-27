'use client'

import { useRef, useState } from 'react'
import ScheduleGenerator from './ScheduleGenerator'
import TextPostsPanel from './TextPostsPanel'
import ToneSelector from './ToneSelector'
import FormatToggle from './FormatToggle'
import type { VisualFormat } from '@/lib/visualLayout'
import { Icon } from './icons'

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

type UpcomingMatch = {
  id: string
  date: string
  opponent: string
  competition: string
  isHome: boolean
}

type Posts = { instagram: string; facebook: string; whatsapp: string }
type PostIds = Partial<Record<keyof Posts, string>>

const EMPTY_MATCH = (): UpcomingMatch => ({
  id: Math.random().toString(36).slice(2),
  date: '',
  opponent: '',
  competition: '',
  isHome: true,
})

export default function ProgrammeTab({ club }: { club: Club }) {
  const [matches, setMatches] = useState<UpcomingMatch[]>([EMPTY_MATCH()])
  const [visualFormat, setVisualFormat] = useState<VisualFormat>('post')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Posts | null>(null)
  const [postIds, setPostIds] = useState<PostIds | null>(null)
  const [tone, setTone] = useState('')
  const [weeklyScheduleId, setWeeklyScheduleId] = useState<string | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  function addMatch() {
    if (matches.length >= 6) return
    setMatches(prev => [...prev, EMPTY_MATCH()])
  }

  function removeMatch(id: string) {
    setMatches(prev => prev.filter(m => m.id !== id))
  }

  function update(id: string, field: keyof UpcomingMatch, value: string | boolean) {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const filled = matches.filter(m => m.date && m.opponent)

  async function generateCaptions() {
    setGenerating(true); setError(null)
    try {
      const sorted = [...filled].sort((a, b) => a.date.localeCompare(b.date))
      const res = await fetch('/api/posts/generic/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: sorted[0].date,
          weekEnd: sorted[sorted.length - 1].date,
          matches: sorted.map(m => ({
            opponent: m.opponent,
            day: new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
            time: '',
            homeAway: m.isHome ? 'DOMICILE' : 'EXTERIEUR',
            competition: m.competition || undefined,
          })),
          tone: tone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Échec de la génération')
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
      setWeeklyScheduleId(data.weeklyScheduleId ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function personalize(overrides: { tone?: string; customInstructions?: string }) {
    if (!weeklyScheduleId) return
    setPersonalizing(true)
    try {
      const sorted = [...filled].sort((a, b) => a.date.localeCompare(b.date))
      const res = await fetch('/api/posts/generic/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: sorted[0].date,
          weekEnd: sorted[sorted.length - 1].date,
          matches: sorted.map(m => ({
            opponent: m.opponent,
            day: new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
            time: '',
            homeAway: m.isHome ? 'DOMICILE' : 'EXTERIEUR',
            competition: m.competition || undefined,
          })),
          weeklyScheduleId, regenerate: true,
          tone: overrides.tone, customInstructions: overrides.customInstructions,
        }),
      })
      const data = await res.json()
      if (!res.ok) return
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
    } finally {
      setPersonalizing(false)
    }
  }

  if (posts) {
    return (
      <TextPostsPanel
        posts={posts}
        postIds={postIds}
        title="Vos légendes de programme sont prêtes"
        onReset={() => { setPosts(null); setPostIds(null); setWeeklyScheduleId(null) }}
        getImageBlob={getImageBlob}
        onPersonalize={personalize}
        personalizing={personalizing}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
      {/* Formulaire */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#111827]">Matchs à venir</h3>
          <span className="text-xs text-gray-400">{matches.length}/6 matchs</span>
        </div>

        <div className="space-y-3">
          {matches.map((m, i) => (
            <div key={m.id} className="bg-white rounded-card border border-line shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Match {i + 1}</span>
                {matches.length > 1 && (
                  <button
                    onClick={() => removeMatch(m.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition"
                  >
                    Supprimer
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {/* Domicile / Extérieur */}
                <div className="flex gap-2">
                  {[{ val: true, label: 'Dom.' }, { val: false, label: 'Ext.' }].map(opt => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => update(m.id, 'isHome', opt.val)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        m.isHome === opt.val
                          ? 'bg-[#111827] text-white border-[#111827]'
                          : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={m.date}
                      onChange={e => update(m.id, 'date', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Compétition</label>
                    <input
                      type="text"
                      value={m.competition}
                      onChange={e => update(m.id, 'competition', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                      placeholder="Championnat..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Adversaire</label>
                  <input
                    type="text"
                    value={m.opponent}
                    onChange={e => update(m.id, 'opponent', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                    placeholder="Ex: Stade Nîmois"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {matches.length < 6 && (
          <button
            onClick={addMatch}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition"
          >
            + Ajouter un match
          </button>
        )}

        {filled.length > 0 && (
          <div className="bg-[#111827]/5 rounded-xl p-3 text-xs text-[#111827]">
            <p className="font-semibold">✅ {filled.length} match{filled.length > 1 ? 's' : ''} prêt{filled.length > 1 ? 's' : ''} pour le visuel</p>
            <p className="text-gray-500 mt-0.5">Le visuel se met à jour automatiquement à droite</p>
          </div>
        )}

        {filled.length > 0 && <ToneSelector value={tone} onChange={setTone} />}

        {filled.length > 0 && (
          <button
            onClick={generateCaptions}
            disabled={generating}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4fd8] transition disabled:opacity-60"
          >
            {generating
              ? <><Icon name="refresh" className="h-[18px] w-[18px] animate-spin" /> Génération…</>
              : <><Icon name="sparkles" className="h-[18px] w-[18px]" /> Générer les légendes IA</>}
          </button>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Visuel en temps réel */}
      <div className="space-y-3">
        <FormatToggle value={visualFormat} onChange={setVisualFormat} />
        <ScheduleGenerator club={club} matches={filled} format={visualFormat} onCanvasReady={c => { canvasRef.current = c }} />
      </div>
    </div>
  )
}
