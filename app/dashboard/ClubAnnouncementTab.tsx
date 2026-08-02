'use client'

import { useRef, useState } from 'react'
import TextPostsPanel from './TextPostsPanel'
import ToneSelector from './ToneSelector'
import ClubAnnouncementVisualGenerator from './ClubAnnouncementVisualGenerator'
import type { ClubAnnouncementCategory } from '@/lib/prompts/club-announcement'
import FormatToggle from './FormatToggle'
import type { VisualFormat } from '@/lib/visualLayout'
import { FIELD } from './ui'
import { Icon } from './icons'

type Posts = { instagram: string; facebook: string }
type PostIds = Partial<Record<keyof Posts, string>>

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

const CATEGORIES: { key: ClubAnnouncementCategory; label: string }[] = [
  { key: 'RECRUITMENT', label: 'Recrutement' },
  { key: 'SPONSOR', label: 'Sponsor' },
  { key: 'CLUB_LIFE', label: 'Vie du club' },
  { key: 'VOLUNTEER', label: 'Bénévolat' },
  { key: 'THANKS', label: 'Remerciement' },
]

export type ClubAnnouncementFormInitialValues = Partial<{
  category: ClubAnnouncementCategory
  title: string
  description: string
}>

export default function ClubAnnouncementTab({ club, initialValues }: { club: Club; initialValues?: ClubAnnouncementFormInitialValues }) {
  const [category, setCategory] = useState<ClubAnnouncementCategory>(initialValues?.category ?? 'CLUB_LIFE')
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [ctaText, setCtaText] = useState('')
  const [tone, setTone] = useState('')
  const [visualFormat, setVisualFormat] = useState<VisualFormat>('post')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Posts | null>(null)
  const [postIds, setPostIds] = useState<PostIds | null>(null)
  const [announcementId, setAnnouncementId] = useState<string | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const [bannedWordsWarning, setBannedWordsWarning] = useState<Record<string, string[]> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  const canGenerate = Boolean(title && description)

  async function generateCaptions() {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/posts/club-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title,
          description,
          ctaText: ctaText || undefined,
          tone: tone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Échec de la génération')
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
      setAnnouncementId(data.announcementId ?? null)
      setBannedWordsWarning(data.bannedWordsWarning ?? null)
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
      const res = await fetch('/api/posts/club-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category, title, description, ctaText: ctaText || undefined,
          id: announcementId, regenerate: true,
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
        title="Vos légendes sont prêtes"
        onReset={() => { setPosts(null); setPostIds(null); setAnnouncementId(null); setBannedWordsWarning(null) }}
        getImageBlob={getImageBlob}
        onPersonalize={personalize}
        personalizing={personalizing}
        bannedWordsWarning={bannedWordsWarning}
        postType="CLUB_ANNOUNCEMENT"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type d&apos;annonce</label>
          <div className="flex gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                  category === c.key ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Titre</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={FIELD} placeholder="Ex: Rejoignez notre section jeunes !" />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className={FIELD}
            placeholder="Détaille l'annonce : contexte, informations pratiques..."
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Appel à l&apos;action (optionnel)</label>
          <input value={ctaText} onChange={e => setCtaText(e.target.value)} className={FIELD} placeholder="Ex: Contactez-nous au 06 xx xx xx xx" />
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
        <ClubAnnouncementVisualGenerator
          club={club}
          category={category}
          title={title}
          description={description}
          format={visualFormat}
          onCanvasReady={c => { canvasRef.current = c }}
        />
      </div>
    </div>
  )
}
