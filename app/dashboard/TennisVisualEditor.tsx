'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { drawTournamentSchedule, DEFAULT_TENNIS_CONFIG, type TennisVisualConfig, type TennisPreset } from './posts/TennisVisualGenerator'
import type { TournamentMatch } from '@/lib/services/fft-pdf-parser'

// ── Sample data for live preview ───────────────────────────────────────────

const SAMPLE_MATCHES: TournamentMatch[] = [
  { time: '09:00', court: '', player1: 'Martin Thomas', club1: '', ranking1: '15/1', player2: 'Dupont Julien', club2: '', ranking2: '30/2', category: 'SM Senior', round: 'Tableau principal', score: '', isPadelPair: false, isClubPlayer: true, isBye: false, isWalkover: false },
  { time: '10:30', court: '', player1: 'Leroy Sophie', club1: '', ranking1: '30/1', player2: 'Bernard Marie', club2: '', ranking2: 'NC', category: 'SD Senior', round: 'Tableau principal', score: '', isPadelPair: false, isClubPlayer: true, isBye: false, isWalkover: false },
  { time: '11:00', court: '', player1: 'Garcia Lucas', club1: '', ranking1: '4/6', player2: 'Petit Antoine', club2: '', ranking2: '15/2', category: 'SM Senior', round: 'Tableau principal', score: '', isPadelPair: false, isClubPlayer: true, isBye: false, isWalkover: false },
  { time: '14:00', court: '', player1: 'Roux Emma', club1: '', ranking1: '30/5', player2: 'Moreau Chloé', club2: '', ranking2: '30/1', category: 'SD Juniors', round: 'Tableau principal', score: '', isPadelPair: false, isClubPlayer: true, isBye: false, isWalkover: false },
]

// ── Preset definitions ─────────────────────────────────────────────────────

type PresetMeta = {
  key: TennisPreset
  label: string
  desc: string
  bg: string
  accent: string
  textCol: string
  overrides: Partial<TennisVisualConfig>
}

const PRESETS: PresetMeta[] = [
  {
    key: 'sobre',
    label: 'Sobre',
    desc: 'Blanc épuré, pro',
    bg: '#ffffff',
    accent: '#2563eb',
    textCol: '#111827',
    overrides: { showGrid: false, namesFormat: 'as-is', logoBubble: false },
  },
  {
    key: 'pro',
    label: 'Pro',
    desc: 'Dégradé premium',
    bg: 'linear-gradient(135deg,#111827 0%,rgba(233,69,96,.6) 100%)',
    accent: '#2563eb',
    textCol: '#ffffff',
    overrides: { showGrid: true, namesFormat: 'upper', logoBubble: true },
  },
  {
    key: 'neon',
    label: 'Néon',
    desc: 'Glow & dark',
    bg: '#06060f',
    accent: '#00f0ff',
    textCol: '#ffffff',
    overrides: { showGrid: true, namesFormat: 'upper', logoBubble: false, neonColor: '#00f0ff', neonIntensity: 1.0 },
  },
  {
    key: 'glass',
    label: 'Glass',
    desc: 'Glassmorphisme',
    bg: 'radial-gradient(circle at 38% 30%, rgba(233,69,96,.35) 0%, #111827 50%, #0d0d1f 100%)',
    accent: 'rgba(255,255,255,.88)',
    textCol: '#ffffff',
    overrides: { showGrid: false, namesFormat: 'as-is', logoBubble: true, gradientAngle: 145 },
  },
  {
    key: 'magazine',
    label: 'Magazine',
    desc: 'Bande diagonale',
    bg: '#2563eb',
    accent: '#111827',
    textCol: '#ffffff',
    overrides: { showGrid: false, namesFormat: 'upper', logoBubble: false },
  },
  {
    key: 'classique',
    label: 'Classique',
    desc: 'Sobre & club',
    bg: '#111827',
    accent: '#f5a623',
    textCol: '#ffffff',
    overrides: { showGrid: false, namesFormat: 'upper', logoBubble: false },
  },
]

// ── Mini preset card ───────────────────────────────────────────────────────

function PresetCard({
  meta, selected, club, onClick,
}: {
  meta: PresetMeta
  selected: boolean
  club: { primaryColor: string; secondaryColor: string }
  onClick: () => void
}) {
  const bg = meta.key === 'classique'
    ? club.primaryColor
    : meta.key === 'magazine'
      ? club.secondaryColor
      : meta.key === 'pro'
        ? undefined
        : meta.bg

  const cardStyle: React.CSSProperties = {
    background: bg ?? `linear-gradient(135deg, ${club.primaryColor} 0%, ${club.secondaryColor}99 100%)`,
    borderRadius: 10,
    aspectRatio: '1',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    border: selected ? `2.5px solid #2563eb` : '2.5px solid transparent',
    transition: 'border-color .15s',
  }

  const accentColor = meta.key === 'classique' ? club.secondaryColor
    : meta.key === 'sobre' ? club.secondaryColor
    : meta.key === 'magazine' ? club.primaryColor
    : meta.accent

  const textCol = meta.key === 'sobre' ? club.primaryColor : meta.textCol

  return (
    <button onClick={onClick} style={cardStyle} title={meta.label}>
      {/* top accent bar */}
      <div style={{ height: 4, background: accentColor, position: 'absolute', top: 0, left: 0, right: 0 }} />

      {/* Magazine diagonal */}
      {meta.key === 'magazine' && (
        <div style={{
          position: 'absolute', top: -20, right: -10, width: '55%', height: '160%',
          background: club.primaryColor, transform: 'rotate(-13deg)', transformOrigin: 'top right',
        }} />
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '10px 10px 6px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ fontSize: 8, fontWeight: 800, color: textCol, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 4 }}>
          Ton club
        </div>
        <div style={{ fontSize: 6, color: accentColor, marginTop: 1, marginBottom: 4 }}>
          Tournoi de Printemps
        </div>

        {/* Neon dots */}
        {meta.key === 'neon' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: 2, height: 2, borderRadius: '50%',
                background: 'rgba(0,240,255,.3)',
                top: `${(i % 4) * 25 + 5}%`,
                left: `${Math.floor(i / 4) * 33 + 5}%`,
              }} />
            ))}
          </div>
        )}

        {/* Match rows */}
        {[0, 1, 2].map(j => {
          const rowBg = meta.key === 'sobre'
            ? j % 2 === 0 ? 'rgba(0,0,0,.04)' : 'transparent'
            : meta.key === 'pro'
              ? j % 2 === 0 ? 'rgba(255,255,255,.07)' : 'transparent'
              : meta.key === 'neon'
                ? 'rgba(0,240,255,.06)'
                : meta.key === 'glass'
                  ? 'rgba(255,255,255,.1)'
                  : meta.key === 'magazine'
                    ? 'rgba(255,255,255,.96)'
                    : 'transparent'

          const rowBorder = meta.key === 'neon'
            ? 'rgba(0,240,255,.25)'
            : meta.key === 'glass'
              ? 'rgba(255,255,255,.2)'
              : 'transparent'

          const nameCol = meta.key === 'magazine'
            ? club.primaryColor
            : meta.key === 'sobre'
              ? club.primaryColor
              : '#ffffff'

          const badgeCol = meta.key === 'sobre' ? club.primaryColor
            : meta.key === 'neon' ? 'transparent' : accentColor
          const badgeTextCol = meta.key === 'sobre' ? '#ffffff'
            : meta.key === 'neon' ? meta.accent : textCol

          return (
            <div key={j} style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '2px 4px', marginBottom: 2, borderRadius: 5,
              background: rowBg, border: `0.5px solid ${rowBorder}`,
            }}>
              <div style={{
                fontSize: 5, fontWeight: 700, padding: '1px 3px', borderRadius: 2,
                background: badgeCol,
                border: meta.key === 'neon' ? `0.5px solid ${meta.accent}` : 'none',
                color: badgeTextCol,
              }}>
                {['09:00', '10:30', '11:00'][j]}
              </div>
              <div style={{ fontSize: 6, fontWeight: 700, color: nameCol, flex: 1 }}>MARTIN</div>
              <div style={{ fontSize: 5, color: meta.key === 'magazine' ? accentColor : accentColor }}>vs</div>
              <div style={{ fontSize: 6, fontWeight: 700, color: nameCol }}>DUPONT</div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 14,
        background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px',
      }}>
        <span style={{ fontSize: 5, fontWeight: 700, color: meta.key === 'sobre' ? '#fff' : textCol }}>tribunes.app</span>
      </div>
    </button>
  )
}

// ── Toggle ─────────────────────────────────────────────────────────────────

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-[#111827]">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#2563eb]' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </label>
  )
}

// ── Slider ─────────────────────────────────────────────────────────────────

function Slider({ label, min, max, step, value, onChange, format }: {
  label: string; min: number; max: number; step: number; value: number
  onChange: (v: number) => void; format?: (v: number) => string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-[#111827]">{label}</span>
        <span className="text-sm text-gray-500 font-mono tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#2563eb] h-1.5 rounded" />
    </div>
  )
}

// ── Main editor ────────────────────────────────────────────────────────────

type Club = { name: string; sport: string; primaryColor: string; secondaryColor: string; logoUrl?: string | null }

export default function TennisVisualEditor({
  club, initialConfig, onSave,
}: {
  club: Club
  initialConfig?: TennisVisualConfig | null
  onSave: (cfg: TennisVisualConfig) => Promise<void>
}) {
  const [cfg, setCfg] = useState<TennisVisualConfig>(initialConfig ?? DEFAULT_TENNIS_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const previewMatches = SAMPLE_MATCHES.slice(0, Math.min(cfg.matchesPerPage, 4))

  const redraw = useCallback(() => {
    if (!canvasRef.current) return
    drawTournamentSchedule(
      canvasRef.current, club, previewMatches,
      'Tournoi de Printemps', new Date('2026-06-28'), cfg
    ).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, club.primaryColor, club.secondaryColor, club.logoUrl])

  useEffect(() => { redraw() }, [redraw])

  function upd(patch: Partial<TennisVisualConfig>) {
    setCfg(prev => ({ ...prev, ...patch }))
  }

  function selectPreset(meta: PresetMeta) {
    upd({ preset: meta.key, ...meta.overrides })
  }

  async function handleSave() {
    setSaving(true)
    await onSave(cfg)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const isNeon = cfg.preset === 'neon'
  const isGradient = cfg.preset === 'pro' || cfg.preset === 'glass'

  return (
    <div className="space-y-6">

      {/* ── Preset grid ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Style du visuel</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {PRESETS.map(meta => (
            <div key={meta.key} className="space-y-1.5">
              <PresetCard meta={meta} selected={cfg.preset === meta.key} club={club} onClick={() => selectPreset(meta)} />
              <div>
                <p className="text-xs font-semibold text-[#111827] text-center">{meta.label}</p>
                <p className="text-[10px] text-gray-400 text-center">{meta.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Settings column ── */}
        <div className="space-y-4">

          {/* Fond & effets */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fond & effets</p>

            {isGradient && (
              <Slider label="Angle du dégradé" min={0} max={360} step={5}
                value={cfg.gradientAngle} onChange={v => upd({ gradientAngle: v })}
                format={v => `${v}°`} />
            )}

            {isNeon && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-[#111827] block mb-1.5">Couleur néon</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={cfg.neonColor} onChange={e => upd({ neonColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input type="text" value={cfg.neonColor} onChange={e => upd({ neonColor: e.target.value })}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                      maxLength={7} />
                  </div>
                </div>
                <Slider label="Intensité du glow" min={0.3} max={2.0} step={0.1}
                  value={cfg.neonIntensity} onChange={v => upd({ neonIntensity: v })}
                  format={v => `×${v.toFixed(1)}`} />
              </div>
            )}

            {(cfg.preset === 'pro' || cfg.preset === 'neon' || cfg.preset === 'classique') && (
              <Toggle label="Motif de fond" checked={cfg.showGrid} onChange={v => upd({ showGrid: v })} />
            )}
          </div>

          {/* VS & Classements */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">VS & Classements</p>

            <Slider label="Taille du VS" min={0.8} max={3.0} step={0.1}
              value={cfg.vsSize ?? 1.8} onChange={v => upd({ vsSize: v })}
              format={v => `×${v.toFixed(1)}`} />

            <div>
              <label className="text-sm text-[#111827] block mb-2">Style du VS</label>
              <div className="grid grid-cols-2 gap-2">
                {([['text', 'Texte seul'], ['lines', '──── vs ────']] as const).map(([val, lbl]) => (
                  <button key={val} onClick={() => upd({ vsStyle: val })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${(cfg.vsStyle ?? 'text') === val ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-[#111827] block mb-2">Affichage des classements</label>
              <div className="grid grid-cols-3 gap-2">
                {([['pill', '🏷️ Badge'], ['text', '· Texte'], ['hidden', '✕ Masqué']] as const).map(([val, lbl]) => (
                  <button key={val} onClick={() => upd({ rankingStyle: val })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${(cfg.rankingStyle ?? 'pill') === val ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Badge = pill avec couleur accent · Texte = muted discret</p>
            </div>
          </div>

          {/* Éléments */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Éléments affichés</p>
            <Toggle label="Badge heure" checked={cfg.showTime} onChange={v => upd({ showTime: v })} />
            <Toggle label="Catégorie (SD/SM...)" checked={cfg.showCategory} onChange={v => upd({ showCategory: v })} />
            <Toggle label="Footer tribunes.app" checked={cfg.showFooter} onChange={v => upd({ showFooter: v })} />
            {!cfg.showFooter && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Fonctionnalité Premium — Le footer est retiré du visuel.
              </p>
            )}
          </div>

          {/* Typo & mise en page */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Texte & mise en page</p>

            <Slider label="Taille du texte" min={0.75} max={1.35} step={0.05}
              value={cfg.fontScale} onChange={v => upd({ fontScale: v })}
              format={v => `×${v.toFixed(2)}`} />

            <Slider label="Matchs par visuel" min={3} max={9} step={1}
              value={cfg.matchesPerPage} onChange={v => upd({ matchesPerPage: v })} />

            <div>
              <label className="text-sm text-[#111827] block mb-2">Casse des noms</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['smart',  'NOM Prénom'],
                  ['upper',  'TOUT EN CAPS'],
                  ['as-is',  'Tel quel'],
                ] as const).map(([val, lbl]) => (
                  <button key={val} onClick={() => upd({ namesFormat: val })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${(cfg.namesFormat ?? 'smart') === val ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                NOM Prénom = nom de famille en majuscules, prénom en minuscules
              </p>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Logo</p>

            <div>
              <label className="text-sm text-[#111827] block mb-2">Taille</label>
              <div className="grid grid-cols-4 gap-2">
                {(['hidden', 'sm', 'md', 'lg'] as const).map(sz => (
                  <button key={sz} onClick={() => upd({ logoSize: sz })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${cfg.logoSize === sz ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {sz === 'hidden' ? 'Aucun' : sz === 'sm' ? 'Petit' : sz === 'md' ? 'Moyen' : 'Grand'}
                  </button>
                ))}
              </div>
            </div>

            {cfg.logoSize !== 'hidden' && (
              <>
                <div>
                  <label className="text-sm text-[#111827] block mb-2">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([['top-right', 'Haut droite'], ['top-left', 'Haut gauche'], ['watermark', 'Filigrane']] as const).map(([val, lbl]) => (
                      <button key={val} onClick={() => upd({ logoPosition: val })}
                        className={`py-2 rounded-xl text-xs font-semibold border transition ${cfg.logoPosition === val ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <Toggle label="Bulle de fond derrière le logo" checked={cfg.logoBubble} onChange={v => upd({ logoBubble: v })} />
              </>
            )}
          </div>

          {/* Footer tag */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Footer</p>
            <div>
              <label className="text-sm text-[#111827] block mb-1.5">Hashtags personnalisés</label>
              <input type="text" value={cfg.footerTag} onChange={e => upd({ footerTag: e.target.value })}
                placeholder={`#${club.name.toLowerCase().replace(/\s/g, '')} #${club.sport.toLowerCase()}`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
              <p className="text-xs text-gray-400 mt-1">Laisse vide = hashtags automatiques</p>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-[#22c55e] text-white' : 'bg-[#111827] text-white hover:bg-[#1f2937]'} disabled:opacity-60`}>
            {saved ? '✓ Style sauvegardé !' : saving ? 'Sauvegarde...' : '💾 Sauvegarder le style'}
          </button>
        </div>

        {/* ── Live preview column ── */}
        <div className="space-y-3 lg:sticky lg:top-6 self-start">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Aperçu live</p>
          <div className="relative">
            <canvas ref={canvasRef} className="w-full aspect-square rounded-2xl shadow-lg" />
            <div className="absolute top-3 right-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/30 text-white backdrop-blur-sm">
                1080 × 1080
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Aperçu avec données exemple · Tes couleurs club sont utilisées
          </p>

          {/* Quick reset */}
          <button
            onClick={() => { const meta = PRESETS.find(m => m.key === cfg.preset); if (meta) selectPreset(meta) }}
            className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-[#2563eb] border border-gray-100 rounded-xl hover:border-[#2563eb]/30 transition">
            ↺ Réinitialiser le preset « {cfg.preset} »
          </button>
        </div>
      </div>
    </div>
  )
}
