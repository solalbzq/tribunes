'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import VisualEditor from './VisualEditor'
import TennisVisualEditor from './TennisVisualEditor'
import PostVisualEditor from './PostVisualEditor'
import type { VisualConfig, PostVisualConfig, PostVisualKind } from '@/lib/visualLayout'
import type { TennisVisualConfig } from './posts/TennisVisualGenerator'
import { getStoredVisualConfig, pruneProfile, type StoredVisualConfig } from '@/lib/clubProfile'
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
  contentTone: string
  customInstructions?: string | null
  signaturePhrase?: string | null
  bannedWords?: string | null
}

const POST_VISUAL_TYPES: { key: PostVisualKind; label: string }[] = [
  { key: 'tournament', label: 'Tournoi' },
  { key: 'schedule', label: 'Programme' },
  { key: 'seasonRecap', label: 'Bilan de saison' },
  { key: 'matchAnnouncement', label: 'Avant-match' },
  { key: 'playerSpotlight', label: "Joueur à l'honneur" },
  { key: 'clubAnnouncement', label: 'Annonce du club' },
  { key: 'engagementPoll', label: 'Sondage' },
]

const PRESETS = [
  { label: 'Bleu nuit / Rouge', primary: '#111827', secondary: '#2563eb' },
  { label: 'Marine / Or', primary: '#0a1628', secondary: '#f5a623' },
  { label: 'Vert foret / Blanc', primary: '#1a3d2b', secondary: '#ffffff' },
  { label: 'Bordeaux / Beige', primary: '#6b1a2a', secondary: '#f5e6d3' },
  { label: 'Noir / Cyan', primary: '#0d0d0d', secondary: '#00d4ff' },
  { label: 'Violet / Lime', primary: '#2d1b69', secondary: '#a8ff3e' },
]

export default function PersonnalisationView({ club }: { club: Club }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const isTennisPadel = club.sport === 'Tennis' || club.sport === 'Padel'

  const [artTab, setArtTab] = useState<'identity' | 'result' | 'tennis' | PostVisualKind>('identity')
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

  function buildVisualConfigPayload(cfg?: VisualConfig): StoredVisualConfig {
    const stored = getStoredVisualConfig(club.visualConfig)
    const base = cfg ?? { bgOpacity: stored.bgOpacity, elements: stored.elements }
    return {
      ...base,
      clubProfile: pruneProfile(stored.clubProfile ?? {}),
    }
  }

  async function saveClubBase(extra: {
    visualConfig?: StoredVisualConfig
    tennisVisualConfig?: TennisVisualConfig
    postVisualConfigs?: Record<string, PostVisualConfig>
  } = {}) {
    await fetch('/api/clubs', {
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
    router.refresh()
  }

  async function handleSavePostVisual(kind: PostVisualKind, cfg: PostVisualConfig) {
    const current = (club.postVisualConfigs && typeof club.postVisualConfigs === 'object' ? club.postVisualConfigs : {}) as Record<string, PostVisualConfig>
    await saveClubBase({ postVisualConfigs: { ...current, [kind]: cfg } })
  }

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    setUploading(true)
    const fd = new FormData()
    fd.append('logo', file)
    const res = await fetch('/api/clubs/logo', { method: 'POST', body: fd })
    if (res.ok) {
      const data = await res.json()
      setLogoUrl(data.logoUrl)
    }
    setUploading(false)
    router.refresh()
  }

  async function handleSaveIdentity() {
    setSavingIdentity(true)
    await saveClubBase({ visualConfig: buildVisualConfigPayload() })
    setSavingIdentity(false)
    setSavedIdentity(true)
    setTimeout(() => setSavedIdentity(false), 2000)
  }

  async function handleSaveLayout(cfg: VisualConfig) {
    await saveClubBase({ visualConfig: buildVisualConfigPayload(cfg) })
  }

  async function handleSaveTennisConfig(cfg: TennisVisualConfig) {
    await saveClubBase({ visualConfig: buildVisualConfigPayload(), tennisVisualConfig: cfg })
  }

  return (
    <div className="max-w-7xl space-y-6">
      <PageHeader
        icon="sliders"
        title="Personnalisation"
        subtitle="L'identité visuelle et les réglages qui s'appliquent à tous vos posts."
      />

      <Segmented
        value={artTab}
        onChange={setArtTab}
        items={[
          { key: 'identity', label: 'Identité visuelle', icon: 'palette' },
          { key: 'result', label: 'Visuel résultat', icon: 'image' },
          ...(isTennisPadel ? [{ key: 'tennis' as const, label: `Visuels ${club.sport}`, icon: 'trophy' as const }] : []),
          ...POST_VISUAL_TYPES.map(t => ({ key: t.key, label: t.label, icon: 'image' as const })),
        ]}
      />

      {artTab === 'identity' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Direction artistique</p>
                <h3 className="text-xl font-extrabold text-[#111827] mt-2">Logo, couleurs et ambiance</h3>
                <p className="text-sm text-gray-500 mt-1">Configure les grands marqueurs visuels du club. Ils serviront dans tous les visuels générés.</p>
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
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG - max 2 Mo</p>
                    {logoUrl && !uploading && <p className="text-xs text-[#22c55e] mt-1">✓ Logo sauvegarde</p>}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-5">
                <h4 className="font-bold text-[#111827]">Palette visuelle</h4>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Palettes predefinies</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map(preset => (
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
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-[#111827]">Personnalité des posts</h4>
                <p className="text-sm text-gray-500">Le ton par défaut de vos légendes IA — modifiable ponctuellement pour un post donné depuis l&apos;écran de génération.</p>
                <select value={contentTone} onChange={e => setContentTone(e.target.value)} className={INPUT}>
                  <option value="STANDARD">Standard</option>
                  <option value="FUN">Fun et décontractée</option>
                  <option value="SOBER">Sobre et factuelle</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-[#111827]">Consignes IA</h4>
                  <p className="text-sm text-gray-500">Appliquées à toutes les légendes générées, quel que soit le type de post.</p>
                </div>
                <Field label="Consignes personnalisées (optionnel)">
                  <textarea
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    rows={3}
                    className={`${INPUT} resize-none`}
                    placeholder="Ex: n'utilise jamais d'emoji, mentionne toujours notre sponsor principal..."
                  />
                </Field>
                <Field label="Mots à éviter (optionnel)">
                  <input
                    type="text"
                    value={bannedWords}
                    onChange={e => setBannedWords(e.target.value)}
                    className={INPUT}
                    placeholder="Ex: déception, échec, faible affluence"
                  />
                </Field>
                <Field label="Phrase de signature (optionnel)">
                  <input
                    type="text"
                    value={signaturePhrase}
                    onChange={e => setSignaturePhrase(e.target.value)}
                    className={INPUT}
                    placeholder="Ex: Allez les Rouge et Blanc !"
                  />
                </Field>
              </div>

              <button
                onClick={handleSaveIdentity}
                disabled={savingIdentity}
                className={`w-full py-3 rounded-xl font-bold text-sm transition ${savedIdentity ? 'bg-[#22c55e] text-white' : 'bg-[#111827] text-white hover:bg-[#1f2937]'} disabled:opacity-60`}
              >
                {savedIdentity ? '✓ Personnalisation sauvegardee' : savingIdentity ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Apercu live de ta DA</p>
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
            <p className="text-xs text-gray-400 text-center">Les visuels utiliseront cette base graphique pour les resultats, annonces et futurs templates.</p>
          </div>
        </div>
      )}

      {artTab === 'result' && (
        <VisualEditor
          club={{
            ...club,
            primaryColor: primary,
            secondaryColor: secondary,
            logoUrl: logoPreview,
            visualConfig: buildVisualConfigPayload(),
          }}
          onSave={handleSaveLayout}
        />
      )}

      {artTab === 'tennis' && isTennisPadel && (
        <TennisVisualEditor
          club={{ name: club.name, sport: club.sport, primaryColor: primary, secondaryColor: secondary, logoUrl: logoPreview }}
          initialConfig={club.tennisVisualConfig as TennisVisualConfig | null | undefined}
          onSave={handleSaveTennisConfig}
        />
      )}

      {POST_VISUAL_TYPES.some(t => t.key === artTab) && (
        <PostVisualEditor
          kind={artTab as PostVisualKind}
          club={{ name: club.name, sport: club.sport, primaryColor: primary, secondaryColor: secondary, logoUrl: logoPreview }}
          savedConfig={club.postVisualConfigs}
          onSave={handleSavePostVisual}
        />
      )}
    </div>
  )
}

function textColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff'
}
