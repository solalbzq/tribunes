'use client'

import { useRef, useState } from 'react'
import TextPostsPanel from './TextPostsPanel'
import ToneSelector from './ToneSelector'
import ClubAnnouncementVisualGenerator from './ClubAnnouncementVisualGenerator'
import FormatToggle from './FormatToggle'
import type { VisualFormat } from '@/lib/visualLayout'
import { FIELD } from './ui'
import { Icon } from './icons'

type Posts = { instagram: string; facebook: string; whatsapp: string }
type PostIds = Partial<Record<keyof Posts, string>>

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

const PLATFORMS: { key: keyof Posts; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'whatsapp', label: 'WhatsApp' },
]

const MAX_KEY_INFO = 6
// Cohérent avec MAX_FIELD_LENGTH côté serveur (app/api/posts/custom-post/route.ts) —
// dupliqué ici car ce composant n'importe pas de code serveur.
const MAX_FIELD_LENGTH = 200

export type CustomPostFormInitialValues = Partial<{
  objective: string
  subject: string
  keyInformation: string[]
  callToAction: string
  targetAudience: string
  tone: string
  suggestedCategory: string
}>

function initialKeyInfo(values?: string[]): string[] {
  const filled = (values ?? []).filter(v => v.trim())
  return filled.length ? filled.slice(0, MAX_KEY_INFO) : ['']
}

/**
 * Publication libre (CUSTOM_POST) — pour toute communication de club qui ne
 * correspond à aucun type structuré existant (billetterie, jeu-concours,
 * événement caritatif...). Réutilise ClubAnnouncementVisualGenerator avec la
 * catégorie générique CLUB_LIFE plutôt que de créer un nouveau composant
 * visuel : c'est déjà le layout "badge + titre + texte" le plus générique du
 * dépôt, cohérent avec la stratégie de templates à deux niveaux (spécialisés
 * vs génériques) — un nouveau PostVisualKind dédié reste possible plus tard
 * si le besoin se confirme, pas nécessaire pour ce premier périmètre.
 */
export default function CustomPostTab({ club, initialValues }: { club: Club; initialValues?: CustomPostFormInitialValues }) {
  const [objective, setObjective] = useState(initialValues?.objective ?? '')
  const [subject, setSubject] = useState(initialValues?.subject ?? '')
  const [keyInformation, setKeyInformation] = useState<string[]>(initialKeyInfo(initialValues?.keyInformation))
  const [callToAction, setCallToAction] = useState(initialValues?.callToAction ?? '')
  const [targetAudience, setTargetAudience] = useState(initialValues?.targetAudience ?? '')
  const [tone, setTone] = useState(initialValues?.tone ?? '')
  const [platforms, setPlatforms] = useState<Set<keyof Posts>>(new Set(['instagram', 'facebook', 'whatsapp']))
  const [visualFormat, setVisualFormat] = useState<VisualFormat>('post')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Posts | null>(null)
  const [postIds, setPostIds] = useState<PostIds | null>(null)
  const [customPostId, setCustomPostId] = useState<string | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  function updateKeyInfo(i: number, value: string) {
    setKeyInformation(prev => prev.map((v, idx) => idx === i ? value : v))
  }

  function addKeyInfo() {
    if (keyInformation.length >= MAX_KEY_INFO) return
    setKeyInformation(prev => [...prev, ''])
  }

  function removeKeyInfo(i: number) {
    setKeyInformation(prev => prev.length <= 1 ? [''] : prev.filter((_, idx) => idx !== i))
  }

  function togglePlatform(p: keyof Posts) {
    setPlatforms(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p); else next.add(p)
      return next
    })
  }

  const filledKeyInfo = keyInformation.filter(v => v.trim())
  const canGenerate = Boolean(objective.trim() && subject.trim() && platforms.size > 0)

  async function generateCaptions() {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/posts/custom-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective, subject,
          keyInformation: filledKeyInfo,
          callToAction: callToAction || undefined,
          targetAudience: targetAudience || undefined,
          tone: tone || undefined,
          desiredPlatforms: Array.from(platforms),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Échec de la génération')
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
      setCustomPostId(data.customPostId ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function personalize(overrides: { tone?: string; customInstructions?: string }) {
    if (!customPostId) return
    setPersonalizing(true)
    try {
      const res = await fetch('/api/posts/custom-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective, subject,
          keyInformation: filledKeyInfo,
          callToAction: callToAction || undefined,
          targetAudience: targetAudience || undefined,
          desiredPlatforms: Array.from(platforms),
          id: customPostId, regenerate: true,
          tone: overrides.tone, customInstructions: overrides.customInstructions,
        }),
      })
      const data = await res.json()
      if (!res.ok) return
      setPosts(data.posts)
      setPostIds(data.postIds ?? null)
    } finally {
      setPersonalizing(false)
    }
  }

  if (posts) {
    return (
      <TextPostsPanel
        posts={posts}
        postIds={postIds}
        title="Vos légendes sont prêtes"
        onReset={() => { setPosts(null); setPostIds(null); setCustomPostId(null) }}
        getImageBlob={getImageBlob}
        onPersonalize={personalize}
        personalizing={personalizing}
      />
    )
  }

  const visualDescription = [objective, ...filledKeyInfo].filter(Boolean).join(' — ')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
      <div className="space-y-4">
        <p className="text-xs text-gray-400 bg-subtle rounded-xl px-3 py-2">
          N&apos;incluez pas d&apos;informations personnelles sensibles (identité complète d&apos;un mineur, coordonnées privées...) : ce texte est envoyé à un modèle d&apos;IA tiers pour la génération.
        </p>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Objectif</label>
          <input value={objective} onChange={e => setObjective(e.target.value)} className={FIELD} maxLength={MAX_FIELD_LENGTH} placeholder="Ex : Vendre des billets pour le match de gala" />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Sujet</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} className={FIELD} maxLength={MAX_FIELD_LENGTH} placeholder="Ex : Match de gala du 12 septembre" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-gray-400">Informations clés (dates, prix, contact...)</label>
            <span className="text-xs text-gray-400">{keyInformation.length}/{MAX_KEY_INFO}</span>
          </div>
          <div className="space-y-2">
            {keyInformation.map((info, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={info} onChange={e => updateKeyInfo(i, e.target.value)} className={FIELD} maxLength={MAX_FIELD_LENGTH} placeholder="Ex : 10€ sur place, gratuit -12 ans" />
                {keyInformation.length > 1 && (
                  <button onClick={() => removeKeyInfo(i)} className="text-xs text-red-400 hover:text-red-600 transition shrink-0">
                    Supprimer
                  </button>
                )}
              </div>
            ))}
          </div>
          {keyInformation.length < MAX_KEY_INFO && (
            <button
              onClick={addKeyInfo}
              className="mt-2 w-full py-2 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition"
            >
              + Ajouter une information
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Appel à l&apos;action (optionnel)</label>
          <input value={callToAction} onChange={e => setCallToAction(e.target.value)} className={FIELD} maxLength={MAX_FIELD_LENGTH} placeholder="Ex : Réservez vos places au secrétariat" />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Public visé (optionnel)</label>
          <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className={FIELD} maxLength={MAX_FIELD_LENGTH} placeholder="Ex : Licenciés et familles" />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Réseaux concernés</label>
          <div className="flex gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => togglePlatform(p.key)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                  platforms.has(p.key) ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {platforms.has('instagram') && (
            <p className="mt-1 text-xs text-gray-400">Instagram nécessite un visuel — celui généré à droite sera utilisé.</p>
          )}
        </div>

        <ToneSelector value={tone} onChange={setTone} />

        <button
          onClick={generateCaptions}
          disabled={generating || !canGenerate}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4fd8] transition disabled:opacity-60"
        >
          {generating
            ? <><Icon name="refresh" className="h-[18px] w-[18px] animate-spin" /> Génération…</>
            : <><Icon name="sparkles" className="h-[18px] w-[18px]" /> Générer les légendes IA</>}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="space-y-3">
        <FormatToggle value={visualFormat} onChange={setVisualFormat} />
        <ClubAnnouncementVisualGenerator
          club={club}
          category="CLUB_LIFE"
          title={subject}
          description={visualDescription}
          format={visualFormat}
          onCanvasReady={c => { canvasRef.current = c }}
        />
      </div>
    </div>
  )
}
