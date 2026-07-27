'use client'

import { useState } from 'react'
import { PageHeader, PrimaryButton, GhostButton } from './ui'
import { ErrorNotice, toUiError, type UiError } from './apiError'
import type { MatchFormInitialValues } from './GenerateForm'
import type { AnnouncementFormInitialValues } from './MatchAnnouncementTab'
import type { ClubAnnouncementFormInitialValues } from './ClubAnnouncementTab'
import type { PlayerSpotlightFormInitialValues } from './PlayerSpotlightTab'
import type { SeasonRecapFormInitialValues } from './SeasonRecapTab'
import type { EngagementPollFormInitialValues } from './EngagementPollTab'

type MatchResultFields = {
  opponent: string | null
  isHome: boolean | null
  clubScore: number | null
  opponentScore: number | null
  competition: string | null
  date: string | null
}

type MatchAnnouncementFields = {
  opponent: string | null
  isHome: boolean | null
  matchDate: string | null
  time: string | null
  venue: string | null
  competition: string | null
  note: string | null
}

type ClubAnnouncementFields = {
  category: 'RECRUITMENT' | 'SPONSOR' | 'CLUB_LIFE'
  title: string | null
  description: string | null
}

type PlayerSpotlightFields = {
  playerName: string | null
  achievement: string | null
  periodLabel: string | null
}

type SeasonRecapFields = {
  periodStart: string | null
  periodEnd: string | null
  periodLabel: string | null
  rankingNote: string | null
}

type EngagementPollFields = {
  question: string | null
  options: string[]
}

type IntentExtractionResult =
  | { intent: 'MATCH_RESULT'; confidence: number; fields: MatchResultFields; missingFields: string[] }
  | { intent: 'MATCH_ANNOUNCEMENT'; confidence: number; fields: MatchAnnouncementFields; missingFields: string[] }
  | { intent: 'CLUB_ANNOUNCEMENT'; confidence: number; fields: ClubAnnouncementFields; missingFields: string[] }
  | { intent: 'PLAYER_SPOTLIGHT'; confidence: number; fields: PlayerSpotlightFields; missingFields: string[] }
  | { intent: 'SEASON_RECAP'; confidence: number; fields: SeasonRecapFields; missingFields: string[] }
  | { intent: 'ENGAGEMENT_POLL'; confidence: number; fields: EngagementPollFields; missingFields: string[] }
  | { intent: 'UNSUPPORTED'; confidence: number; fields: Record<string, never>; missingFields: [] }

type Target = 'match' | 'announcement' | 'clubAnnouncement' | 'playerSpotlight' | 'seasonRecap' | 'engagementPoll'

type ApplyValues =
  | MatchFormInitialValues
  | AnnouncementFormInitialValues
  | ClubAnnouncementFormInitialValues
  | PlayerSpotlightFormInitialValues
  | SeasonRecapFormInitialValues
  | EngagementPollFormInitialValues

const TARGET_LABELS: Record<Target, string> = {
  match: 'Résultat de match',
  announcement: 'Annonce de match',
  clubAnnouncement: 'Annonce du club',
  playerSpotlight: "Joueur à l'honneur",
  seasonRecap: 'Bilan de saison',
  engagementPoll: 'Sondage',
}

const INTENT_TO_TARGET: Partial<Record<IntentExtractionResult['intent'], Target>> = {
  MATCH_RESULT: 'match',
  MATCH_ANNOUNCEMENT: 'announcement',
  CLUB_ANNOUNCEMENT: 'clubAnnouncement',
  PLAYER_SPOTLIGHT: 'playerSpotlight',
  SEASON_RECAP: 'seasonRecap',
  ENGAGEMENT_POLL: 'engagementPoll',
}

const RESULT_FIELD_LABELS: Record<keyof MatchResultFields, string> = {
  opponent: 'Adversaire', isHome: 'Domicile / Extérieur', clubScore: 'Notre score',
  opponentScore: 'Score adverse', competition: 'Compétition', date: 'Date',
}
const ANNOUNCEMENT_FIELD_LABELS: Record<keyof MatchAnnouncementFields, string> = {
  opponent: 'Adversaire', isHome: 'Domicile / Extérieur', matchDate: 'Date',
  time: 'Heure', venue: 'Lieu', competition: 'Compétition', note: 'À mentionner',
}
const CLUB_ANNOUNCEMENT_FIELD_LABELS: Record<keyof ClubAnnouncementFields, string> = {
  category: 'Catégorie', title: 'Titre', description: 'Description',
}
const PLAYER_SPOTLIGHT_FIELD_LABELS: Record<keyof PlayerSpotlightFields, string> = {
  playerName: 'Joueur·se', achievement: 'Performance', periodLabel: 'Période',
}
const SEASON_RECAP_FIELD_LABELS: Record<keyof SeasonRecapFields, string> = {
  periodStart: 'Depuis le', periodEnd: "Jusqu'au", periodLabel: 'Intitulé', rankingNote: 'Classement / fait marquant',
}
const ENGAGEMENT_POLL_FIELD_LABELS: Record<keyof EngagementPollFields, string> = {
  question: 'Question', options: 'Options',
}
const CATEGORY_LABELS: Record<ClubAnnouncementFields['category'], string> = {
  RECRUITMENT: 'Recrutement', SPONSOR: 'Sponsor', CLUB_LIFE: 'Vie du club',
}

function displayValue(v: string | number | boolean | string[] | null): string {
  if (v === null) return '—'
  if (Array.isArray(v)) return v.length ? v.join(' · ') : '—'
  if (typeof v === 'boolean') return v ? 'Domicile' : 'Extérieur'
  if (typeof v === 'string' && v in CATEGORY_LABELS) return CATEGORY_LABELS[v as ClubAnnouncementFields['category']]
  return String(v)
}

export default function DescribeIntentTab({
  onApply,
}: {
  onApply: (target: Target, values: ApplyValues, sourceText: string) => void
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<UiError>(null)
  const [result, setResult] = useState<IntentExtractionResult | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null)

  const detectedTarget: Target | null = result ? INTENT_TO_TARGET[result.intent] ?? null : null
  const targetChanged = selectedTarget !== null && detectedTarget !== null && selectedTarget !== detectedTarget

  async function analyze() {
    if (!text.trim()) return
    setLoading(true); setError(null); setResult(null); setSelectedTarget(null)
    try {
      const res = await fetch('/api/intent/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setError(toUiError(json, 'Analyse impossible')); return }
      const r = json.result as IntentExtractionResult
      setResult(r)
      setSelectedTarget(INTENT_TO_TARGET[r.intent] ?? null)
    } catch {
      setError({ message: "Erreur lors de l'analyse.", quota: false })
    } finally {
      setLoading(false)
    }
  }

  function restart() {
    setResult(null)
    setSelectedTarget(null)
    setError(null)
  }

  function apply() {
    if (!selectedTarget) return
    const sourceText = text.trim()
    const matches = !targetChanged && result && INTENT_TO_TARGET[result.intent] === selectedTarget

    if (!matches || !result) {
      onApply(selectedTarget, {}, sourceText)
      return
    }

    switch (result.intent) {
      case 'MATCH_RESULT': {
        const f = result.fields
        const isHome = f.isHome ?? true
        onApply('match', {
          opponent: f.opponent ?? undefined,
          isHome,
          homeScore: (isHome ? f.clubScore : f.opponentScore) ?? undefined,
          awayScore: (isHome ? f.opponentScore : f.clubScore) ?? undefined,
          competition: f.competition ?? undefined,
          date: f.date ?? undefined,
        }, sourceText)
        return
      }
      case 'MATCH_ANNOUNCEMENT': {
        const f = result.fields
        onApply('announcement', {
          opponent: f.opponent ?? undefined,
          isHome: f.isHome ?? undefined,
          matchDate: f.matchDate ?? undefined,
          time: f.time ?? undefined,
          venue: f.venue ?? undefined,
          competition: f.competition ?? undefined,
          note: f.note ?? undefined,
        }, sourceText)
        return
      }
      case 'CLUB_ANNOUNCEMENT': {
        const f = result.fields
        onApply('clubAnnouncement', {
          category: f.category,
          title: f.title ?? undefined,
          description: f.description ?? undefined,
        }, sourceText)
        return
      }
      case 'PLAYER_SPOTLIGHT': {
        const f = result.fields
        onApply('playerSpotlight', {
          playerName: f.playerName ?? undefined,
          achievement: f.achievement ?? undefined,
          periodLabel: f.periodLabel ?? undefined,
        }, sourceText)
        return
      }
      case 'SEASON_RECAP': {
        const f = result.fields
        onApply('seasonRecap', {
          periodStart: f.periodStart ?? undefined,
          periodEnd: f.periodEnd ?? undefined,
          periodLabel: f.periodLabel ?? undefined,
          rankingNote: f.rankingNote ?? undefined,
        }, sourceText)
        return
      }
      case 'ENGAGEMENT_POLL': {
        const f = result.fields
        onApply('engagementPoll', {
          question: f.question ?? undefined,
          options: f.options.length ? f.options : undefined,
        }, sourceText)
        return
      }
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon="sparkles"
        title="Décrivez votre publication"
        subtitle="Résultat, annonce de match, annonce du club, joueur à l'honneur, bilan ou sondage — l'IA prépare le formulaire, vous le vérifiez avant de générer."
      />

      {!result && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 resize-none"
            placeholder="Ex : Un post pour remercier notre sponsor Decathlon qui équipe l'équipe 1 cette saison."
          />
          <ErrorNotice error={error} />
          <PrimaryButton onClick={analyze} disabled={loading || !text.trim()} loading={loading} icon={loading ? undefined : 'sparkles'}>
            {loading ? 'Analyse en cours…' : 'Analyser'}
          </PrimaryButton>
        </div>
      )}

      {result && (
        <div className="space-y-5 rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="rounded-xl bg-subtle p-3">
            <p className="text-xs font-semibold text-muted mb-1">Texte saisi</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{text.trim()}</p>
          </div>

          {result.intent === 'UNSUPPORTED' ? (
            <p className="text-sm text-gray-600">
              Je n&apos;ai pas identifié de type de publication pris en charge dans ce texte (le tournoi et le programme de la semaine ne sont pas encore supportés ici). Choisis un type ci-dessous pour continuer avec un formulaire vierge, ou reformule ta demande.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Type détecté : <span className="font-semibold text-ink">{TARGET_LABELS[INTENT_TO_TARGET[result.intent]!]}</span>
              {result.confidence < 0.5 && <span className="ml-2 text-amber-600 font-medium">(confiance faible, vérifie bien les champs)</span>}
            </p>
          )}

          <div>
            <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Type de publication</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TARGET_LABELS) as Target[]).map(t => (
                <button key={t} type="button" onClick={() => setSelectedTarget(t)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition ${
                    selectedTarget === t ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>
                  {TARGET_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {!targetChanged && result.intent === 'MATCH_RESULT' && <FieldsSummary fields={result.fields} labels={RESULT_FIELD_LABELS} missingFields={result.missingFields} />}
          {!targetChanged && result.intent === 'MATCH_ANNOUNCEMENT' && <FieldsSummary fields={result.fields} labels={ANNOUNCEMENT_FIELD_LABELS} missingFields={result.missingFields} />}
          {!targetChanged && result.intent === 'CLUB_ANNOUNCEMENT' && <FieldsSummary fields={result.fields} labels={CLUB_ANNOUNCEMENT_FIELD_LABELS} missingFields={result.missingFields} />}
          {!targetChanged && result.intent === 'PLAYER_SPOTLIGHT' && <FieldsSummary fields={result.fields} labels={PLAYER_SPOTLIGHT_FIELD_LABELS} missingFields={result.missingFields} />}
          {!targetChanged && result.intent === 'SEASON_RECAP' && <FieldsSummary fields={result.fields} labels={SEASON_RECAP_FIELD_LABELS} missingFields={result.missingFields} />}
          {!targetChanged && result.intent === 'ENGAGEMENT_POLL' && <FieldsSummary fields={result.fields} labels={ENGAGEMENT_POLL_FIELD_LABELS} missingFields={result.missingFields} />}

          {targetChanged && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Tu as changé le type par rapport à ce qui a été détecté : le formulaire s&apos;ouvrira vierge (les champs compris pour l&apos;autre type ne sont pas transférés). Le texte saisi reste accessible.
            </p>
          )}
          {result.intent === 'UNSUPPORTED' && selectedTarget && (
            <p className="text-xs text-gray-500">Le formulaire s&apos;ouvrira vierge, à remplir manuellement.</p>
          )}

          <div className="flex gap-3">
            <PrimaryButton onClick={apply} disabled={!selectedTarget} icon="arrowRight" className="flex-1">
              Utiliser ces informations
            </PrimaryButton>
            <GhostButton type="button" onClick={restart} icon="refresh">
              Recommencer
            </GhostButton>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldsSummary<T extends Record<string, string | number | boolean | string[] | null>>({
  fields,
  labels,
  missingFields,
}: {
  fields: T
  labels: Record<keyof T, string>
  missingFields: string[]
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Compris par l&apos;IA</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {(Object.keys(labels) as Array<keyof T>).map(key => {
          const missing = missingFields.includes(key as string)
          return (
            <div key={key as string} className="flex justify-between gap-2">
              <dt className="text-gray-500">{labels[key]}</dt>
              <dd className={`font-medium ${missing ? 'text-amber-600' : 'text-ink'}`}>
                {missing ? 'à compléter' : displayValue(fields[key])}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
