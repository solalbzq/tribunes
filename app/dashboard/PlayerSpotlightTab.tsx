'use client'

import { useRef, useState } from 'react'
import TextPostsPanel from './TextPostsPanel'
import ToneSelector from './ToneSelector'
import PlayerSpotlightVisualGenerator from './PlayerSpotlightVisualGenerator'
import FormatToggle from './FormatToggle'
import type { VisualFormat } from '@/lib/visualLayout'
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

const MAX_PHOTOS = 3

export default function PlayerSpotlightTab({ club }: { club: Club }) {
  const [playerName, setPlayerName] = useState('')
  const [achievement, setAchievement] = useState('')
  const [periodLabel, setPeriodLabel] = useState('')
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null, null, null])
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null])
  const [tone, setTone] = useState('')
  const [visualFormat, setVisualFormat] = useState<VisualFormat>('post')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Posts | null>(null)
  const [postIds, setPostIds] = useState<PostIds | null>(null)
  const [spotlightId, setSpotlightId] = useState<string | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  function handlePhotoChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFiles(prev => prev.map((f, i) => i === index ? file : f))
    setPhotoPreviews(prev => prev.map((p, i) => i === index ? URL.createObjectURL(file) : p))
  }

  const canGenerate = Boolean(playerName && achievement)

  async function generateCaptions() {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/posts/player-spotlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName,
          achievement,
          periodLabel: periodLabel || undefined,
          tone: tone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Échec de la génération')
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
      setSpotlightId(data.spotlightId ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function personalize(overrides: { tone?: string; customInstructions?: string }) {
    if (!spotlightId) return
    setPersonalizing(true)
    try {
      const res = await fetch('/api/posts/player-spotlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName, achievement, periodLabel: periodLabel || undefined,
          id: spotlightId, regenerate: true,
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
        title="Vos légendes sont prêtes"
        onReset={() => { setPosts(null); setPostIds(null); setSpotlightId(null) }}
        getImageBlob={getImageBlob}
        onPersonalize={personalize}
        personalizing={personalizing}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Joueur / joueuse</label>
          <input value={playerName} onChange={e => setPlayerName(e.target.value)} className={FIELD} placeholder="Ex: Julie Martin" />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Performance / raison de la mise à l&apos;honneur</label>
          <textarea
            value={achievement}
            onChange={e => setAchievement(e.target.value)}
            rows={3}
            className={FIELD}
            placeholder="Ex: buteuse du mois, 100e match avec le club, titre de champion départemental..."
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Période (optionnel)</label>
          <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} className={FIELD} placeholder="Ex: du mois de mars" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-2">
            Photos <span className="font-normal text-gray-400">(optionnel — jusqu'à {MAX_PHOTOS}, pour un visuel façon collage)</span>
          </label>
          <div className="flex items-center gap-4">
            {photoPreviews.map((preview, i) => (
              <div key={i}>
                <div onClick={() => fileRefs.current[i]?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#2563eb] transition shrink-0">
                  {preview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={preview} alt="aperçu" className="w-full h-full object-cover" />
                    : <Icon name="image" className="h-6 w-6 text-muted" />}
                </div>
                <input ref={el => { fileRefs.current[i] = el }} type="file" accept="image/*" className="hidden"
                  onChange={e => handlePhotoChange(i, e)} />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Sans photo, un avatar aux initiales sera utilisé. Pour afficher plusieurs photos sur le visuel, ajoute d&apos;abord des cadres "Photo" dans Personnalisation.</p>
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

      <div className="space-y-3">
        <FormatToggle value={visualFormat} onChange={setVisualFormat} />
        <PlayerSpotlightVisualGenerator
          club={club}
          playerName={playerName}
          achievement={achievement}
          photoFiles={photoFiles}
          format={visualFormat}
          onCanvasReady={c => { canvasRef.current = c }}
        />
      </div>
    </div>
  )
}
