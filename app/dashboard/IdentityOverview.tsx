'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from './ui'
import { Icon } from './icons'
import { matchingPresetLabel } from '@/lib/brandPresets'

type Club = {
  name: string
  sport: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  contentTone: string
  customInstructions?: string | null
  bannedWords?: string | null
  signaturePhrase?: string | null
}

const TONE_LABELS: Record<string, string> = { STANDARD: 'Standard', FUN: 'Fun et décontractée', SOBER: 'Sobre et factuelle' }

type Section = 'overview' | 'brand' | 'tone' | 'types' | 'references' | 'previews' | 'history'

export default function IdentityOverview({
  club, onNavigate, onOpenOnboarding,
}: {
  club: Club
  onNavigate: (section: Section) => void
  onOpenOnboarding: () => void
}) {
  const [overridesCount, setOverridesCount] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/clubs/personalization-overrides')
      .then(res => res.ok ? res.json() : null)
      .then(data => setOverridesCount(data?.overrides?.length ?? 0))
      .catch(() => setOverridesCount(0))
  }, [])

  const missing: string[] = []
  if (!club.logoUrl) missing.push('Logo')
  if (!club.customInstructions) missing.push('Consignes éditoriales')
  if (!club.signaturePhrase) missing.push('Signature')

  const presetLabel = matchingPresetLabel(club.primaryColor, club.secondaryColor)
  const completionTotal = 4
  const completionDone = [Boolean(club.logoUrl), Boolean(club.customInstructions), Boolean(club.signaturePhrase), true /* couleurs toujours définies */].filter(Boolean).length

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon="palette"
        title="Vue d'ensemble"
        subtitle="L'état actuel de l'identité de votre club."
        action={
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-muted hover:text-ink hover:bg-subtle transition"
            >
              <Icon name="sliders" className="h-4 w-4" /> Réglages avancés
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-56 rounded-xl border border-line bg-white shadow-card py-1.5 z-10">
                <button
                  onClick={() => { setMenuOpen(false); onOpenOnboarding() }}
                  className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-subtle transition"
                >
                  Relancer la personnalisation rapide
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onNavigate('references') }}
                  className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-subtle transition"
                >
                  Ajouter des références ou une charte
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onNavigate('history') }}
                  className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-subtle transition"
                >
                  Voir l&apos;historique
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onNavigate('types') }}
                  className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-subtle transition"
                >
                  Revoir les styles par type
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-ink">Niveau de configuration</p>
          <p className="text-sm font-semibold text-brand">{completionDone}/{completionTotal}</p>
        </div>
        <div className="h-2 rounded-full bg-subtle overflow-hidden">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(completionDone / completionTotal) * 100}%` }} />
        </div>
        {missing.length > 0 && (
          <p className="text-xs text-muted">Éléments manquants : {missing.join(', ')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => onNavigate('brand')} className="rounded-2xl border border-line bg-white p-5 text-left hover:border-brand/40 transition">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl border border-line flex items-center justify-center overflow-hidden" style={{ background: club.primaryColor }}>
              {club.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={club.logoUrl} alt="logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <Icon name="image" className="h-5 w-5 text-white/70" />
              )}
            </div>
            <div className="flex gap-1.5">
              <span className="w-5 h-5 rounded-full border border-line" style={{ background: club.primaryColor }} />
              <span className="w-5 h-5 rounded-full border border-line" style={{ background: club.secondaryColor }} />
            </div>
          </div>
          <p className="font-bold text-ink text-sm">Logo et couleurs</p>
          <p className="text-xs text-muted mt-0.5">{presetLabel ? `Preset : ${presetLabel}` : 'Palette personnalisée'}</p>
        </button>

        <button onClick={() => onNavigate('tone')} className="rounded-2xl border border-line bg-white p-5 text-left hover:border-brand/40 transition">
          <p className="font-bold text-ink text-sm">Ton éditorial</p>
          <p className="text-xs text-muted mt-1">Ton actif : <span className="font-semibold text-ink">{TONE_LABELS[club.contentTone] ?? club.contentTone}</span></p>
          <p className="text-xs text-muted mt-0.5">{club.bannedWords ? `${club.bannedWords.split(',').filter(Boolean).length} expression(s) à éviter` : 'Aucune expression interdite définie'}</p>
        </button>

        <button onClick={() => onNavigate('types')} className="rounded-2xl border border-line bg-white p-5 text-left hover:border-brand/40 transition">
          <p className="font-bold text-ink text-sm">Styles par type</p>
          <p className="text-xs text-muted mt-1">
            {overridesCount === null ? '...' : overridesCount === 0 ? 'Tous les types héritent du réglage général' : `${overridesCount} type(s) personnalisé(s)`}
          </p>
        </button>

        <button onClick={() => onNavigate('previews')} className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-5 text-left hover:border-brand transition">
          <p className="font-bold text-ink text-sm flex items-center gap-1.5"><Icon name="sparkles" className="h-4 w-4 text-brand" /> Tester mon identité</p>
          <p className="text-xs text-muted mt-1">Voir un aperçu de vos publications avec ce style.</p>
        </button>
      </div>
    </div>
  )
}
