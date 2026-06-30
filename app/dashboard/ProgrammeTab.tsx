'use client'

import { useState } from 'react'
import ScheduleGenerator from './ScheduleGenerator'

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

type UpcomingMatch = {
  id: string
  date: string
  opponent: string
  competition: string
  isHome: boolean
}

const EMPTY_MATCH = (): UpcomingMatch => ({
  id: Math.random().toString(36).slice(2),
  date: '',
  opponent: '',
  competition: '',
  isHome: true,
})

export default function ProgrammeTab({ club }: { club: Club }) {
  const [matches, setMatches] = useState<UpcomingMatch[]>([EMPTY_MATCH()])

  function addMatch() {
    if (matches.length >= 6) return
    setMatches(prev => [...prev, EMPTY_MATCH()])
  }

  function removeMatch(id: string) {
    setMatches(prev => prev.filter(m => m.id !== id))
  }

  function update(id: string, field: keyof UpcomingMatch, value: string | boolean) {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const filled = matches.filter(m => m.date && m.opponent)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
      {/* Formulaire */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#1a1a2e]">Matchs à venir</h3>
          <span className="text-xs text-gray-400">{matches.length}/6 matchs</span>
        </div>

        <div className="space-y-3">
          {matches.map((m, i) => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Match {i + 1}</span>
                {matches.length > 1 && (
                  <button
                    onClick={() => removeMatch(m.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition"
                  >
                    Supprimer
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {/* Domicile / Extérieur */}
                <div className="flex gap-2">
                  {[{ val: true, label: '🏟️ Dom.' }, { val: false, label: '✈️ Ext.' }].map(opt => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => update(m.id, 'isHome', opt.val)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        m.isHome === opt.val
                          ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
                          : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={m.date}
                      onChange={e => update(m.id, 'date', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#e94560]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Compétition</label>
                    <input
                      type="text"
                      value={m.competition}
                      onChange={e => update(m.id, 'competition', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#e94560]/30"
                      placeholder="Championnat..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Adversaire</label>
                  <input
                    type="text"
                    value={m.opponent}
                    onChange={e => update(m.id, 'opponent', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#e94560]/30"
                    placeholder="Ex: Stade Nîmois"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {matches.length < 6 && (
          <button
            onClick={addMatch}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-[#e94560] hover:text-[#e94560] transition"
          >
            + Ajouter un match
          </button>
        )}

        {filled.length > 0 && (
          <div className="bg-[#1a1a2e]/5 rounded-xl p-3 text-xs text-[#1a1a2e]">
            <p className="font-semibold">✅ {filled.length} match{filled.length > 1 ? 's' : ''} prêt{filled.length > 1 ? 's' : ''} pour le visuel</p>
            <p className="text-gray-500 mt-0.5">Le visuel se met à jour automatiquement à droite</p>
          </div>
        )}
      </div>

      {/* Visuel en temps réel */}
      <div>
        <ScheduleGenerator club={club} matches={filled} />
      </div>
    </div>
  )
}
