'use client'

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import VisualEditor from './VisualEditor'
import TennisVisualEditor from './TennisVisualEditor'
import type { VisualConfig } from '@/lib/visualLayout'
import { parseVisualConfig } from '@/lib/visualLayout'
import type { TennisVisualConfig } from './posts/TennisVisualGenerator'
import { Segmented } from './ui'

type Club = {
  id: string
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  visualConfig: unknown
  tennisVisualConfig?: unknown
  tenupUrl?: string | null
}

type ClubProfile = {
  city?: string
  foundedYear?: string
  venueName?: string
  venueCapacity?: string
  website?: string
  instagramHandle?: string
  facebookPage?: string
  whatsappLink?: string
  presidentName?: string
  contactEmail?: string
  playerCount?: string
  youthCount?: string
  volunteerCount?: string
  coachCount?: string
  staffCount?: string
  teamCount?: string
  womenCount?: string
  partnerCount?: string
  memberCount?: string
  monthlyPostsTarget?: string
  story?: string
}

type StoredVisualConfig = VisualConfig & {
  clubProfile?: ClubProfile
}

const SPORTS = ['Football', 'Rugby', 'Basketball', 'Handball', 'Volleyball', 'Tennis', 'Badminton', 'Padel', 'Autre']

const PRESETS = [
  { label: 'Bleu nuit / Rouge', primary: '#111827', secondary: '#2563eb' },
  { label: 'Marine / Or', primary: '#0a1628', secondary: '#f5a623' },
  { label: 'Vert foret / Blanc', primary: '#1a3d2b', secondary: '#ffffff' },
  { label: 'Bordeaux / Beige', primary: '#6b1a2a', secondary: '#f5e6d3' },
  { label: 'Noir / Cyan', primary: '#0d0d0d', secondary: '#00d4ff' },
  { label: 'Violet / Lime', primary: '#2d1b69', secondary: '#a8ff3e' },
]

const EMPTY_PROFILE: ClubProfile = {
  city: '',
  foundedYear: '',
  venueName: '',
  venueCapacity: '',
  website: '',
  instagramHandle: '',
  facebookPage: '',
  whatsappLink: '',
  presidentName: '',
  contactEmail: '',
  playerCount: '',
  youthCount: '',
  volunteerCount: '',
  coachCount: '',
  staffCount: '',
  teamCount: '',
  womenCount: '',
  partnerCount: '',
  memberCount: '',
  monthlyPostsTarget: '',
  story: '',
}

export default function ClubSettings({ club }: { club: Club }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const initialVisualConfig = getStoredVisualConfig(club.visualConfig)

  const [name, setName] = useState(club.name)
  const [sport, setSport] = useState(club.sport)
  const [primary, setPrimary] = useState(club.primaryColor)
  const [secondary, setSecondary] = useState(club.secondaryColor)
  const [logoUrl, setLogoUrl] = useState<string | null>(club.logoUrl)
  const [logoPreview, setLogoPreview] = useState<string | null>(club.logoUrl)
  const [tenupUrl, setTenupUrl] = useState(club.tenupUrl ?? '')
  const [profile, setProfile] = useState<ClubProfile>({ ...EMPTY_PROFILE, ...initialVisualConfig.clubProfile })

  const [mainTab, setMainTab] = useState<'management' | 'art'>('management')
  const [artTab, setArtTab] = useState<'identity' | 'result' | 'tennis'>('identity')
  const [savingManagement, setSavingManagement] = useState(false)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [savedManagement, setSavedManagement] = useState(false)
  const [savedIdentity, setSavedIdentity] = useState(false)

  const isTennisPadel = sport === 'Tennis' || sport === 'Padel'
  const communitySize = firstNumber(profile.memberCount) || firstNumber(profile.playerCount) + firstNumber(profile.volunteerCount) + firstNumber(profile.staffCount)
  const supportStaff = firstNumber(profile.coachCount) + firstNumber(profile.staffCount)
  const engagementRatio = firstNumber(profile.playerCount) > 0
    ? Math.round((firstNumber(profile.volunteerCount) / firstNumber(profile.playerCount)) * 100)
    : 0
  const contentPotential = firstNumber(profile.monthlyPostsTarget) || Math.max(firstNumber(profile.teamCount) * 4, club.logoUrl ? 8 : 4)

  function setProfileField(key: keyof ClubProfile, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  function buildVisualConfigPayload(cfg?: VisualConfig): StoredVisualConfig {
    const base = cfg ?? parseVisualConfig(club.visualConfig)
    return {
      ...base,
      clubProfile: pruneProfile(profile),
    }
  }

  async function saveClubBase(extra: { visualConfig?: StoredVisualConfig; tennisVisualConfig?: TennisVisualConfig } = {}) {
    await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        sport,
        primaryColor: primary,
        secondaryColor: secondary,
        tenupUrl,
        ...(extra.visualConfig !== undefined ? { visualConfig: extra.visualConfig } : {}),
        ...(extra.tennisVisualConfig !== undefined ? { tennisVisualConfig: extra.tennisVisualConfig } : {}),
      }),
    })
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

  async function handleSaveManagement() {
    setSavingManagement(true)
    await saveClubBase({ visualConfig: buildVisualConfigPayload() })
    setSavingManagement(false)
    setSavedManagement(true)
    setTimeout(() => setSavedManagement(false), 2000)
    router.refresh()
  }

  async function handleSaveIdentity() {
    setSavingIdentity(true)
    await saveClubBase({ visualConfig: buildVisualConfigPayload() })
    setSavingIdentity(false)
    setSavedIdentity(true)
    setTimeout(() => setSavedIdentity(false), 2000)
    router.refresh()
  }

  async function handleSaveLayout(cfg: VisualConfig) {
    await saveClubBase({ visualConfig: buildVisualConfigPayload(cfg) })
    router.refresh()
  }

  async function handleSaveTennisConfig(cfg: TennisVisualConfig) {
    await saveClubBase({ visualConfig: buildVisualConfigPayload(), tennisVisualConfig: cfg })
    router.refresh()
  }

  return (
    <div className="max-w-7xl space-y-6">
      <Segmented
        value={mainTab}
        onChange={setMainTab}
        items={[
          { key: 'management', label: 'Gestion du club', icon: 'sliders' },
          { key: 'art', label: 'Direction artistique', icon: 'palette' },
        ]}
      />

      {mainTab === 'management' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Base club</p>
                <h3 className="text-xl font-extrabold text-[#111827] mt-2">Informations generales</h3>
                <p className="text-sm text-gray-500 mt-1">Ajoute un maximum d'infos utiles. Rien n'est obligatoire, mais plus ton club est renseigne, plus tes futurs dashboards seront pertinents.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nom du club">
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className={INPUT} />
                </Field>
                <Field label="Sport principal">
                  <select value={sport} onChange={e => setSport(e.target.value)} className={INPUT}>
                    {SPORTS.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Ville">
                  <input type="text" value={profile.city} onChange={e => setProfileField('city', e.target.value)} className={INPUT} placeholder="Ex: Nimes" />
                </Field>
                <Field label="Annee de creation">
                  <input type="text" value={profile.foundedYear} onChange={e => setProfileField('foundedYear', e.target.value)} className={INPUT} placeholder="Ex: 1987" />
                </Field>
                <Field label="Nom du complexe / stade">
                  <input type="text" value={profile.venueName} onChange={e => setProfileField('venueName', e.target.value)} className={INPUT} placeholder="Ex: Complexe des Pins" />
                </Field>
                <Field label="Capacite d'accueil">
                  <input type="text" value={profile.venueCapacity} onChange={e => setProfileField('venueCapacity', e.target.value)} className={INPUT} placeholder="Ex: 350" />
                </Field>
                <Field label="President ou referente club">
                  <input type="text" value={profile.presidentName} onChange={e => setProfileField('presidentName', e.target.value)} className={INPUT} placeholder="Ex: Camille Martin" />
                </Field>
                <Field label="Email de contact">
                  <input type="email" value={profile.contactEmail} onChange={e => setProfileField('contactEmail', e.target.value)} className={INPUT} placeholder="contact@club.fr" />
                </Field>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Ressources</p>
                <h3 className="text-xl font-extrabold text-[#111827] mt-2">Effectifs et vie du club</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Licencies / membres">
                  <input type="number" min="0" value={profile.memberCount} onChange={e => setProfileField('memberCount', e.target.value)} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Joueurs actifs">
                  <input type="number" min="0" value={profile.playerCount} onChange={e => setProfileField('playerCount', e.target.value)} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Jeunes / ecole de sport">
                  <input type="number" min="0" value={profile.youthCount} onChange={e => setProfileField('youthCount', e.target.value)} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Benevoles">
                  <input type="number" min="0" value={profile.volunteerCount} onChange={e => setProfileField('volunteerCount', e.target.value)} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Coachs / educateurs">
                  <input type="number" min="0" value={profile.coachCount} onChange={e => setProfileField('coachCount', e.target.value)} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Staff / admin">
                  <input type="number" min="0" value={profile.staffCount} onChange={e => setProfileField('staffCount', e.target.value)} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Equipes engagees">
                  <input type="number" min="0" value={profile.teamCount} onChange={e => setProfileField('teamCount', e.target.value)} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Joueuses">
                  <input type="number" min="0" value={profile.womenCount} onChange={e => setProfileField('womenCount', e.target.value)} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Partenaires / sponsors">
                  <input type="number" min="0" value={profile.partnerCount} onChange={e => setProfileField('partnerCount', e.target.value)} className={INPUT} placeholder="0" />
                </Field>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Presence et contenu</p>
                <h3 className="text-xl font-extrabold text-[#111827] mt-2">Canaux de communication</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Site web">
                  <input type="text" value={profile.website} onChange={e => setProfileField('website', e.target.value)} className={INPUT} placeholder="https://..." />
                </Field>
                <Field label="Objectif posts / mois">
                  <input type="number" min="0" value={profile.monthlyPostsTarget} onChange={e => setProfileField('monthlyPostsTarget', e.target.value)} className={INPUT} placeholder="Ex: 12" />
                </Field>
                <Field label="Instagram">
                  <input type="text" value={profile.instagramHandle} onChange={e => setProfileField('instagramHandle', e.target.value)} className={INPUT} placeholder="@monclub" />
                </Field>
                <Field label="Facebook">
                  <input type="text" value={profile.facebookPage} onChange={e => setProfileField('facebookPage', e.target.value)} className={INPUT} placeholder="Page ou URL" />
                </Field>
                <Field label="Lien WhatsApp groupe comm">
                  <input type="text" value={profile.whatsappLink} onChange={e => setProfileField('whatsappLink', e.target.value)} className={INPUT} placeholder="https://chat.whatsapp.com/..." />
                </Field>
                <Field label="Histoire / pitch du club">
                  <textarea value={profile.story} onChange={e => setProfileField('story', e.target.value)} rows={4} className={`${INPUT} resize-none`} placeholder="Quelques lignes sur l'identite, l'ambiance et le positionnement du club..." />
                </Field>
              </div>
            </div>

            {isTennisPadel && (
              <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Automatisation</p>
                  <h3 className="text-xl font-extrabold text-[#111827] mt-2">Lien Ten'Up du club</h3>
                  <p className="text-sm text-gray-500 mt-1">Colle l'adresse de la page Ten'Up de ton club (tenup.fft.fr). Elle permettra de recuperer automatiquement le programme de la semaine ou du jour dans l'onglet Programme.</p>
                </div>
                <Field label="URL Ten'Up">
                  <input type="url" value={tenupUrl} onChange={e => setTenupUrl(e.target.value)} className={INPUT} placeholder="https://tenup.fft.fr/club/..." />
                </Field>
              </div>
            )}

            <button
              onClick={handleSaveManagement}
              disabled={savingManagement}
              className={`w-full py-3 rounded-xl font-bold text-sm transition ${savedManagement ? 'bg-[#22c55e] text-white' : 'bg-[#111827] text-white hover:bg-[#1f2937]'} disabled:opacity-60`}
            >
              {savedManagement ? '✓ Gestion du club sauvegardee' : savingManagement ? 'Sauvegarde...' : 'Sauvegarder la gestion du club'}
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-[#111827] rounded-3xl p-6 text-white space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Dashboard club</p>
                <h3 className="text-2xl font-black mt-2">Vue dirigeant</h3>
                <p className="text-sm text-white/70 mt-2">Ces indicateurs sont alimentes par les infos que tu renseignes ici. Ils serviront ensuite dans les dashboards automatiques et les integrations reseaux.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Communaute" value={formatMetric(communitySize)} helper="Membres et forces vives" />
                <MetricCard label="Encadrement" value={formatMetric(supportStaff)} helper="Coachs + staff" />
                <MetricCard label="Mobilisation" value={`${engagementRatio}%`} helper="Benevoles / joueurs" />
                <MetricCard label="Potentiel contenu" value={formatMetric(contentPotential)} helper="Posts mensuels cibles" />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Resume club</p>
                <h3 className="text-xl font-extrabold text-[#111827] mt-2">Carte d'identite</h3>
              </div>
              <SummaryRow label="Club" value={name || 'A renseigner'} />
              <SummaryRow label="Sport" value={sport || 'A renseigner'} />
              <SummaryRow label="Ville" value={profile.city || 'A renseigner'} />
              <SummaryRow label="Complexe" value={profile.venueName || 'A renseigner'} />
              <SummaryRow label="President" value={profile.presidentName || 'A renseigner'} />
              <SummaryRow label="Contact" value={profile.contactEmail || 'A renseigner'} />
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Donnees utiles</p>
                <h3 className="text-xl font-extrabold text-[#111827] mt-2">Ce que Tribunes pourra exploiter</h3>
              </div>
              {[
                'Comparer les volumes de contenus par equipe et par mois',
                'Mieux calibrer les suggestions de posts et de formats',
                'Preparer les futurs dashboards reseaux sociaux du club',
                "Adapter la communication selon la taille et l'organisation du club",
              ].map(item => (
                <div key={item} className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">{item}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mainTab === 'art' && (
        <div className="space-y-6">
          <Segmented
            value={artTab}
            onChange={setArtTab}
            items={[
              { key: 'identity', label: 'Identité visuelle', icon: 'palette' },
              { key: 'result', label: 'Visuel résultat', icon: 'image' },
              ...(isTennisPadel ? [{ key: 'tennis' as const, label: `Visuels ${sport}`, icon: 'trophy' as const }] : []),
            ]}
          />

          {artTab === 'identity' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Direction artistique</p>
                    <h3 className="text-xl font-extrabold text-[#111827] mt-2">Logo, couleurs et ambiance</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure les grands marqueurs visuels du club. Ils serviront dans les visuels, apercus et futures integrations.</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5">
                    <h4 className="font-bold text-[#111827] mb-4">Logo du club</h4>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#2563eb] transition"
                        onClick={() => fileRef.current?.click()}
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <span className="text-3xl">🏆</span>
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

                  <button
                    onClick={handleSaveIdentity}
                    disabled={savingIdentity}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition ${savedIdentity ? 'bg-[#22c55e] text-white' : 'bg-[#111827] text-white hover:bg-[#1f2937]'} disabled:opacity-60`}
                  >
                    {savedIdentity ? '✓ Direction artistique sauvegardee' : savingIdentity ? 'Sauvegarde...' : 'Sauvegarder la direction artistique'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Apercu live de ta DA</p>
                <div className="rounded-3xl overflow-hidden shadow-lg" style={{ background: primary }}>
                  <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: secondary, opacity: 0.8 }}>{sport}</p>
                      <p className="text-xl font-extrabold mt-0.5" style={{ color: textColor(primary) }}>{name}</p>
                    </div>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: `${secondary}22`, border: `2px solid ${secondary}44` }}>
                      {logoPreview ? (
                        <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-2xl">⚡</span>
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
                    <p className="text-xs opacity-70">#{name.toLowerCase().replace(/\s/g, '')} #{sport.toLowerCase()}</p>
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
                name,
                sport,
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
              club={{ name, sport, primaryColor: primary, secondaryColor: secondary, logoUrl: logoPreview }}
              initialConfig={club.tennisVisualConfig as TennisVisualConfig | null | undefined}
              onSave={handleSaveTennisConfig}
            />
          )}
        </div>
      )}
    </div>
  )
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#111827] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-[#111827] text-right">{value}</span>
    </div>
  )
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">{label}</p>
      <p className="text-3xl font-black mt-2">{value}</p>
      <p className="text-sm text-white/65 mt-2">{helper}</p>
    </div>
  )
}

function textColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff'
}

function firstNumber(value?: string) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMetric(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function getStoredVisualConfig(raw: unknown): StoredVisualConfig {
  const base = parseVisualConfig(raw)
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return base
  const maybeProfile = (raw as { clubProfile?: ClubProfile }).clubProfile
  return {
    ...base,
    clubProfile: maybeProfile ? { ...EMPTY_PROFILE, ...maybeProfile } : undefined,
  }
}

function pruneProfile(profile: ClubProfile): ClubProfile | undefined {
  const entries = Object.entries(profile).filter(([, value]) => String(value ?? '').trim() !== '')
  if (entries.length === 0) return undefined
  return Object.fromEntries(entries) as ClubProfile
}
