'use client'

import { useEffect, useState } from 'react'
import { POST_TYPES, type PostType } from '@/lib/postTypes'
import type { PostVisualKind } from '@/lib/visualLayout'
import { PageHeader, Field, INPUT } from './ui'
import { Icon } from './icons'

type OverrideEntry = {
  postType: string
  voiceOverride: string | null
  customInstructions: string | null
  signaturePhrase: string | null
  updatedAt: string
}

export type VisualTarget = 'result' | 'tennis' | PostVisualKind

/** Type -> cible d'édition visuelle existante, selon le sport du club (les clubs tennis/padel utilisent un éditeur unifié). */
function visualTargetFor(type: PostType, isTennisPadel: boolean): VisualTarget | null {
  switch (type) {
    case 'MATCH_RESULT': return isTennisPadel ? 'tennis' : 'result'
    case 'INTERCLUB_RESULT': return 'tennis'
    case 'TOURNAMENT_SCHEDULE': return isTennisPadel ? 'tennis' : 'tournament'
    case 'WEEKLY_SCHEDULE': return isTennisPadel ? 'tennis' : 'schedule'
    case 'SEASON_RECAP': return 'seasonRecap'
    case 'MATCH_ANNOUNCEMENT': return 'matchAnnouncement'
    case 'PLAYER_SPOTLIGHT': return 'playerSpotlight'
    case 'CLUB_ANNOUNCEMENT': return 'clubAnnouncement'
    case 'ENGAGEMENT_POLL': return 'engagementPoll'
    case 'CUSTOM_POST': return 'customPost'
    default: return null
  }
}

const VOICE_LABELS: Record<string, string> = { STANDARD: 'Standard', FUN: 'Fun et décontractée', SOBER: 'Sobre et factuelle' }
const MAX_TYPE_INSTRUCTIONS = 500

function EditableType({
  type, isTennisPadel, entry, onNavigateVisual, onChanged,
}: {
  type: PostType
  isTennisPadel: boolean
  entry: OverrideEntry | undefined
  onNavigateVisual: (target: VisualTarget) => void
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [voice, setVoice] = useState(entry?.voiceOverride ?? '')
  const [instructions, setInstructions] = useState(entry?.customInstructions ?? '')
  const [signature, setSignature] = useState(entry?.signaturePhrase ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setVoice(entry?.voiceOverride ?? '')
    setInstructions(entry?.customInstructions ?? '')
    setSignature(entry?.signaturePhrase ?? '')
  }, [entry])

  const hasOverride = Boolean(entry)
  const visualTarget = visualTargetFor(type, isTennisPadel)

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/clubs/personalization-overrides/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceOverride: voice || undefined, customInstructions: instructions, signaturePhrase: signature }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error ?? 'Échec de la sauvegarde'); return }
      onChanged()
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function revert() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/clubs/personalization-overrides/${type}`, { method: 'DELETE' })
      if (!res.ok) { setError('Échec de la réinitialisation'); return }
      setVoice(''); setInstructions(''); setSignature('')
      onChanged()
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-subtle/60 transition"
      >
        <div>
          <p className="font-bold text-ink">{POST_TYPES[type].label}</p>
          <p className="text-xs text-muted mt-0.5">
            {hasOverride ? 'Personnalisé pour ce type' : 'Hérite du Brand Kit général'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${hasOverride ? 'bg-brand-soft text-brand' : 'bg-subtle text-muted'}`}>
            {hasOverride ? 'Variante' : 'Hérité'}
          </span>
          <Icon name="chevron" className={`h-4 w-4 text-muted transition ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-line pt-4">
          <Field label="Voix">
            <select value={voice} onChange={e => setVoice(e.target.value)} className={INPUT}>
              <option value="">Héritée du club</option>
              {Object.entries(VOICE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </Field>
          <Field label={`Instructions spécifiques (${instructions.length}/${MAX_TYPE_INSTRUCTIONS})`}>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={3}
              maxLength={MAX_TYPE_INSTRUCTIONS}
              className={`${INPUT} resize-none`}
              placeholder="Consignes qui s'ajoutent à celles du club, uniquement pour ce type de publication"
            />
          </Field>
          <Field label="Signature spécifique">
            <input value={signature} onChange={e => setSignature(e.target.value)} maxLength={200} className={INPUT} placeholder="Héritée du club si laissé vide" />
          </Field>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-[#111827] text-white text-sm font-semibold hover:bg-[#1f2937] transition disabled:opacity-60">
              {saving ? 'Enregistrement...' : 'Enregistrer la variante'}
            </button>
            {hasOverride && (
              <button onClick={revert} disabled={saving} className="px-4 py-2 rounded-xl bg-subtle text-ink text-sm font-semibold hover:bg-line transition disabled:opacity-60">
                Revenir à l&apos;héritage
              </button>
            )}
            {visualTarget && (
              <button onClick={() => onNavigateVisual(visualTarget)} className="ml-auto px-4 py-2 rounded-xl border border-line text-sm font-semibold text-muted hover:text-ink hover:border-gray-300 transition">
                Modifier le visuel →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function IdentityTypeStyles({
  isTennisPadel, onNavigateVisual,
}: {
  isTennisPadel: boolean
  onNavigateVisual: (target: VisualTarget) => void
}) {
  const [overrides, setOverrides] = useState<OverrideEntry[] | null>(null)

  async function load() {
    const res = await fetch('/api/clubs/personalization-overrides')
    if (!res.ok) return
    const data = await res.json()
    setOverrides(data.overrides ?? [])
  }

  useEffect(() => { load() }, [])

  const types = (Object.keys(POST_TYPES) as PostType[]).filter(t => t !== 'INTERCLUB_RESULT' || isTennisPadel)
  const byType = new Map((overrides ?? []).map(o => [o.postType, o]))

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader
        icon="sliders"
        title="Styles par type de publication"
        subtitle="Chaque type hérite du Brand Kit général — personnalisez-le uniquement si besoin."
      />
      {overrides === null ? (
        <p className="text-sm text-muted">Chargement...</p>
      ) : (
        <div className="space-y-2">
          {types.map(type => (
            <EditableType
              key={type}
              type={type}
              isTennisPadel={isTennisPadel}
              entry={byType.get(type)}
              onNavigateVisual={onNavigateVisual}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
