'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredVisualConfig, pruneProfile, type ClubProfile, type StoredVisualConfig } from '@/lib/clubProfile'
import { Field, INPUT } from './ui'

type Club = {
  id: string
  name: string
  sport: string
  visualConfig: unknown
  tenupUrl?: string | null
  automationMode: string
  telegramChatId: string | null
  automationEnabled: boolean
}

const SPORTS = ['Football', 'Rugby', 'Basketball', 'Handball', 'Volleyball', 'Tennis', 'Badminton', 'Padel', 'Autre']

export default function ClubSettings({ club }: { club: Club }) {
  const router = useRouter()
  const initialVisualConfig = getStoredVisualConfig(club.visualConfig)

  const [name, setName] = useState(club.name)
  const [sport, setSport] = useState(club.sport)
  const [tenupUrl, setTenupUrl] = useState(club.tenupUrl ?? '')
  const [profile, setProfile] = useState<ClubProfile>({ ...initialVisualConfig.clubProfile })
  const [automationMode, setAutomationMode] = useState(club.automationMode)
  const [savingAutomation, setSavingAutomation] = useState(false)
  const [automationError, setAutomationError] = useState<string | null>(null)
  const [telegramConnected, setTelegramConnected] = useState(Boolean(club.telegramChatId))
  const [telegramLinkUrl, setTelegramLinkUrl] = useState<string | null>(null)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramError, setTelegramError] = useState<string | null>(null)

  const [savingManagement, setSavingManagement] = useState(false)
  const [savedManagement, setSavedManagement] = useState(false)

  async function handleChangeAutomationMode(mode: string) {
    setSavingAutomation(true)
    setAutomationError(null)
    const previous = automationMode
    setAutomationMode(mode)
    try {
      const res = await fetch('/api/clubs/automation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationMode: mode }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setAutomationMode(previous)
        setAutomationError(data?.error ?? 'Échec de la mise à jour du mode.')
      }
    } catch {
      setAutomationMode(previous)
      setAutomationError('Échec de la mise à jour du mode.')
    } finally {
      setSavingAutomation(false)
    }
  }

  async function handleConnectTelegram() {
    setTelegramLoading(true)
    setTelegramError(null)
    try {
      const res = await fetch('/api/telegram/link-code', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setTelegramError(data.error ?? "Échec de la connexion Telegram.")
        return
      }
      setTelegramLinkUrl(data.linkUrl)
    } catch {
      setTelegramError("Échec de la connexion Telegram.")
    } finally {
      setTelegramLoading(false)
    }
  }

  async function handleDisconnectTelegram() {
    setTelegramLoading(true)
    setTelegramError(null)
    try {
      const res = await fetch('/api/telegram/link-code', { method: 'DELETE' })
      if (!res.ok) {
        setTelegramError("Échec de la déconnexion.")
        return
      }
      setTelegramConnected(false)
      setTelegramLinkUrl(null)
    } catch {
      setTelegramError("Échec de la déconnexion.")
    } finally {
      setTelegramLoading(false)
    }
  }

  const isTennisPadel = sport === 'Tennis' || sport === 'Padel'
  const communitySize = firstNumber(profile.memberCount) || firstNumber(profile.playerCount) + firstNumber(profile.volunteerCount) + firstNumber(profile.staffCount)
  const supportStaff = firstNumber(profile.coachCount) + firstNumber(profile.staffCount)
  const engagementRatio = firstNumber(profile.playerCount) > 0
    ? Math.round((firstNumber(profile.volunteerCount) / firstNumber(profile.playerCount)) * 100)
    : 0
  const contentPotential = firstNumber(profile.monthlyPostsTarget) || Math.max(firstNumber(profile.teamCount) * 4, 4)

  function setProfileField(key: keyof ClubProfile, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  function buildVisualConfigPayload(): StoredVisualConfig {
    const stored = getStoredVisualConfig(club.visualConfig)
    return {
      bgOpacity: stored.bgOpacity,
      elements: stored.elements,
      clubProfile: pruneProfile(profile),
    }
  }

  async function handleSaveManagement() {
    setSavingManagement(true)
    await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        sport,
        tenupUrl,
        visualConfig: buildVisualConfigPayload(),
      }),
    })
    setSavingManagement(false)
    setSavedManagement(true)
    setTimeout(() => setSavedManagement(false), 2000)
    router.refresh()
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Base club</p>
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

          <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Ressources</p>
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

          <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Presence et contenu</p>
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

          <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Automatisation</p>
              <h3 className="text-xl font-extrabold text-[#111827] mt-2">Mode de publication</h3>
              <p className="text-sm text-gray-500 mt-1">
                Choisis comment les posts générés sont traités après leur création.
                {!club.automationEnabled && ' Les modes automatiques nécessitent le plan Pro.'}
              </p>
            </div>

            <div className="space-y-2">
              {[
                { value: 'MANUAL', label: 'Manuel', desc: 'Tu relis et publies chaque post toi-même depuis le dashboard.' },
                { value: 'AUTO_REVIEW', label: 'Auto + validation', desc: 'Chaque post t\'est envoyé sur Telegram pour validation en un tap avant publication.' },
                { value: 'FULL_AUTO', label: 'Automatique', desc: 'Les posts sont publiés immédiatement, sans validation.' },
              ].map(opt => {
                const locked = opt.value !== 'MANUAL' && !club.automationEnabled
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                      locked ? 'opacity-50 cursor-not-allowed border-gray-200' :
                      automationMode === opt.value ? 'border-[#2563eb] bg-[#2563eb]/5' : 'border-gray-200 cursor-pointer hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="automationMode"
                      checked={automationMode === opt.value}
                      disabled={locked || savingAutomation}
                      onChange={() => handleChangeAutomationMode(opt.value)}
                      className="mt-1 h-4 w-4 accent-[#2563eb]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
            {automationError && <p className="text-xs text-red-500">{automationError}</p>}
          </div>

          <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Telegram</p>
              <h3 className="text-xl font-extrabold text-[#111827] mt-2">Validation depuis le téléphone</h3>
              <p className="text-sm text-gray-500 mt-1">
                En mode Auto + validation, chaque post t&apos;est envoyé sur ce chat avec des boutons Publier/Rejeter.
              </p>
            </div>

            {telegramConnected ? (
              <div className="flex items-center justify-between rounded-xl bg-[#111827]/5 p-3">
                <p className="text-sm font-semibold text-[#111827]">✅ Chat Telegram connecté</p>
                <button
                  onClick={handleDisconnectTelegram}
                  disabled={telegramLoading}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 transition disabled:opacity-60"
                >
                  {telegramLoading ? 'Déconnexion...' : 'Déconnecter'}
                </button>
              </div>
            ) : telegramLinkUrl ? (
              <div className="space-y-2">
                <a
                  href={telegramLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center py-3 rounded-xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4fd8] transition"
                >
                  Ouvrir Telegram pour lier le chat
                </a>
                <p className="text-xs text-gray-400">Le lien ouvre une discussion avec le bot Tribunes ; envoie /start si ce n&apos;est pas automatique.</p>
              </div>
            ) : (
              <button
                onClick={handleConnectTelegram}
                disabled={telegramLoading}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb] transition disabled:opacity-60"
              >
                {telegramLoading ? 'Génération du lien...' : 'Connecter Telegram'}
              </button>
            )}
            {telegramError && <p className="text-xs text-red-500">{telegramError}</p>}
          </div>

          {isTennisPadel && (
            <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Ten&apos;Up</p>
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

          <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Resume club</p>
              <h3 className="text-xl font-extrabold text-[#111827] mt-2">Carte d'identite</h3>
            </div>
            <SummaryRow label="Club" value={name || 'A renseigner'} />
            <SummaryRow label="Sport" value={sport || 'A renseigner'} />
            <SummaryRow label="Ville" value={profile.city || 'A renseigner'} />
            <SummaryRow label="Complexe" value={profile.venueName || 'A renseigner'} />
            <SummaryRow label="President" value={profile.presidentName || 'A renseigner'} />
            <SummaryRow label="Contact" value={profile.contactEmail || 'A renseigner'} />
          </div>

          <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Donnees utiles</p>
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

function firstNumber(value?: string) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMetric(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}
