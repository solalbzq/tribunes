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
}

const SPORTS = ['Football', 'Rugby', 'Basketball', 'Handball', 'Volleyball', 'Tennis', 'Badminton', 'Padel', 'Autre']

export default function ClubSettings({ club }: { club: Club }) {
  const router = useRouter()
  const initialVisualConfig = getStoredVisualConfig(club.visualConfig)

  const [name, setName] = useState(club.name)
  const [sport, setSport] = useState(club.sport)
  const [tenupUrl, setTenupUrl] = useState(club.tenupUrl ?? '')
  const [profile, setProfile] = useState<ClubProfile>({ ...initialVisualConfig.clubProfile })

  const [savingManagement, setSavingManagement] = useState(false)
  const [savedManagement, setSavedManagement] = useState(false)

  const isTennisPadel = sport === 'Tennis' || sport === 'Padel'

  function setProfileField(key: keyof ClubProfile, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  function buildVisualConfigPayload(): StoredVisualConfig {
    const stored = getStoredVisualConfig(club.visualConfig)
    return {
      post: stored.post,
      story: stored.story,
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
    <div className="max-w-4xl space-y-6">
      <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="border-b border-line bg-subtle/40 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Mon club</p>
          <h2 className="mt-2 text-2xl font-extrabold text-[#111827]">Identité du club</h2>
          <p className="mt-1 text-sm text-gray-500">
            Pose ici les bases de ton club pour que Tribunes parle vraiment avec ses couleurs.
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nom du club">
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Sport principal">
              <select value={sport} onChange={e => setSport(e.target.value)} className={INPUT}>
                {SPORTS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Ville">
            <input type="text" value={profile.city} onChange={e => setProfileField('city', e.target.value)} className={INPUT} placeholder="Ex: Nîmes" />
          </Field>

          <Field label="Histoire / pitch du club">
            <textarea
              value={profile.story}
              onChange={e => setProfileField('story', e.target.value)}
              rows={5}
              className={`${INPUT} resize-none`}
              placeholder="Quelques lignes sur l'identité, l'ambiance et ce qui rend ton club unique..."
            />
          </Field>

          {isTennisPadel && (
            <div className="rounded-2xl border border-line bg-subtle/30 p-5">
              <Field label="URL Ten'Up">
                <input type="url" value={tenupUrl} onChange={e => setTenupUrl(e.target.value)} className={INPUT} placeholder="https://tenup.fft.fr/club/..." />
              </Field>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-subtle/40 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Enregistre les informations du club</p>
              <p className="text-sm text-gray-500">Quelques infos bien choisies suffisent pour lancer des contenus qui sonnent juste.</p>
            </div>
            <button
              onClick={handleSaveManagement}
              disabled={savingManagement}
              className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${savedManagement ? 'bg-[#22c55e] hover:bg-[#22c55e]' : 'bg-[#111827] hover:bg-[#1f2937]'}`}
            >
              {savingManagement ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
