'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from './icons'
import { Field, INPUT } from './ui'
import { detectDominantColors, contrastRatio } from '@/lib/colorDetection'
import { ONBOARDING_PRESETS, type OnboardingPreset } from '@/lib/brandOnboardingPresets'
import { questionnaireToInstructions, type QuestionnaireAnswers } from '@/lib/onboardingQuestionnaire'
import { LogoMark } from '@/components/Logo'

type Club = {
  id: string
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

type Step = 'choice' | 'logo' | 'colors' | 'preset' | 'questionnaire' | 'vocabulary' | 'preview' | 'activate'
const RAPID_STEPS: Step[] = ['logo', 'colors', 'preset', 'questionnaire', 'vocabulary', 'preview', 'activate']

const TONE_LABELS: Record<string, string> = { STANDARD: 'Standard', FUN: 'Fun et décontractée', SOBER: 'Sobre et factuelle' }

function textColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff'
}

export default function OnboardingWizard({ club, onClose, onActivated }: { club: Club; onClose: () => void; onActivated: () => void }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('choice')

  const [logoUrl, setLogoUrl] = useState(club.logoUrl)
  const [logoPreview, setLogoPreview] = useState(club.logoUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)

  const [primary, setPrimary] = useState(club.primaryColor)
  const [secondary, setSecondary] = useState(club.secondaryColor)
  const [preset, setPreset] = useState<OnboardingPreset | null>(null)
  const [tone, setTone] = useState(club.contentTone)
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({ tone: null, focus: null, emojiLevel: null })
  const [presetInstructions, setPresetInstructions] = useState('')
  // Volontairement vide au départ, même en cas de relance : préremplir avec
  // club.customInstructions mélangerait les consignes générées par un run
  // précédent (preset + questionnaire d'alors) avec celles de ce nouveau run,
  // produisant des consignes de ton contradictoires une fois concaténées.
  const [customInstructions, setCustomInstructions] = useState('')
  const [bannedWords, setBannedWords] = useState(club.bannedWords ?? '')
  const [signaturePhrase, setSignaturePhrase] = useState(club.signaturePhrase ?? '')
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)

  const isRelaunch = Boolean(club.logoUrl || club.customInstructions)
  const resolvedTone = answers.tone || tone

  const stepIndex = RAPID_STEPS.indexOf(step)

  function goNext() {
    const i = RAPID_STEPS.indexOf(step)
    if (i >= 0 && i < RAPID_STEPS.length - 1) setStep(RAPID_STEPS[i + 1])
  }
  function goBack() {
    const i = RAPID_STEPS.indexOf(step)
    if (i > 0) setStep(RAPID_STEPS[i - 1])
    else setStep('choice')
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    const blobUrl = URL.createObjectURL(file)
    setLogoPreview(blobUrl)
    setUploading(true)
    const fd = new FormData()
    fd.append('logo', file)
    const res = await fetch('/api/clubs/logo', { method: 'POST', body: fd })
    const data = await res.json().catch(() => null)
    if (res.ok) {
      setLogoUrl(data?.logoUrl ?? null)
      setDetecting(true)
      const detected = await detectDominantColors(blobUrl)
      setDetecting(false)
      if (detected) { setPrimary(detected.primary); setSecondary(detected.secondary) }
    } else {
      setLogoPreview(club.logoUrl)
      setUploadError(data?.error ?? 'Échec de l’envoi du logo')
    }
    setUploading(false)
  }

  function applyPreset(p: OnboardingPreset) {
    setPreset(p)
    setPrimary(p.primaryColor)
    setSecondary(p.secondaryColor)
    setTone(p.contentTone)
    setPresetInstructions(p.instructions)
  }

  function buildFinalInstructions(): string {
    const parts = [presetInstructions, ...questionnaireToInstructions(answers), customInstructions].filter(Boolean)
    return [...new Set(parts)].join(' ')
  }

  async function activate() {
    setActivating(true)
    setActivateError(null)
    const finalInstructions = buildFinalInstructions()
    const res = await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: club.name, sport: club.sport,
        primaryColor: primary, secondaryColor: secondary,
        contentTone: resolvedTone,
        customInstructions: finalInstructions,
        bannedWords, signaturePhrase,
      }),
    })
    setActivating(false)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setActivateError(data?.error ?? 'Échec de l’activation')
      return
    }
    try { window.localStorage.setItem(`onboarding_done_${club.id}`, '1') } catch {}
    router.refresh()
    onActivated()
    onClose()
  }

  const contrast = contrastRatio(primary, secondary)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6">
          {step !== 'choice' && (
            <div className="flex gap-1">
              {RAPID_STEPS.map((s, i) => (
                <span key={s} className={`h-1.5 w-6 rounded-full ${i <= stepIndex ? 'bg-[#2563eb]' : 'bg-gray-200'}`} />
              ))}
            </div>
          )}
          <button onClick={onClose} className="ml-auto text-muted hover:text-ink transition" aria-label="Fermer">
            <Icon name="arrowLeft" className="h-5 w-5 rotate-180" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">
          {step === 'choice' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-ink">Configurons l&apos;identité de votre club</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => setStep('logo')} className="rounded-2xl border-2 border-[#2563eb] bg-brand-soft/40 p-5 text-left hover:shadow-card transition">
                  <p className="font-bold text-ink">⚡ Rapide</p>
                  <p className="text-xs text-muted mt-1">5 minutes — logo, couleurs, ton et quelques questions.</p>
                </button>
                {/*
                  "Complète" renvoie vers l'espace Identité du club existant (Lot 3)
                  plutôt que de construire un second wizard multi-étapes : l'import de
                  charte/références qui doit l'enrichir arrive au Lot 5, et un wizard
                  "complet" construit maintenant devrait être entièrement refait à ce
                  moment-là. Choix de scope assumé (cf. docs/brand-kit-plan.md §7),
                  pas un renvoi "bientôt disponible" — la configuration manuelle
                  complète est déjà pleinement fonctionnelle.
                */}
                <button
                  onClick={() => { onClose(); router.push('/dashboard?tab=personnalisation') }}
                  className="rounded-2xl border border-line p-5 text-left hover:border-gray-300 transition"
                >
                  <p className="font-bold text-ink">🎨 Complète</p>
                  <p className="text-xs text-muted mt-1">Configurez chaque section vous-même dans Identité du club.</p>
                </button>
              </div>
            </div>
          )}

          {step === 'logo' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-brand uppercase tracking-wide">Étape 1/7</p>
              <h2 className="text-lg font-black text-ink">Votre logo</h2>
              <div
                onClick={() => fileRef.current?.click()}
                className="w-32 h-32 mx-auto rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#2563eb] transition"
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <Icon name="image" className="h-8 w-8 text-muted" />
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="block mx-auto text-sm font-semibold text-[#2563eb] hover:underline">
                {uploading ? 'Envoi...' : logoUrl ? 'Changer de logo' : 'Choisir un logo'}
              </button>
              {uploadError && <p className="text-xs text-red-500 text-center">{uploadError}</p>}
              <p className="text-xs text-muted text-center">Optionnel — vous pourrez l&apos;ajouter plus tard.</p>
            </div>
          )}

          {step === 'colors' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-brand uppercase tracking-wide">Étape 2/7</p>
              <h2 className="text-lg font-black text-ink">Couleurs {detecting ? '(détection en cours...)' : logoPreview ? 'détectées' : ''}</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Couleur principale">
                  <div className="flex items-center gap-2">
                    <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input type="text" value={primary} onChange={e => setPrimary(e.target.value)} className={`${INPUT} font-mono`} maxLength={7} />
                  </div>
                </Field>
                <Field label="Couleur secondaire">
                  <div className="flex items-center gap-2">
                    <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input type="text" value={secondary} onChange={e => setSecondary(e.target.value)} className={`${INPUT} font-mono`} maxLength={7} />
                  </div>
                </Field>
              </div>
              {contrast < 2.2 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">⚠ Ces couleurs sont assez proches, corrigez-les si besoin.</p>
              )}
            </div>
          )}

          {step === 'preset' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-brand uppercase tracking-wide">Étape 3/7</p>
              <h2 className="text-lg font-black text-ink">Quel style vous ressemble ?</h2>
              <div className="grid grid-cols-1 gap-2">
                {ONBOARDING_PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => applyPreset(p)}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${preset?.key === p.key ? 'border-[#2563eb] bg-brand-soft/40' : 'border-line hover:border-gray-300'}`}
                  >
                    <span className="flex gap-1 shrink-0">
                      <span className="w-4 h-4 rounded-full border border-line" style={{ background: p.primaryColor }} />
                      <span className="w-4 h-4 rounded-full border border-line" style={{ background: p.secondaryColor }} />
                    </span>
                    <span>
                      <span className="block font-bold text-ink text-sm">{p.label}</span>
                      <span className="block text-xs text-muted">{p.description}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">Applique un ton, une palette et des consignes de départ — tout reste modifiable ensuite.</p>
            </div>
          )}

          {step === 'questionnaire' && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-brand uppercase tracking-wide">Étape 4/7</p>
              <h2 className="text-lg font-black text-ink">Quelques questions</h2>
              <div>
                <p className="text-sm font-semibold text-ink mb-2">Vos publications sont plutôt :</p>
                <div className="flex gap-2">
                  {[{ v: 'FUN', l: 'Fun' }, { v: 'STANDARD', l: 'Standard' }, { v: 'SOBER', l: 'Sobres' }].map(o => (
                    <button key={o.v} onClick={() => setAnswers(a => ({ ...a, tone: o.v as QuestionnaireAnswers['tone'] }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${answers.tone === o.v ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink mb-2">Que souhaitez-vous mettre le plus en avant ?</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'results', l: 'Résultats sportifs' }, { v: 'community', l: 'Bénévoles / vie du club' }, { v: 'supporters', l: 'Supporters' }, { v: 'all', l: 'Un peu de tout' }].map(o => (
                    <button key={o.v} onClick={() => setAnswers(a => ({ ...a, focus: o.v as QuestionnaireAnswers['focus'] }))}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${answers.focus === o.v ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink mb-2">Niveau d&apos;emojis souhaité :</p>
                <div className="flex gap-2">
                  {[{ v: 'low', l: 'Peu' }, { v: 'medium', l: 'Modéré' }, { v: 'high', l: 'Beaucoup' }].map(o => (
                    <button key={o.v} onClick={() => setAnswers(a => ({ ...a, emojiLevel: o.v as QuestionnaireAnswers['emojiLevel'] }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${answers.emojiLevel === o.v ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'vocabulary' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-brand uppercase tracking-wide">Étape 5/7</p>
              <h2 className="text-lg font-black text-ink">Vocabulaire</h2>
              <Field label="Expressions à ne jamais utiliser (optionnel)">
                <input value={bannedWords} onChange={e => setBannedWords(e.target.value)} className={INPUT} placeholder="Ex: déception, échec" maxLength={1500} />
              </Field>
              <Field label="Phrase de signature (optionnel)">
                <input value={signaturePhrase} onChange={e => setSignaturePhrase(e.target.value)} className={INPUT} maxLength={200} placeholder="Ex: Allez les Rouge et Blanc !" />
              </Field>
              <Field label="Consignes complémentaires pour cette configuration (optionnel)">
                <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} rows={2} maxLength={1000} className={`${INPUT} resize-none`} />
              </Field>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-brand uppercase tracking-wide">Étape 6/7</p>
              <h2 className="text-lg font-black text-ink">Aperçu</h2>
              <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: primary }}>
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <p className="text-lg font-extrabold" style={{ color: textColor(primary) }}>{club.name}</p>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: `${secondary}22` }}>
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
                    ) : <LogoMark size={18} />}
                  </div>
                </div>
                <div className="px-5 py-3" style={{ background: secondary, color: textColor(secondary) }}>
                  <p className="text-xs font-bold">tribunes.app</p>
                </div>
              </div>
              <div className="rounded-xl bg-subtle p-4 space-y-1">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">Ton retenu</p>
                <p className="text-sm text-ink">{TONE_LABELS[resolvedTone] ?? resolvedTone}</p>
              </div>
              <div className="rounded-xl bg-subtle p-4 space-y-1">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">Consignes qui seront appliquées</p>
                <p className="text-sm text-ink">{buildFinalInstructions() || 'Aucune consigne particulière.'}</p>
              </div>
              <p className="text-xs text-muted text-center">Aperçu déterministe, aucun appel IA.</p>
            </div>
          )}

          {step === 'activate' && (
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold text-brand uppercase tracking-wide">Étape 7/7</p>
              <h2 className="text-lg font-black text-ink">Tout est prêt</h2>
              <p className="text-sm text-muted">Votre identité active reste modifiable à tout moment depuis Identité du club.</p>
              {isRelaunch && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  ⚠ Cette action remplace votre identité actuelle (logo, couleurs, ton, consignes). L&apos;ancienne version reste restaurable depuis l&apos;historique.
                </p>
              )}
              {activateError && <p className="text-xs text-red-500">{activateError}</p>}
              <button
                onClick={activate}
                disabled={activating}
                className="w-full py-3 rounded-xl font-bold text-sm bg-[#111827] text-white hover:bg-[#1f2937] transition disabled:opacity-60"
              >
                {activating ? 'Activation...' : 'Activer cette identité'}
              </button>
            </div>
          )}
        </div>

        {step !== 'choice' && (
          <div className="flex items-center justify-between px-6 pb-6">
            <button onClick={goBack} className="text-sm font-semibold text-muted hover:text-ink transition">← Précédent</button>
            {step !== 'activate' && (
              <button onClick={goNext} className="px-5 py-2 rounded-xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4fd8] transition">
                Suivant →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
