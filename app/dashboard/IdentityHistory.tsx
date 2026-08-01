'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from './ui'
import { Icon } from './icons'

type Snapshot = {
  contentTone?: string
  customInstructions?: string | null
  signaturePhrase?: string | null
  bannedWords?: string | null
  primaryColor?: string
  secondaryColor?: string
  logoUrl?: string | null
}

type HistoryEntry = {
  id: string
  userId: string | null
  snapshot: Snapshot
  createdAt: string
}

const FIELD_LABELS: Record<keyof Snapshot, string> = {
  contentTone: 'Ton', customInstructions: 'Consignes', signaturePhrase: 'Signature',
  bannedWords: 'Mots à éviter', primaryColor: 'Couleur principale', secondaryColor: 'Couleur secondaire', logoUrl: 'Logo',
}

/** Résumé des champs qui ont changé entre deux snapshots consécutifs — comparaison superficielle, suffisante pour un aperçu. */
function diffSummary(current: Snapshot, previous: Snapshot | undefined): string {
  if (!previous) return 'Première version enregistrée'
  const changed = (Object.keys(FIELD_LABELS) as (keyof Snapshot)[]).filter(k => current[k] !== previous[k])
  if (changed.length === 0) return 'Aucun changement détecté'
  return changed.map(k => FIELD_LABELS[k]).join(', ') + ' modifié' + (changed.length > 1 ? 's' : '')
}

export default function IdentityHistory({ onRestored }: { onRestored: () => void }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/clubs/personalization-history')
    if (!res.ok) return
    const data = await res.json()
    setEntries(data.history ?? [])
  }

  useEffect(() => { load() }, [])

  async function restore(id: string) {
    setRestoringId(id); setError(null)
    try {
      const res = await fetch(`/api/clubs/personalization-history/${id}/restore`, { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error ?? 'Échec de la restauration'); return }
      setConfirmId(null)
      await load()
      onRestored()
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader icon="clock" title="Historique" subtitle="Les 20 dernières versions de votre identité générale." />

      {error && <p className="text-xs text-red-500">{error}</p>}

      {entries === null ? (
        <p className="text-sm text-muted">Chargement...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">Aucune modification enregistrée pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isCurrent = i === 0
            const previous = entries[i + 1]
            return (
              <div key={entry.id} className="rounded-2xl border border-line bg-white px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink text-sm">
                      {new Date(entry.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {isCurrent && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-brand">Actuelle</span>}
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate">{diffSummary(entry.snapshot, previous?.snapshot)}</p>
                </div>
                {!isCurrent && (
                  confirmId === entry.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted">Restaurer cette version ?</span>
                      <button
                        onClick={() => restore(entry.id)}
                        disabled={restoringId === entry.id}
                        className="px-3 py-1.5 rounded-lg bg-[#111827] text-white text-xs font-semibold hover:bg-[#1f2937] transition disabled:opacity-60"
                      >
                        {restoringId === entry.id ? 'Restauration...' : 'Confirmer'}
                      </button>
                      <button onClick={() => setConfirmId(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-ink transition">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(entry.id)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-muted hover:text-ink hover:border-gray-300 transition"
                    >
                      <Icon name="refresh" className="h-3.5 w-3.5" /> Restaurer
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
