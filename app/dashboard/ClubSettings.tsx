'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import VisualEditor from './VisualEditor'
import TennisVisualEditor from './TennisVisualEditor'
import type { VisualConfig } from '@/lib/visualLayout'
import type { TennisVisualConfig } from './posts/TennisVisualGenerator'

type Club = {
  id: string
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  visualConfig: unknown
  tennisVisualConfig?: unknown
}

const SPORTS = ['Football', 'Rugby', 'Basketball', 'Handball', 'Volleyball', 'Tennis', 'Badminton', 'Padel', 'Autre']

const PRESETS = [
  { label: 'Bleu nuit / Rouge', primary: '#1a1a2e', secondary: '#e94560' },
  { label: 'Marine / Or', primary: '#0a1628', secondary: '#f5a623' },
  { label: 'Vert forêt / Blanc', primary: '#1a3d2b', secondary: '#ffffff' },
  { label: 'Bordeaux / Beige', primary: '#6b1a2a', secondary: '#f5e6d3' },
  { label: 'Noir / Cyan', primary: '#0d0d0d', secondary: '#00d4ff' },
  { label: 'Violet / Lime', primary: '#2d1b69', secondary: '#a8ff3e' },
]

export default function ClubSettings({ club }: { club: Club }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(club.name)
  const [sport, setSport] = useState(club.sport)
  const [primary, setPrimary] = useState(club.primaryColor)
  const [secondary, setSecondary] = useState(club.secondaryColor)
  const [logoUrl, setLogoUrl] = useState<string | null>(club.logoUrl)
  const [logoPreview, setLogoPreview] = useState<string | null>(club.logoUrl)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Local preview
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
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sport, primaryColor: primary, secondaryColor: secondary }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function handleSaveLayout(cfg: VisualConfig) {
    await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sport, primaryColor: primary, secondaryColor: secondary, visualConfig: cfg }),
    })
    router.refresh()
  }

  // Luminosité du texte selon la couleur de fond
  function textColor(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff'
  }

  const isTennisPadel = sport === 'Tennis' || sport === 'Padel'
  const [settingsTab, setSettingsTab] = useState<'infos' | 'editor' | 'tennis'>('infos')

  async function handleSaveTennisConfig(cfg: TennisVisualConfig) {
    await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sport, primaryColor: primary, secondaryColor: secondary, tennisVisualConfig: cfg }),
    })
    router.refresh()
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'infos', label: '⚙️ Infos & couleurs' },
          { key: 'editor', label: '🎨 Visuel résultat' },
          ...(isTennisPadel ? [{ key: 'tennis', label: `${sport === 'Padel' ? '🏸' : '🎾'} Visuel ${sport}` }] : []),
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSettingsTab(tab.key as typeof settingsTab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              settingsTab === tab.key
                ? 'bg-[#1a1a2e] text-white'
                : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {settingsTab === 'editor' && (
        <VisualEditor
          club={{ ...club, name, sport, primaryColor: primary, secondaryColor: secondary, logoUrl: logoPreview }}
          onSave={handleSaveLayout}
        />
      )}

      {settingsTab === 'tennis' && isTennisPadel && (
        <TennisVisualEditor
          club={{ name, sport, primaryColor: primary, secondaryColor: secondary, logoUrl: logoPreview }}
          initialConfig={club.tennisVisualConfig as TennisVisualConfig | null | undefined}
          onSave={handleSaveTennisConfig}
        />
      )}

      {settingsTab === 'infos' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
      {/* Formulaire */}
      <div className="space-y-6">
        {/* Infos de base */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-[#1a1a2e]">Informations du club</h3>
          <div>
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-1">Nom du club</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560]/30"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-1">Sport</label>
            <select
              value={sport} onChange={e => setSport(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560]/30"
            >
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-[#1a1a2e] mb-4">Logo du club</h3>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#e94560] transition"
              onClick={() => fileRef.current?.click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-3xl">🏆</span>
              )}
            </div>
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="block text-sm font-semibold text-[#e94560] hover:underline disabled:opacity-50"
              >
                {uploading ? 'Upload en cours...' : 'Choisir un logo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG — max 2 Mo</p>
              {logoUrl && !uploading && (
                <p className="text-xs text-[#10b981] mt-1">✓ Logo sauvegardé</p>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>

        {/* Couleurs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-[#1a1a2e]">Identité visuelle</h3>

          {/* Presets */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Palettes prédéfinies</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setPrimary(p.primary); setSecondary(p.secondary) }}
                  className={`rounded-xl overflow-hidden border-2 transition ${
                    primary === p.primary && secondary === p.secondary
                      ? 'border-[#e94560]'
                      : 'border-transparent hover:border-gray-200'
                  }`}
                  title={p.label}
                >
                  <div className="h-6" style={{ background: p.primary }} />
                  <div className="h-3" style={{ background: p.secondary }} />
                </button>
              ))}
            </div>
          </div>

          {/* Pickers custom */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-2">Couleur principale</label>
              <div className="flex items-center gap-2">
                <input
                  type="color" value={primary} onChange={e => setPrimary(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text" value={primary} onChange={e => setPrimary(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  maxLength={7}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-2">Couleur accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color" value={secondary} onChange={e => setSecondary(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text" value={secondary} onChange={e => setSecondary(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-bold text-sm transition ${
            saved
              ? 'bg-[#10b981] text-white'
              : 'bg-[#1a1a2e] text-white hover:bg-[#2a2a4e]'
          } disabled:opacity-60`}
        >
          {saved ? '✓ Sauvegardé !' : saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </button>
      </div>

      {/* Aperçu live */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Aperçu de tes visuels</p>

        {/* Card Instagram */}
        <div
          className="rounded-2xl overflow-hidden shadow-lg"
          style={{ background: primary }}
        >
          {/* Header avec logo */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: secondary, opacity: 0.8 }}>
                {sport}
              </p>
              <p className="text-xl font-extrabold mt-0.5" style={{ color: textColor(primary) }}>
                {name}
              </p>
            </div>
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background: secondary + '22', border: `2px solid ${secondary}44` }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-2xl">⚡</span>
              )}
            </div>
          </div>

          {/* Score zone */}
          <div className="mx-4 mb-4 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold text-center mb-2" style={{ color: secondary }}>
              RÉSULTAT DU MATCH
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-xs opacity-60" style={{ color: textColor(primary) }}>Nous</p>
                <p className="text-4xl font-black" style={{ color: textColor(primary) }}>3</p>
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: secondary, color: textColor(secondary) }}
              >
                VICTOIRE
              </div>
              <div className="text-center">
                <p className="text-xs opacity-60" style={{ color: textColor(primary) }}>Eux</p>
                <p className="text-4xl font-black" style={{ color: textColor(primary) }}>1</p>
              </div>
            </div>
            <p className="text-xs text-center mt-2 opacity-50" style={{ color: textColor(primary) }}>
              vs Adversaire · Championnat
            </p>
          </div>

          {/* Footer */}
          <div
            className="px-6 py-3 flex items-center justify-between"
            style={{ background: secondary, color: textColor(secondary) }}
          >
            <p className="text-xs font-bold">tribunes.app</p>
            <p className="text-xs opacity-70">#{name.toLowerCase().replace(/\s/g, '')} #{sport.toLowerCase()}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Les images seront générées avec cette DA lors de la création de posts
        </p>
      </div>
    </div>}
    </div>
  )
}
