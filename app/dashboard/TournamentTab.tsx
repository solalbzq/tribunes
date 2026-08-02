'use client'

import { useRef, useState } from 'react'
import TextPostsPanel from './TextPostsPanel'
import ToneSelector from './ToneSelector'
import TournamentVisualGenerator from './TournamentVisualGenerator'
import FormatToggle from './FormatToggle'
import type { VisualFormat } from '@/lib/visualLayout'
import { FIELD } from './ui'
import { Icon } from './icons'

type TournamentMatchRow = {
  id: string
  opponent: string
  time: string
  category: string
  round: string
}

type Posts = { instagram: string; facebook: string; whatsapp: string }
type PostIds = Partial<Record<keyof Posts, string>>

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

const EMPTY_ROW = (): TournamentMatchRow => ({
  id: Math.random().toString(36).slice(2),
  opponent: '',
  time: '',
  category: '',
  round: '',
})

export default function TournamentTab({ club }: { club: Club }) {
  const [tournamentName, setTournamentName] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [venue, setVenue] = useState('')
  const [rows, setRows] = useState<TournamentMatchRow[]>([EMPTY_ROW()])
  const [visualFormat, setVisualFormat] = useState<VisualFormat>('post')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Posts | null>(null)
  const [postIds, setPostIds] = useState<PostIds | null>(null)
  const [tone, setTone] = useState('')
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const [bannedWordsWarning, setBannedWordsWarning] = useState<Record<string, string[]> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  function addRow() {
    if (rows.length >= 10) return
    setRows(prev => [...prev, EMPTY_ROW()])
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function update(id: string, field: keyof TournamentMatchRow, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const filled = rows.filter(r => r.opponent && r.time)
  const canGenerate = tournamentName && matchDate && filled.length > 0

  async function generateCaptions() {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/posts/generic/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentName,
          matchDate,
          venue,
          matches: filled.map(r => ({
            opponent: r.opponent,
            time: r.time,
            category: r.category || undefined,
            round: r.round || undefined,
          })),
          tone: tone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Échec de la génération')
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
      setScheduleId(data.scheduleId ?? null)
      setBannedWordsWarning(data.bannedWordsWarning ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function personalize(overrides: { tone?: string; customInstructions?: string }) {
    if (!scheduleId) return
    setPersonalizing(true)
    try {
      const res = await fetch('/api/posts/generic/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentName, matchDate, venue,
          matches: filled.map(r => ({
            opponent: r.opponent, time: r.time,
            category: r.category || undefined, round: r.round || undefined,
          })),
          scheduleId, regenerate: true,
          tone: overrides.tone, customInstructions: overrides.customInstructions,
        }),
      })
      const data = await res.json()
      if (!res.ok) return
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
      setBannedWordsWarning(data.bannedWordsWarning ?? null)
    } finally {
      setPersonalizing(false)
    }
  }

  if (posts) {
    return (
      <TextPostsPanel
        posts={posts}
        postIds={postIds}
        title="Vos légendes de tournoi sont prêtes"
        onReset={() => { setPosts(null); setPostIds(null); setScheduleId(null); setBannedWordsWarning(null) }}
        getImageBlob={getImageBlob}
        onPersonalize={personalize}
        personalizing={personalizing}
        bannedWordsWarning={bannedWordsWarning}
        postType="TOURNAMENT_SCHEDULE"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nom du tournoi</label>
            <input value={tournamentName} onChange={e => setTournamentName(e.target.value)} className={FIELD} placeholder="Ex: Coupe départementale" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date</label>
            <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} className={FIELD} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Lieu</label>
          <input value={venue} onChange={e => setVenue(e.target.value)} className={FIELD} placeholder="Gymnase, stade..." />
        </div>

        <div className="flex items-center justify-between pt-2">
          <h3 className="font-bold text-[#111827]">Nos matchs programmés</h3>
          <span className="text-xs text-gray-400">{rows.length}/10</span>
        </div>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.id} className="bg-white rounded-card border border-line shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Match {i + 1}</span>
                {rows.length > 1 && (
                  <button onClick={() => removeRow(r.id)} className="text-xs text-red-400 hover:text-red-600 transition">
                    Supprimer
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Adversaire</label>
                  <input value={r.opponent} onChange={e => update(r.id, 'opponent', e.target.value)} className={FIELD} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Horaire</label>
                  <input value={r.time} onChange={e => update(r.id, 'time', e.target.value)} className={FIELD} placeholder="14h30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Catégorie</label>
                  <input value={r.category} onChange={e => update(r.id, 'category', e.target.value)} className={FIELD} placeholder="Seniors..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tour</label>
                  <input value={r.round} onChange={e => update(r.id, 'round', e.target.value)} className={FIELD} placeholder="Quarts..." />
                </div>
              </div>
            </div>
          ))}
        </div>

        {rows.length < 10 && (
          <button
            onClick={addRow}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition"
          >
            + Ajouter un match
          </button>
        )}

        <ToneSelector value={tone} onChange={setTone} />

        <button
          onClick={generateCaptions}
          disabled={generating || !canGenerate}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4fd8] transition disabled:opacity-60"
        >
          {generating
            ? <><Icon name="refresh" className="h-[18px] w-[18px] animate-spin" /> Génération…</>
            : <><Icon name="sparkles" className="h-[18px] w-[18px]" /> Générer les légendes IA</>}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="space-y-3">
        <FormatToggle value={visualFormat} onChange={setVisualFormat} />
        <TournamentVisualGenerator
          club={club}
          tournamentName={tournamentName || 'Notre tournoi'}
          venue={venue}
          matchDate={matchDate}
          matches={filled}
          format={visualFormat}
          onCanvasReady={c => { canvasRef.current = c }}
        />
      </div>
    </div>
  )
}
