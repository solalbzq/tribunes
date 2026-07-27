'use client'

import { useState } from 'react'
import ToneSelector from './ToneSelector'
import { Icon } from './icons'

/**
 * "Personnaliser ce post" — retouche ponctuelle (ton + consignes libres)
 * pour une seule génération, sans toucher aux réglages par défaut du club
 * (Personnalisation). La logique de régénération (appel API, remplacement
 * des posts existants) reste dans chaque tab appelant, propre à sa route.
 */
export default function PersonalizePostPanel({
  onRegenerate,
  regenerating = false,
}: {
  onRegenerate: (overrides: { tone?: string; customInstructions?: string }) => Promise<void>
  regenerating?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [tone, setTone] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')

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
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
          placeholder="Ex: mentionne le nom du sponsor du match, reste très court..."
        />
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
    </div>
  )
}
