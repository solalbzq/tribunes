'use client'

import { useState } from 'react'
import type { TournamentMatch } from '@/lib/services/fft-pdf-parser'
import TennisVisualGenerator, { type TennisVisualConfig, DEFAULT_TENNIS_CONFIG } from './TennisVisualGenerator'

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  tennisVisualConfig?: TennisVisualConfig | null
  tenupUrl?: string | null
}

type ManualRow = {
  id: string
  date: string
  time: string
  team: string
  opponent: string
  division: string
  isHome: boolean
}

const EMPTY_ROW = (team: string): ManualRow => ({
  id: Math.random().toString(36).slice(2),
  date: '',
  time: '',
  team,
  opponent: '',
  division: '',
  isHome: true,
})

function mondayOf(d = new Date()): string {
  const x = new Date(d)
  const day = x.getDay()
  const diff = x.getDate() - day + (day === 0 ? -6 : 1)
  x.setDate(diff)
  return x.toISOString().split('T')[0]
}

function rowToMatch(r: ManualRow): TournamentMatch {
  const date = r.date ? new Date(r.date) : null
  const day = date
    ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  return {
    time: r.time,
    court: '',
    player1: r.isHome ? r.team : r.opponent,
    club1: '',
    ranking1: '',
    player2: r.isHome ? r.opponent : r.team,
    club2: '',
    ranking2: '',
    category: r.division,
    round: day,
    score: '',
    isPadelPair: false,
    isClubPlayer: true,
    isBye: false,
    isWalkover: false,
  }
}

export default function TennisProgrammeSection({ club }: { club: Club }) {
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const cfg = club.tennisVisualConfig ?? DEFAULT_TENNIS_CONFIG

  // ── Manuel ──────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<ManualRow[]>([EMPTY_ROW(club.name)])
  function addRow() {
    if (rows.length >= 8) return
    setRows(prev => [...prev, EMPTY_ROW(club.name)])
  }
  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }
  function updateRow(id: string, field: keyof ManualRow, value: string | boolean) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)))
  }
  const manualMatches = rows.filter(r => r.date && r.opponent).map(rowToMatch)

  // ── Auto (Ten'Up) ─────────────────────────────────────────────────────────
  const [scope, setScope] = useState<'week' | 'day'>('week')
  const [weekStart, setWeekStart] = useState(mondayOf())
  const [day, setDay] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [autoMatches, setAutoMatches] = useState<TournamentMatch[]>([])
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')

  const [fromCache, setFromCache] = useState(false)

  async function fetchTenup(force = false) {
    setLoading(true); setError(''); setWarning(''); setAutoMatches([]); setFromCache(false)
    const body = { ...(scope === 'day' ? { day } : { weekStart }), force }
    const res = await fetch('/api/clubs/tenup/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erreur Ten\'Up'); return }
    setAutoMatches(data.matches ?? [])
    setFromCache(Boolean(data.cached))
    if (data.warning) setWarning(data.warning)
  }

  const autoDate = scope === 'day' ? new Date(day) : new Date(weekStart)
  const autoLabel =
    scope === 'day'
      ? autoDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : `Semaine du ${autoDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <h3 className="font-bold text-[#111827]">📅 Programme du club</h3>
          <p className="text-sm text-gray-500 mt-1">
            Crée le visuel du programme à la main, ou récupère-le automatiquement depuis Ten'Up.
          </p>
        </div>

        {/* Toggle Manuel / Auto */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
          {[
            { key: 'manual', label: '✍️ Manuel' },
            { key: 'auto', label: '⚡ Automatique (Ten\'Up)' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setMode(t.key as typeof mode)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                mode === t.key ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-600 hover:text-[#111827]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Mode Manuel ── */}
        {mode === 'manual' && (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={r.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Match {i + 1}</span>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(r.id)} className="text-xs text-red-400 hover:text-red-600 transition">
                      Supprimer
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {[{ v: true, l: '🏟️ Dom.' }, { v: false, l: '✈️ Ext.' }].map(o => (
                    <button
                      key={String(o.v)}
                      type="button"
                      onClick={() => updateRow(r.id, 'isHome', o.v)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        r.isHome === o.v ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={r.date} onChange={e => updateRow(r.id, 'date', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                  <input type="time" value={r.time} onChange={e => updateRow(r.id, 'time', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={r.team} onChange={e => updateRow(r.id, 'team', e.target.value)}
                    placeholder="Notre équipe"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                  <input type="text" value={r.opponent} onChange={e => updateRow(r.id, 'opponent', e.target.value)}
                    placeholder="Adversaire"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                </div>
                <input type="text" value={r.division} onChange={e => updateRow(r.id, 'division', e.target.value)}
                  placeholder="Division / compétition (ex: Régionale 2)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
              </div>
            ))}
            {rows.length < 8 && (
              <button onClick={addRow}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition">
                + Ajouter un match
              </button>
            )}
          </div>
        )}

        {/* ── Mode Auto ── */}
        {mode === 'auto' && (
          <div className="space-y-4">
            {!club.tenupUrl ? (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-4">
                ⚠️ Aucun lien Ten'Up configuré. Ajoute l'URL Ten'Up de ton club dans <b>Mon club → Gestion du club</b> pour activer la récupération automatique.
              </p>
            ) : (
              <>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                  {[
                    { key: 'week', label: 'La semaine' },
                    { key: 'day', label: 'Un jour' },
                  ].map(t => (
                    <button key={t.key} onClick={() => setScope(t.key as typeof scope)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                        scope === t.key ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-600 hover:text-[#111827]'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {scope === 'week' ? (
                  <div>
                    <label className="text-sm font-semibold text-[#111827] block mb-1">Semaine du (lundi)</label>
                    <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-semibold text-[#111827] block mb-1">Jour</label>
                    <input type="date" value={day} onChange={e => setDay(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => fetchTenup(false)} disabled={loading}
                    className="flex-1 py-3 bg-[#111827] text-white font-bold rounded-xl hover:bg-[#1f2937] transition disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <><span className="animate-spin">⚡</span> Récupération Ten'Up...</> : '🔄 Récupérer depuis Ten\'Up'}
                  </button>
                  {autoMatches.length > 0 && (
                    <button onClick={() => fetchTenup(true)} disabled={loading} title="Forcer un nouveau scrape (ignore le cache)"
                      className="px-4 py-3 bg-gray-100 text-[#111827] font-bold rounded-xl hover:bg-gray-200 transition disabled:opacity-60 text-sm whitespace-nowrap">
                      ♻️ Rafraîchir
                    </button>
                  )}
                </div>
                {warning && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">{warning}</p>}
                {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3">{error}</p>}
                {autoMatches.length > 0 && (
                  <p className="text-sm text-green-700 bg-green-50 rounded-xl p-3">
                    ✅ {autoMatches.length} rencontre{autoMatches.length > 1 ? 's' : ''} récupérée{autoMatches.length > 1 ? 's' : ''}{fromCache ? ' (depuis le cache)' : ''}.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Visuel généré */}
      {mode === 'manual' && manualMatches.length > 0 && (
        <TennisVisualGenerator
          club={club}
          matches={manualMatches}
          tournamentName="Programme du club"
          matchDate={new Date(rows.find(r => r.date)?.date ?? Date.now())}
          label="Programme"
          config={cfg}
        />
      )}
      {mode === 'auto' && autoMatches.length > 0 && (
        <TennisVisualGenerator
          club={club}
          matches={autoMatches}
          tournamentName="Programme du club"
          matchDate={autoDate}
          label={autoLabel}
          config={cfg}
        />
      )}
    </div>
  )
}
