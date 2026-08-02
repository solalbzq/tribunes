'use client'

import { useState } from 'react'
import ToneSelector from './ToneSelector'
import { Icon } from './icons'
import type { PostType } from '@/lib/postTypes'

const VOICE_LABELS: Record<string, string> = { FUN: 'Fun', SOBER: 'Sobre' }

/**
 * "Personnaliser ce post" — retouche ponctuelle (ton + consignes libres)
 * pour une seule génération, sans toucher aux réglages par défaut du club
 * (Personnalisation). La logique de régénération (appel API, remplacement
 * des posts existants) reste dans chaque tab appelant, propre à sa route.
 *
 * `postType`, s'il est fourni, active "Enregistrer ces réglages pour ce
 * type" — persiste l'override ponctuel comme variante durable pour ce type
 * de publication (lib/services/personalizationOverride.ts, Lot 3), avec un
 * récapitulatif exact avant confirmation.
 */
export default function PersonalizePostPanel({
  onRegenerate,
  regenerating = false,
  postType,
}: {
  onRegenerate: (overrides: { tone?: string; customInstructions?: string }) => Promise<void>
  regenerating?: boolean
  postType?: PostType
}) {
  const [open, setOpen] = useState(false)
  const [tone, setTone] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [confirmingSave, setConfirmingSave] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-btn border border-dashed border-line py-2.5 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand"
      >
        <Icon name="sliders" className="h-4 w-4" />
        Personnaliser ce post
      </button>
    )
  }

  async function saveAsTypeOverride() {
    if (!postType) return
    setSaving(true); setSaveError(null)
    try {
      const res = await fetch(`/api/clubs/personalization-overrides/${postType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceOverride: tone || undefined, customInstructions }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setSaveError(data?.error ?? "Échec de l'enregistrement"); return }
      setConfirmingSave(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const hasSettingsToSave = Boolean(tone || customInstructions.trim())

  return (
    <div className="rounded-card border border-line bg-subtle/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink">Personnaliser ce post</p>
        <button onClick={() => setOpen(false)} className="text-xs font-semibold text-muted hover:text-ink transition">
          Fermer
        </button>
      </div>
      <p className="text-xs text-muted">S&apos;applique uniquement à cette publication, sans changer vos réglages par défaut.</p>

      <ToneSelector value={tone} onChange={setTone} />

      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-1">Consignes spécifiques (optionnel)</label>
        <textarea
          value={customInstructions}
          onChange={e => setCustomInstructions(e.target.value)}
          rows={3}
          maxLength={300}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
          placeholder="Ex: mentionne le nom du sponsor du match, reste très court..."
        />
        <p className="mt-1 text-right text-xs text-gray-400">{customInstructions.length}/300</p>
      </div>

      <button
        onClick={() => onRegenerate({ tone: tone || undefined, customInstructions: customInstructions || undefined })}
        disabled={regenerating}
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#111827] text-white text-sm font-semibold hover:bg-[#1f2937] transition disabled:opacity-60"
      >
        {regenerating
          ? <><Icon name="refresh" className="h-4 w-4 animate-spin" /> Régénération…</>
          : <><Icon name="sparkles" className="h-4 w-4" /> Régénérer avec ces réglages</>}
      </button>

      {postType && hasSettingsToSave && !saved && (
        confirmingSave ? (
          <div className="rounded-xl border border-brand/30 bg-brand-soft/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-ink">Ces réglages deviendront permanents pour ce type de publication :</p>
            <ul className="text-xs text-ink space-y-0.5">
              {tone && <li>• Voix : {VOICE_LABELS[tone] ?? tone}</li>}
              {customInstructions.trim() && <li>• Consignes : {customInstructions.trim()}</li>}
            </ul>
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            <div className="flex gap-2">
              <button onClick={saveAsTypeOverride} disabled={saving} className="px-3 py-1.5 rounded-lg bg-[#111827] text-white text-xs font-semibold hover:bg-[#1f2937] transition disabled:opacity-60">
                {saving ? 'Enregistrement...' : 'Confirmer'}
              </button>
              <button onClick={() => setConfirmingSave(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-ink transition">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingSave(true)} className="w-full text-xs font-semibold text-brand hover:underline">
            Enregistrer ces réglages pour ce type
          </button>
        )
      )}
      {saved && <p className="text-xs text-green-600 text-center">✓ Enregistré pour ce type de publication</p>}
    </div>
  )
}
