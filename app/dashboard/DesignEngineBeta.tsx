'use client'

import { useState } from 'react'

type Club = {
  id: string
  name: string
  sport: string
  contentTone: string
  visualEngine?: string
  designFamily?: string | null
}

const FAMILIES: { key: string; label: string; description: string }[] = [
  { key: 'minimal', label: 'Minimal', description: 'Beaucoup de respiration, composition centrée, sobre.' },
  { key: 'editorial', label: 'Editorial', description: 'Bloc d’accent façon manchette de presse.' },
  { key: 'bold', label: 'Bold', description: 'Couleur de marque en plein cadre, score démesuré.' },
  { key: 'premium', label: 'Premium', description: 'Fond profond, cadre fin, registre haut de gamme.' },
  { key: 'dynamic', label: 'Dynamic', description: 'Diagonale de couleur, énergie, léger tilt.' },
]

/** Suggestion sans appel IA — heuristique simple à partir du ton déjà choisi par le club. */
function suggestedFamily(contentTone: string): string {
  if (contentTone === 'FUN') return 'dynamic'
  if (contentTone === 'SOBER') return 'premium'
  return 'minimal'
}

/**
 * Section bêta du Design Engine (cf. docs/design-engine-plan.md) — totalement opt-in,
 * n'affecte aucun club qui ne l'active pas explicitement ("legacy" reste le défaut).
 */
export default function DesignEngineBeta({ club }: { club: Club }) {
  const [enabled, setEnabled] = useState(club.visualEngine === 'design-v1')
  const [family, setFamily] = useState(club.designFamily ?? suggestedFamily(club.contentTone))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(nextEnabled: boolean, nextFamily: string) {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: club.name,
          sport: club.sport,
          visualEngine: nextEnabled ? 'design-v1' : 'legacy',
          designFamily: nextFamily,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Échec de la sauvegarde')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function toggle() {
    const next = !enabled
    setEnabled(next)
    save(next, family)
  }

  function choose(key: string) {
    setFamily(key)
    if (enabled) save(enabled, key)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-ink flex items-center gap-2">
              Nouveau moteur de visuels
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Bêta</span>
            </p>
            <p className="text-sm text-muted mt-1 max-w-xl">
              Remplace le visuel généré pour les résultats de match par une composition rendue
              côté serveur — plus de variation, moins de sensation de gabarit répété. Le reste
              de vos publications continue de fonctionner à l&apos;identique.
            </p>
          </div>
          <button
            onClick={toggle}
            disabled={saving}
            role="switch"
            aria-checked={enabled}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? 'bg-brand' : 'bg-line'} disabled:opacity-60`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${enabled ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        {saved && <p className="mt-3 text-xs font-semibold text-emerald-600">✓ Enregistré</p>}
      </div>

      {enabled && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Famille de direction artistique</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {FAMILIES.map(f => (
              <button
                key={f.key}
                onClick={() => choose(f.key)}
                disabled={saving}
                className={`rounded-2xl border-2 p-3 text-left transition disabled:opacity-60 ${
                  family === f.key ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-gray-300'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/design-lab/render?matchId=latest&family=${f.key}&seed=0`}
                  alt={f.label}
                  className="w-full rounded-lg border border-line bg-subtle aspect-[4/5] object-cover"
                  loading="lazy"
                />
                <p className="mt-2 text-sm font-bold text-ink">{f.label}</p>
                <p className="text-[11px] text-muted leading-snug">{f.description}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Aperçus générés à partir de votre dernier match enregistré, votre logo et vos couleurs actuelles.
            Si aucun match n&apos;existe encore, générez-en un pour voir l&apos;aperçu.
          </p>
        </div>
      )}
    </div>
  )
}
