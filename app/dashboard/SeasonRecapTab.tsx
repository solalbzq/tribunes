'use client'

import { useRef, useState } from 'react'
import TextPostsPanel from './TextPostsPanel'
import ToneSelector from './ToneSelector'
import SeasonRecapVisualGenerator from './SeasonRecapVisualGenerator'
import FormatToggle from './FormatToggle'
import type { VisualFormat } from '@/lib/visualLayout'
import { FIELD, PageHeader } from './ui'
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

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Bilan de saison/période — disponible pour tous les sports, tennis/padel
 * inclus : s'appuie uniquement sur MatchResult (déjà commun à tous les flux),
 * pas de logique spécifique à un sport.
 */
export type SeasonRecapFormInitialValues = Partial<{
  periodStart: string
  periodEnd: string
  periodLabel: string
  rankingNote: string
}>

export default function SeasonRecapTab({ club, initialValues }: { club: Club; initialValues?: SeasonRecapFormInitialValues }) {
  const [periodStart, setPeriodStart] = useState(initialValues?.periodStart ?? startOfYear())
  const [periodEnd, setPeriodEnd] = useState(initialValues?.periodEnd ?? today())
  const [periodLabel, setPeriodLabel] = useState(initialValues?.periodLabel ?? 'de la saison')
  const [rankingNote, setRankingNote] = useState(initialValues?.rankingNote ?? '')
  const [tone, setTone] = useState('')
  const [visualFormat, setVisualFormat] = useState<VisualFormat>('post')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Posts | null>(null)
  const [postIds, setPostIds] = useState<PostIds | null>(null)
  const [record, setRecord] = useState<{ wins: number; draws: number; losses: number } | null>(null)
  const [recapId, setRecapId] = useState<string | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const [bannedWordsWarning, setBannedWordsWarning] = useState<Record<string, string[]> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  async function generate() {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/posts/season-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          periodLabel,
          rankingNote: rankingNote || undefined,
          tone: tone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Échec de la génération')
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
      setRecord(data.record ?? null)
      setRecapId(data.recapId ?? null)
      setBannedWordsWarning(data.bannedWordsWarning ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function personalize(overrides: { tone?: string; customInstructions?: string }) {
    if (!recapId) return
    setPersonalizing(true)
    try {
      const res = await fetch('/api/posts/season-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart, periodEnd, periodLabel, rankingNote: rankingNote || undefined,
          id: recapId, regenerate: true,
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

  if (posts && record) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        <div className="space-y-3">
          <FormatToggle value={visualFormat} onChange={setVisualFormat} />
          <SeasonRecapVisualGenerator
            club={club}
            periodLabel={periodLabel}
            wins={record.wins}
            draws={record.draws}
            losses={record.losses}
            rankingNote={rankingNote || undefined}
            format={visualFormat}
            onCanvasReady={c => { canvasRef.current = c }}
          />
        </div>
        <TextPostsPanel
          posts={posts}
          postIds={postIds}
          title={`Bilan prêt — ${record.wins}V ${record.draws}N ${record.losses}D`}
          onReset={() => { setPosts(null); setPostIds(null); setRecord(null); setRecapId(null); setBannedWordsWarning(null) }}
          getImageBlob={getImageBlob}
          onPersonalize={personalize}
          personalizing={personalizing}
          bannedWordsWarning={bannedWordsWarning}
          postType="SEASON_RECAP"
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        icon="trophy"
        title="Bilan de saison"
        subtitle="Le résultat (victoires/nuls/défaites) est calculé automatiquement depuis vos matchs enregistrés sur la période."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Depuis le</label>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Jusqu'au</label>
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={FIELD} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Intitulé de la période</label>
        <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} className={FIELD} placeholder="Ex: de la saison 2025-2026, du 1er trimestre..." />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Classement / fait marquant (optionnel)</label>
        <input value={rankingNote} onChange={e => setRankingNote(e.target.value)} className={FIELD} placeholder="Ex: 2e du classement départemental, montée en division supérieure..." />
      </div>

      <ToneSelector value={tone} onChange={setTone} />

      <button
        onClick={generate}
        disabled={generating}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4fd8] transition disabled:opacity-60"
      >
        {generating
          ? <><Icon name="refresh" className="h-[18px] w-[18px] animate-spin" /> Calcul et génération…</>
          : <><Icon name="sparkles" className="h-[18px] w-[18px]" /> Générer le bilan</>}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
