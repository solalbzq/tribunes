'use client'

import { useRef, useState } from 'react'
import { PageHeader, FIELD, FieldLabel } from '../ui'
import { Icon } from '../icons'
import { ErrorNotice, toUiError, type UiError } from '../apiError'
import TennisActions from './TennisActions'
import ToneSelector from '../ToneSelector'
import { TennisResultVisual, type TennisVisualConfig, DEFAULT_TENNIS_CONFIG } from './TennisVisualGenerator'

type Club = {
  name: string; sport: string; primaryColor: string; secondaryColor: string
  logoUrl: string | null; tennisVisualConfig?: TennisVisualConfig | null
}
type Posts = { instagram: string; facebook: string }
type Detail = { player: string; opponent: string; score: string; won: boolean; type: 'SIMPLE' | 'DOUBLE' }

export default function TennisResultSection({ club }: { club: Club }) {
  const cfg = club.tennisVisualConfig ?? DEFAULT_TENNIS_CONFIG
  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [teamName, setTeamName] = useState(club.name)
  const [opponent, setOpponent] = useState('')
  const [division, setDivision] = useState('')
  const [round, setRound] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [homeAway, setHomeAway] = useState<'DOMICILE' | 'EXTERIEUR'>('DOMICILE')
  const [clubScore, setClubScore] = useState('')
  const [oppScore, setOppScore] = useState('')
  const [details, setDetails] = useState<Detail[]>([])
  const [mvpName, setMvpName] = useState('')
  const [tone, setTone] = useState('')

  const [reading, setReading] = useState(false)
  const [error, setError] = useState<UiError>(null)
  const [matchResultId, setMatchResultId] = useState<string | null>(null)
  const [aiPosts, setAiPosts] = useState<Posts | null>(null)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [bannedWordsWarning, setBannedWordsWarning] = useState<Record<string, string[]> | null>(null)

  const hasScore = clubScore !== '' && oppScore !== '' && opponent.trim() !== ''

  async function handleVision(file: File) {
    setReading(true); setError(null)
    const fd = new FormData()
    fd.append('image', file)
    fd.append('hint', 'resultat')
    try {
      const res = await fetch('/api/tennis/ingest', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setError(toUiError(json, 'Lecture impossible')); return }
      const d = json.data ?? {}
      if (d.teamName) setTeamName(d.teamName)
      if (d.opponent) setOpponent(d.opponent)
      if (d.division) setDivision(d.division)
      if (d.homeAway === 'DOMICILE' || d.homeAway === 'EXTERIEUR') setHomeAway(d.homeAway)
      if (typeof d.globalScore === 'string' && d.globalScore.includes('-')) {
        const [a, b] = d.globalScore.split('-')
        if (a?.trim()) setClubScore(a.trim())
        if (b?.trim()) setOppScore(b.trim())
      }
      if (Array.isArray(d.details)) setDetails(d.details)
      setMatchResultId(null); setAiPosts(null)
    } catch {
      setError({ message: 'Erreur lors de la lecture de la capture.', quota: false })
    } finally {
      setReading(false)
    }
  }

  async function saveResult(): Promise<string | null> {
    const res = await fetch('/api/posts/tennis/interclub/result-input', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchResultId, teamName, opponent, division, round, date, homeAway,
        clubScore: Number(clubScore), oppScore: Number(oppScore), scoreDetail: details,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(toUiError(json, 'Enregistrement impossible')); return null }
    setMatchResultId(json.matchResultId)
    return json.matchResultId
  }

  async function generateCaption() {
    setGeneratingCaption(true); setError(null)
    const id = matchResultId ?? (await saveResult())
    if (!id) { setGeneratingCaption(false); return }
    const res = await fetch('/api/posts/tennis/interclub/result', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchResultId: id, regenerate: !!aiPosts, tone: tone || undefined, mvpName: mvpName || undefined }),
    })
    const json = await res.json()
    setGeneratingCaption(false)
    if (!res.ok) { setError(toUiError(json, 'Génération impossible')); return }
    setAiPosts(json.posts)
    setBannedWordsWarning(json.bannedWordsWarning ?? null)
  }

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  const outcome = Number(clubScore) > Number(oppScore) ? 'Victoire' : Number(clubScore) < Number(oppScore) ? 'Défaite' : 'Match nul'
  const defaultCaption = hasScore
    ? `${outcome} ${clubScore}-${oppScore} pour ${teamName} face à ${opponent}${division ? ` · ${division}` : ''}.`
    : ''

  return (
    <div className="space-y-6">
      <PageHeader icon="trophy" title="Résultat de rencontre" subtitle="Saisissez le score — ou importez une capture Ten'Up." />

      {/* Import capture Ten'Up (vision) */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={reading}
        className="flex w-full items-center gap-3 rounded-card border-2 border-dashed border-line bg-white p-5 text-left transition hover:border-brand disabled:opacity-60"
      >
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-brand-soft text-brand">
          <Icon name={reading ? 'refresh' : 'image'} className={`h-5 w-5 ${reading ? 'animate-spin' : ''}`} />
        </span>
        <span>
          <span className="block font-bold text-ink">{reading ? 'Lecture de la capture…' : 'Importer une capture Ten\'Up'}</span>
          <span className="block text-sm text-muted">Photographiez la page des scores, l&apos;IA remplit tout automatiquement.</span>
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleVision(f) }} />

      {/* Formulaire */}
      <div className="rounded-card border border-line bg-white p-6 shadow-card space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><FieldLabel>Notre équipe</FieldLabel><input className={FIELD} value={teamName} onChange={e => setTeamName(e.target.value)} /></div>
          <div><FieldLabel>Adversaire</FieldLabel><input className={FIELD} value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Ex: TC Calvisson 2" /></div>
          <div><FieldLabel>Division</FieldLabel><input className={FIELD} value={division} onChange={e => setDivision(e.target.value)} placeholder="Ex: Départemental" /></div>
          <div><FieldLabel>Journée</FieldLabel><input className={FIELD} value={round} onChange={e => setRound(e.target.value)} placeholder="Ex: J3" /></div>
          <div><FieldLabel>Date</FieldLabel><input type="date" className={FIELD} value={date} onChange={e => setDate(e.target.value)} /></div>
          <div>
            <FieldLabel>Lieu</FieldLabel>
            <div className="flex gap-2">
              {(['DOMICILE', 'EXTERIEUR'] as const).map(v => (
                <button key={v} type="button" onClick={() => setHomeAway(v)}
                  className={`flex-1 rounded-btn border py-2.5 text-sm font-semibold transition ${homeAway === v ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'}`}>
                  {v === 'DOMICILE' ? 'Domicile' : 'Extérieur'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Score global</FieldLabel>
          <div className="flex items-center gap-3">
            <input type="number" min="0" className={`${FIELD} text-center text-lg font-bold`} value={clubScore} onChange={e => setClubScore(e.target.value)} placeholder="0" />
            <span className="text-xl font-black text-muted">–</span>
            <input type="number" min="0" className={`${FIELD} text-center text-lg font-bold`} value={oppScore} onChange={e => setOppScore(e.target.value)} placeholder="0" />
          </div>
          {details.length > 0 && (
            <p className="mt-2 text-xs text-muted">{details.length} match(s) détaillé(s) importé(s) — utilisés dans la légende.</p>
          )}
        </div>

        <div>
          <FieldLabel>Joueur·se du match (optionnel)</FieldLabel>
          <input className={FIELD} value={mvpName} onChange={e => setMvpName(e.target.value)} placeholder="Ex: Camille Martin" />
        </div>
      </div>

      <ErrorNotice error={error} />

      {bannedWordsWarning && Object.keys(bannedWordsWarning).length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Expression à éviter détectée</p>
          <p className="mt-1">
            {Object.entries(bannedWordsWarning).map(([platform, words]) => (
              <span key={platform} className="block">{platform} : {words.join(', ')}</span>
            ))}
          </p>
          <p className="mt-1 text-xs text-amber-700">La publication automatique est désactivée pour ce contenu.</p>
        </div>
      )}

      {/* Aperçu + actions */}
      {hasScore && (
        <>
          <TennisResultVisual
            club={club}
            data={{ teamName, opponent, clubScore: Number(clubScore), oppScore: Number(oppScore), division, journee: round || undefined }}
            config={cfg}
            onCanvasReady={c => { canvasRef.current = c }}
          />
          <ToneSelector value={tone} onChange={setTone} />
          <TennisActions
            getImageBlob={getImageBlob}
            defaultCaption={defaultCaption}
            aiPosts={aiPosts}
            onGenerateCaption={generateCaption}
            generatingCaption={generatingCaption}
            filename={`resultat-${teamName.toLowerCase().replace(/\s/g, '-')}`}
          />
        </>
      )}
    </div>
  )
}
