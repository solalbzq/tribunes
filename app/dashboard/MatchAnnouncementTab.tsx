'use client'

import { useRef, useState } from 'react'
import TextPostsPanel from './TextPostsPanel'
import ToneSelector from './ToneSelector'
import MatchAnnouncementVisualGenerator from './MatchAnnouncementVisualGenerator'
import { FIELD } from './ui'
import { Icon } from './icons'

type Posts = { instagram: string; facebook: string; whatsapp: string }
type PostIds = Partial<Record<keyof Posts, string>>

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

export type AnnouncementFormInitialValues = Partial<{
  opponent: string
  isHome: boolean
  matchDate: string
  time: string
  venue: string
  competition: string
  note: string
}>

export default function MatchAnnouncementTab({ club, initialValues }: { club: Club; initialValues?: AnnouncementFormInitialValues }) {
  const [opponent, setOpponent] = useState(initialValues?.opponent ?? '')
  const [matchDate, setMatchDate] = useState(initialValues?.matchDate ?? '')
  const [time, setTime] = useState(initialValues?.time ?? '')
  const [venue, setVenue] = useState(initialValues?.venue ?? '')
  const [competition, setCompetition] = useState(initialValues?.competition ?? '')
  const [isHome, setIsHome] = useState(initialValues?.isHome ?? true)
  const [note, setNote] = useState(initialValues?.note ?? '')
  const [tone, setTone] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Posts | null>(null)
  const [postIds, setPostIds] = useState<PostIds | null>(null)
  const [announcementId, setAnnouncementId] = useState<string | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  const canGenerate = Boolean(opponent && matchDate)

  async function generateCaptions() {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/posts/match-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponent,
          matchDate,
          time: time || undefined,
          venue: venue || undefined,
          competition: competition || undefined,
          isHome,
          note: note || undefined,
          tone: tone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Échec de la génération')
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
      setAnnouncementId(data.announcementId ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function personalize(overrides: { tone?: string; customInstructions?: string }) {
    if (!announcementId) return
    setPersonalizing(true)
    try {
      const res = await fetch('/api/posts/match-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponent, matchDate, time: time || undefined, venue: venue || undefined,
          competition: competition || undefined, isHome, note: note || undefined,
          id: announcementId, regenerate: true,
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
        title="Vos légendes avant-match sont prêtes"
        onReset={() => { setPosts(null); setPostIds(null); setAnnouncementId(null) }}
        getImageBlob={getImageBlob}
        onPersonalize={personalize}
        personalizing={personalizing}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
      <div className="space-y-4">
        <div className="flex gap-2">
          {[{ val: true, label: 'Domicile' }, { val: false, label: 'Extérieur' }].map(opt => (
            <button
              key={String(opt.val)}
              type="button"
              onClick={() => setIsHome(opt.val)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                isHome === opt.val ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Adversaire</label>
          <input value={opponent} onChange={e => setOpponent(e.target.value)} className={FIELD} placeholder="Ex: AS Concurrent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date</label>
            <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} className={FIELD} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Heure</label>
            <input value={time} onChange={e => setTime(e.target.value)} className={FIELD} placeholder="18h00" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Lieu</label>
            <input value={venue} onChange={e => setVenue(e.target.value)} className={FIELD} placeholder="Stade, gymnase..." />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Compétition</label>
            <input value={competition} onChange={e => setCompetition(e.target.value)} className={FIELD} placeholder="Championnat..." />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">À mentionner (optionnel)</label>
          <input value={note} onChange={e => setNote(e.target.value)} className={FIELD} placeholder="Ex: derby, match décisif, tarif spécial..." />
        </div>

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

      <div>
        <MatchAnnouncementVisualGenerator
          club={club}
          opponent={opponent}
          matchDate={matchDate}
          time={time}
          venue={venue}
          isHome={isHome}
          onCanvasReady={c => { canvasRef.current = c }}
        />
      </div>
    </div>
  )
}
