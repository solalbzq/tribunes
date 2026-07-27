'use client'

import { useState } from 'react'
import { PageHeader, PrimaryButton, GhostButton } from './ui'
import { Icon } from './icons'
import { ErrorNotice, toUiError, type UiError } from './apiError'
import type { MatchFormInitialValues } from './GenerateForm'
import type { AnnouncementFormInitialValues } from './MatchAnnouncementTab'

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

type IntentExtractionResult =
  | { intent: 'MATCH_RESULT'; confidence: number; fields: MatchResultFields; missingFields: string[] }
  | { intent: 'MATCH_ANNOUNCEMENT'; confidence: number; fields: MatchAnnouncementFields; missingFields: string[] }
  | { intent: 'UNSUPPORTED'; confidence: number; fields: Record<string, never>; missingFields: [] }

type Target = 'match' | 'announcement'

const RESULT_FIELD_LABELS: Record<keyof MatchResultFields, string> = {
  opponent: 'Adversaire',
  isHome: 'Domicile / Extérieur',
  clubScore: 'Notre score',
  opponentScore: 'Score adverse',
  competition: 'Compétition',
  date: 'Date',
}

const ANNOUNCEMENT_FIELD_LABELS: Record<keyof MatchAnnouncementFields, string> = {
  opponent: 'Adversaire',
  isHome: 'Domicile / Extérieur',
  matchDate: 'Date',
  time: 'Heure',
  venue: 'Lieu',
  competition: 'Compétition',
  note: 'À mentionner',
}

function displayValue(v: string | number | boolean | null): string {
  if (v === null) return '—'
  if (typeof v === 'boolean') return v ? 'Domicile' : 'Extérieur'
  return String(v)
}

export default function DescribeIntentTab({
  onApply,
}: {
  onApply: (target: Target, values: MatchFormInitialValues | AnnouncementFormInitialValues, sourceText: string) => void
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<UiError>(null)
  const [result, setResult] = useState<IntentExtractionResult | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null)

  const detectedTarget: Target | null =
    result?.intent === 'MATCH_RESULT' ? 'match' : result?.intent === 'MATCH_ANNOUNCEMENT' ? 'announcement' : null
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
      if (r.intent === 'MATCH_RESULT') setSelectedTarget('match')
      else if (r.intent === 'MATCH_ANNOUNCEMENT') setSelectedTarget('announcement')
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

    if (selectedTarget === 'match') {
      const fields = !targetChanged && result?.intent === 'MATCH_RESULT' ? result.fields : null
      if (!fields) { onApply('match', {}, sourceText); return }
      const isHome = fields.isHome ?? true
      onApply('match', {
        opponent: fields.opponent ?? undefined,
        isHome,
        homeScore: (isHome ? fields.clubScore : fields.opponentScore) ?? undefined,
        awayScore: (isHome ? fields.opponentScore : fields.clubScore) ?? undefined,
        competition: fields.competition ?? undefined,
        date: fields.date ?? undefined,
      }, sourceText)
    } else {
      const fields = !targetChanged && result?.intent === 'MATCH_ANNOUNCEMENT' ? result.fields : null
      if (!fields) { onApply('announcement', {}, sourceText); return }
      onApply('announcement', {
        opponent: fields.opponent ?? undefined,
        isHome: fields.isHome ?? undefined,
        matchDate: fields.matchDate ?? undefined,
        time: fields.time ?? undefined,
        venue: fields.venue ?? undefined,
        competition: fields.competition ?? undefined,
        note: fields.note ?? undefined,
      }, sourceText)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon="sparkles"
        title="Décrivez votre publication"
        subtitle="Résultat de match ou annonce de match — l'IA prépare le formulaire, vous le vérifiez avant de générer."
      />

      {!result && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 resize-none"
            placeholder="Ex : Annonce le match de l'équipe 1 dimanche à 15h contre Montpellier, ton motivant, pour Instagram et Facebook."
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
              Je n&apos;ai pas identifié de résultat ni d&apos;annonce de match dans ce texte. Choisis un type ci-dessous pour continuer avec un formulaire vierge, ou reformule ta demande.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Type détecté : <span className="font-semibold text-ink">{result.intent === 'MATCH_RESULT' ? 'Résultat de match' : 'Annonce de match'}</span>
              {result.confidence < 0.5 && <span className="ml-2 text-amber-600 font-medium">(confiance faible, vérifie bien les champs)</span>}
            </p>
          )}

          <div>
            <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Type de publication</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedTarget('match')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  selectedTarget === 'match' ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                Résultat de match
              </button>
              <button type="button" onClick={() => setSelectedTarget('announcement')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  selectedTarget === 'announcement' ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                Annonce de match
              </button>
            </div>
          </div>

          {!targetChanged && result.intent === 'MATCH_RESULT' && (
            <FieldsSummary fields={result.fields} labels={RESULT_FIELD_LABELS} missingFields={result.missingFields} />
          )}
          {!targetChanged && result.intent === 'MATCH_ANNOUNCEMENT' && (
            <FieldsSummary fields={result.fields} labels={ANNOUNCEMENT_FIELD_LABELS} missingFields={result.missingFields} />
          )}

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

function FieldsSummary<T extends Record<string, string | number | boolean | null>>({
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
