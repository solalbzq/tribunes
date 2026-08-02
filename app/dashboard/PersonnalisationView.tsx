'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import VisualEditor from './VisualEditor'
import TennisVisualEditor from './TennisVisualEditor'
import PostVisualEditor from './PostVisualEditor'
import IdentityOverview from './IdentityOverview'
import IdentityTypeStyles, { type VisualTarget } from './IdentityTypeStyles'
import IdentityHistory from './IdentityHistory'
import IdentityReferences from './IdentityReferences'
import IdentityPreviews from './IdentityPreviews'
import OnboardingWizard from './OnboardingWizard'
import type { VisualConfig, VisualFormat, PostVisualConfig, PostVisualKind } from '@/lib/visualLayout'
import { parsePostVisualConfig } from '@/lib/visualLayout'
import type { TennisVisualConfig } from './posts/TennisVisualGenerator'
import { getStoredVisualConfig, pruneProfile, type StoredVisualConfig } from '@/lib/clubProfile'
import { detectDominantColors, contrastRatio } from '@/lib/colorDetection'
import { BRAND_COLOR_PRESETS } from '@/lib/brandPresets'
import { PageHeader, Segmented, Field, INPUT } from './ui'
import { Icon } from './icons'
import { LogoMark } from '@/components/Logo'

type Club = {
  id: string
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  visualConfig: unknown
  tennisVisualConfig?: unknown
  postVisualConfigs?: unknown
  plan: 'FREE' | 'CLUB' | 'PRO'
  contentTone: string
  customInstructions?: string | null
  signaturePhrase?: string | null
  bannedWords?: string | null
}

type Section = 'overview' | 'brand' | 'tone' | 'types' | 'references' | 'previews' | 'history'

const POST_VISUAL_TYPES: { key: PostVisualKind; label: string }[] = [
  { key: 'tournament', label: 'Tournoi' },
  { key: 'schedule', label: 'Programme' },
  { key: 'seasonRecap', label: 'Bilan de saison' },
  { key: 'matchAnnouncement', label: 'Avant-match' },
  { key: 'playerSpotlight', label: "Joueur à l'honneur" },
  { key: 'clubAnnouncement', label: 'Annonce du club' },
  { key: 'engagementPoll', label: 'Sondage' },
  { key: 'customPost', label: 'Publication libre' },
]

const MIN_CONTRAST = 2.2

export default function PersonnalisationView({ club }: { club: Club }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const isTennisPadel = club.sport === 'Tennis' || club.sport === 'Padel'
  const isPremium = club.plan !== 'FREE'

  const [section, setSection] = useState<Section>('overview')
  const [visualTarget, setVisualTarget] = useState<VisualTarget | null>(null)

  const [primary, setPrimary] = useState(club.primaryColor)
  const [secondary, setSecondary] = useState(club.secondaryColor)
  const [logoUrl, setLogoUrl] = useState<string | null>(club.logoUrl)
  const [logoPreview, setLogoPreview] = useState<string | null>(club.logoUrl)
  const [contentTone, setContentTone] = useState(club.contentTone)
  const [customInstructions, setCustomInstructions] = useState(club.customInstructions ?? '')
  const [signaturePhrase, setSignaturePhrase] = useState(club.signaturePhrase ?? '')
  const [bannedWords, setBannedWords] = useState(club.bannedWords ?? '')
  const [uploading, setUploading] = useState(false)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [savedIdentity, setSavedIdentity] = useState(false)
  const [identityError, setIdentityError] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [showWizardBanner, setShowWizardBanner] = useState(false)

  const isUnconfigured = !club.logoUrl && !club.customInstructions

  useEffect(() => {
    if (!isUnconfigured) return
    try {
      if (window.localStorage.getItem(`onboarding_done_${club.id}`) || window.localStorage.getItem(`onboarding_dismissed_${club.id}`)) return
    } catch {}
    setShowWizardBanner(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismissWizardBanner() {
    setShowWizardBanner(false)
    try { window.localStorage.setItem(`onboarding_dismissed_${club.id}`, '1') } catch {}
  }

  const currentClub: Club = { ...club, logoUrl, primaryColor: primary, secondaryColor: secondary, contentTone, customInstructions, signaturePhrase, bannedWords }

  function buildVisualConfigPayload(format?: VisualFormat, cfg?: VisualConfig): StoredVisualConfig {
    const stored = getStoredVisualConfig(club.visualConfig)
    return {
      post: format === 'post' && cfg ? cfg : stored.post,
      story: format === 'story' && cfg ? cfg : stored.story,
      clubProfile: pruneProfile(stored.clubProfile ?? {}),
    }
  }

  async function saveClubBase(extra: {
    visualConfig?: StoredVisualConfig
    tennisVisualConfig?: TennisVisualConfig
    postVisualConfigs?: Record<string, unknown>
  } = {}): Promise<{ ok: true } | { ok: false; error: string }> {
    const res = await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: club.name,
        sport: club.sport,
        primaryColor: primary,
        secondaryColor: secondary,
        contentTone,
        customInstructions,
        signaturePhrase,
        bannedWords,
        ...(extra.visualConfig !== undefined ? { visualConfig: extra.visualConfig } : {}),
        ...(extra.tennisVisualConfig !== undefined ? { tennisVisualConfig: extra.tennisVisualConfig } : {}),
        ...(extra.postVisualConfigs !== undefined ? { postVisualConfigs: extra.postVisualConfigs } : {}),
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      return { ok: false, error: data?.error ?? 'Échec de la sauvegarde' }
    }
    router.refresh()
    return { ok: true }
  }

  async function handleSavePostVisual(kind: PostVisualKind, format: VisualFormat, cfg: PostVisualConfig) {
    const current = (club.postVisualConfigs && typeof club.postVisualConfigs === 'object' ? club.postVisualConfigs : {}) as Record<string, unknown>
    const otherFormat: VisualFormat = format === 'post' ? 'story' : 'post'
    const existingOther = parsePostVisualConfig(club.postVisualConfigs, kind, otherFormat)
    await saveClubBase({
      postVisualConfigs: {
        ...current,
        [kind]: { post: format === 'post' ? cfg : existingOther, story: format === 'story' ? cfg : existingOther },
      },
    })
  }

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)
    setDetectError(null)
    const blobUrl = URL.createObjectURL(file)
    setLogoPreview(blobUrl)
    setUploading(true)
    const fd = new FormData()
    fd.append('logo', file)
    const res = await fetch('/api/clubs/logo', { method: 'POST', body: fd })
    const data = await res.json().catch(() => null)
    if (res.ok) {
      setLogoUrl(data?.logoUrl ?? null)
    } else {
      setLogoPreview(club.logoUrl)
      setLogoError(data?.error ?? 'Échec de l’envoi du logo')
    }
    setUploading(false)
    router.refresh()

    // Détection déterministe depuis le blob local (même origine, jamais bloquée
    // par le CORS contrairement à une relecture depuis l'URL de stockage distante).
    if (res.ok) {
      setDetecting(true)
      const detected = await detectDominantColors(blobUrl)
      setDetecting(false)
      if (detected) {
        setPrimary(detected.primary)
        setSecondary(detected.secondary)
      } else {
        setDetectError('Détection automatique indisponible pour cette image — ajustez les couleurs manuellement ci-dessous.')
      }
    }
  }

  async function handleSaveIdentity() {
    setSavingIdentity(true)
    setIdentityError(null)
    const result = await saveClubBase({ visualConfig: buildVisualConfigPayload() })
    setSavingIdentity(false)
    if (!result.ok) {
      setIdentityError(result.error)
      return
    }
    setSavedIdentity(true)
    setTimeout(() => setSavedIdentity(false), 2000)
    // Une sauvegarde manuelle (sans passer par le wizard) est aussi une
    // configuration délibérée — pas besoin de continuer à suggérer l'onboarding.
    dismissWizardBanner()
  }

  async function handleSaveLayout(format: VisualFormat, cfg: VisualConfig) {
    await saveClubBase({ visualConfig: buildVisualConfigPayload(format, cfg) })
  }

  async function handleSaveTennisConfig(cfg: TennisVisualConfig) {
    await saveClubBase({ visualConfig: buildVisualConfigPayload(), tennisVisualConfig: cfg })
  }

  const contrast = contrastRatio(primary, secondary)

  if (visualTarget) {
    return (
      <div className="max-w-7xl space-y-6">
        <button
          onClick={() => setVisualTarget(null)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition"
        >
          <Icon name="arrowLeft" className="h-4 w-4" /> Retour aux styles par type
        </button>

        {visualTarget === 'result' && (
          <VisualEditor
            club={{ ...currentClub, visualConfig: buildVisualConfigPayload() }}
            isPremium={isPremium}
            onSave={handleSaveLayout}
          />
        )}
        {visualTarget === 'tennis' && (
          <TennisVisualEditor
            club={{ name: club.name, sport: club.sport, primaryColor: primary, secondaryColor: secondary, logoUrl: logoPreview }}
            initialConfig={club.tennisVisualConfig as TennisVisualConfig | null | undefined}
            onSave={handleSaveTennisConfig}
          />
        )}
        {POST_VISUAL_TYPES.some(t => t.key === visualTarget) && (
          <PostVisualEditor
            kind={visualTarget as PostVisualKind}
            club={{ id: club.id, name: club.name, sport: club.sport, primaryColor: primary, secondaryColor: secondary, logoUrl: logoPreview }}
            savedConfig={club.postVisualConfigs}
            isPremium={isPremium}
            onSave={handleSavePostVisual}
          />
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl space-y-6">
      {showWizard && (
        <OnboardingWizard
          club={currentClub}
          onClose={() => setShowWizard(false)}
          onActivated={() => setShowWizardBanner(false)}
        />
      )}

      {showWizardBanner && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-brand-soft/40 px-5 py-4">
          <div>
            <p className="font-bold text-ink text-sm">Configurez l&apos;identité de votre club en 5 minutes</p>
            <p className="text-xs text-muted mt-0.5">Logo, couleurs, ton — pour que chaque publication ressemble vraiment à votre club.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={dismissWizardBanner} className="text-xs font-semibold text-muted hover:text-ink transition">Plus tard</button>
            <button onClick={() => setShowWizard(true)} className="px-4 py-2 rounded-xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4fd8] transition">
              Commencer
            </button>
          </div>
        </div>
      )}

      <PageHeader
        icon="sliders"
        title="Identité du club"
        subtitle="Configurez une fois votre identité — elle s'applique automatiquement à toutes vos publications."
      />

      <Segmented
        value={section}
        onChange={setSection}
        items={[
          { key: 'overview', label: "Vue d'ensemble", icon: 'palette' },
          { key: 'brand', label: 'Logo et couleurs', icon: 'image' },
          { key: 'tone', label: 'Ton et vocabulaire', icon: 'sparkles' },
          { key: 'types', label: 'Styles par type', icon: 'sliders' },
          { key: 'references', label: 'Références', icon: 'sparkles' },
          { key: 'previews', label: 'Aperçus', icon: 'target' },
          { key: 'history', label: 'Historique', icon: 'clock' },
        ]}
      />

      {section === 'overview' && (
        <IdentityOverview club={currentClub} onNavigate={setSection} onOpenOnboarding={() => setShowWizard(true)} />
      )}

      {section === 'brand' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Direction artistique</p>
                <h3 className="text-xl font-extrabold text-[#111827] mt-2">Logo et couleurs</h3>
                <p className="text-sm text-gray-500 mt-1">Servent de base à tous les visuels générés.</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5">
                <h4 className="font-bold text-[#111827] mb-4">Logo du club</h4>
                <div className="flex items-center gap-4">
                  <div
                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#2563eb] transition"
                    onClick={() => fileRef.current?.click()}
                  >
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Icon name="image" className="h-7 w-7 text-muted" />
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="block text-sm font-semibold text-[#2563eb] hover:underline disabled:opacity-50"
                    >
                      {uploading ? 'Upload en cours...' : 'Choisir un logo'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WEBP - max 5 Mo</p>
                    {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
                    {logoUrl && !uploading && !logoError && <p className="text-xs text-[#22c55e] mt-1">✓ Logo sauvegarde</p>}
                    {detecting && <p className="text-xs text-muted mt-1">Détection des couleurs...</p>}
                    {detectError && <p className="text-xs text-amber-600 mt-1">{detectError}</p>}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-5">
                <h4 className="font-bold text-[#111827]">Palette visuelle</h4>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Palettes predefinies</p>
                  <div className="grid grid-cols-3 gap-2">
                    {BRAND_COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => { setPrimary(preset.primary); setSecondary(preset.secondary) }}
                        className={`rounded-xl overflow-hidden border-2 transition ${
                          primary === preset.primary && secondary === preset.secondary
                            ? 'border-[#2563eb]'
                            : 'border-transparent hover:border-gray-200'
                        }`}
                        title={preset.label}
                      >
                        <div className="h-6" style={{ background: preset.primary }} />
                        <div className="h-3" style={{ background: preset.secondary }} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Couleur principale">
                    <div className="flex items-center gap-2">
                      <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                      <input type="text" value={primary} onChange={e => setPrimary(e.target.value)} className={`${INPUT} font-mono`} maxLength={7} />
                    </div>
                  </Field>
                  <Field label="Couleur d'accentuation">
                    <div className="flex items-center gap-2">
                      <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                      <input type="text" value={secondary} onChange={e => setSecondary(e.target.value)} className={`${INPUT} font-mono`} maxLength={7} />
                    </div>
                  </Field>
                </div>
                {contrast < MIN_CONTRAST && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    ⚠ Ces deux couleurs sont assez proches — le texte ou les badges pourraient manquer de lisibilité sur vos visuels.
                  </p>
                )}
              </div>

              {identityError && <p className="text-xs text-red-500">{identityError}</p>}
              <button
                onClick={handleSaveIdentity}
                disabled={savingIdentity}
                className={`w-full py-3 rounded-xl font-bold text-sm transition ${savedIdentity ? 'bg-[#22c55e] text-white' : 'bg-[#111827] text-white hover:bg-[#1f2937]'} disabled:opacity-60`}
              >
                {savedIdentity ? '✓ Personnalisation sauvegardee' : savingIdentity ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          <BrandPreview club={club} primary={primary} secondary={secondary} logoPreview={logoPreview} />
        </div>
      )}

      {section === 'tone' && (
        <div className="max-w-2xl bg-white rounded-card border border-line shadow-card p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Identité éditoriale</p>
            <h3 className="text-xl font-extrabold text-[#111827] mt-2">Ton et vocabulaire</h3>
            <p className="text-sm text-gray-500 mt-1">S&apos;appliquent à toutes les légendes générées, quel que soit le type de post.</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-[#111827]">Ton par défaut</h4>
            <p className="text-sm text-gray-500">Modifiable ponctuellement pour un post donné depuis l&apos;écran de génération.</p>
            <select value={contentTone} onChange={e => setContentTone(e.target.value)} className={INPUT}>
              <option value="STANDARD">Standard</option>
              <option value="FUN">Fun et décontractée</option>
              <option value="SOBER">Sobre et factuelle</option>
            </select>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="font-bold text-[#111827]">Consignes et vocabulaire</h4>
            </div>
            <Field label="Consignes personnalisées (optionnel)">
              <textarea
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                rows={3}
                maxLength={1000}
                className={`${INPUT} resize-none`}
                placeholder="Ex: n'utilise jamais d'emoji, mentionne toujours notre sponsor principal..."
              />
              <p className="mt-1 text-right text-xs text-gray-400">{customInstructions.length}/1000</p>
            </Field>
            <Field label="Mots à éviter (optionnel)">
              <input
                type="text"
                value={bannedWords}
                onChange={e => setBannedWords(e.target.value)}
                className={INPUT}
                placeholder="Ex: déception, échec, faible affluence"
              />
              <p className="mt-1 text-xs text-gray-400">Séparez par des virgules — 30 expressions maximum, 50 caractères chacune.</p>
            </Field>
            <Field label="Phrase de signature (optionnel)">
              <input
                type="text"
                value={signaturePhrase}
                onChange={e => setSignaturePhrase(e.target.value)}
                maxLength={200}
                className={INPUT}
                placeholder="Ex: Allez les Rouge et Blanc !"
              />
            </Field>
          </div>

          {identityError && <p className="text-xs text-red-500">{identityError}</p>}
          <button
            onClick={handleSaveIdentity}
            disabled={savingIdentity}
            className={`w-full py-3 rounded-xl font-bold text-sm transition ${savedIdentity ? 'bg-[#22c55e] text-white' : 'bg-[#111827] text-white hover:bg-[#1f2937]'} disabled:opacity-60`}
          >
            {savedIdentity ? '✓ Personnalisation sauvegardee' : savingIdentity ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      )}

      {section === 'types' && (
        <IdentityTypeStyles isTennisPadel={isTennisPadel} onNavigateVisual={setVisualTarget} />
      )}

      {section === 'references' && (
        <IdentityReferences onApplied={() => router.refresh()} />
      )}

      {section === 'previews' && (
        <IdentityPreviews club={currentClub} onNavigate={setSection} />
      )}

      {section === 'history' && (
        <IdentityHistory onRestored={() => router.refresh()} />
      )}
    </div>
  )
}

function BrandPreview({
  club, primary, secondary, logoPreview,
}: {
  club: { name: string; sport: string }
  primary: string
  secondary: string
  logoPreview: string | null
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl overflow-hidden shadow-lg" style={{ background: primary }}>
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: secondary, opacity: 0.8 }}>{club.sport}</p>
            <p className="text-xl font-extrabold mt-0.5" style={{ color: textColor(primary) }}>{club.name}</p>
          </div>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: `${secondary}22`, border: `2px solid ${secondary}44` }}>
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
            ) : (
              <LogoMark size={22} />
            )}
          </div>
        </div>

        <div className="mx-4 mb-4 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold text-center mb-2" style={{ color: secondary }}>RESULTAT DU MATCH</p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-xs opacity-60" style={{ color: textColor(primary) }}>Nous</p>
              <p className="text-4xl font-black" style={{ color: textColor(primary) }}>3</p>
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: secondary, color: textColor(secondary) }}>VICTOIRE</div>
            <div className="text-center">
              <p className="text-xs opacity-60" style={{ color: textColor(primary) }}>Eux</p>
              <p className="text-4xl font-black" style={{ color: textColor(primary) }}>1</p>
            </div>
          </div>
          <p className="text-xs text-center mt-2 opacity-50" style={{ color: textColor(primary) }}>vs Adversaire · Championnat</p>
        </div>

        <div className="px-6 py-3 flex items-center justify-between" style={{ background: secondary, color: textColor(secondary) }}>
          <p className="text-xs font-bold">tribunes.app</p>
          <p className="text-xs opacity-70">#{club.name.toLowerCase().replace(/\s/g, '')} #{club.sport.toLowerCase()}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">Aperçu déterministe — pas d&apos;appel IA. Les vrais visuels utilisent cette même base graphique.</p>
    </div>
  )
}

function textColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff'
}
