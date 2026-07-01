'use client'

import { useState, useRef } from 'react'

type Club = { name: string; sport: string }
type Posts = { instagram: string; facebook: string; whatsapp: string }
type MatchData = {
  opponent: string
  homeScore: number
  awayScore: number
  isHome: boolean
  competition: string
  extraData?: Record<string, unknown>
}

// ── Sport-specific extra fields ───────────────────────────────────────────

function FootballFields({ extra, set }: { extra: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Détails ⚽</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[#111827] block mb-1">Score mi-temps (nous)</label>
          <input type="number" min="0" placeholder="0"
            value={(extra.halfTimeHome as string) ?? ''}
            onChange={e => set('halfTimeHome', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#111827] block mb-1">Score mi-temps (eux)</label>
          <input type="number" min="0" placeholder="0"
            value={(extra.halfTimeAway as string) ?? ''}
            onChange={e => set('halfTimeAway', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-[#111827] block mb-1">Buteurs <span className="font-normal text-gray-400">(optionnel)</span></label>
        <input type="text" placeholder="Lucas 34', Mathieu 78' (pen)"
          value={(extra.scorers as string) ?? ''}
          onChange={e => set('scorers', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
      </div>
      <div>
        <label className="text-xs font-semibold text-[#111827] block mb-1">Cartons <span className="font-normal text-gray-400">(optionnel)</span></label>
        <input type="text" placeholder="Jaune: Pierre 56' / Rouge: -"
          value={(extra.cards as string) ?? ''}
          onChange={e => set('cards', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
      </div>
    </div>
  )
}

function TennisFields({ extra, set }: { extra: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Détails 🎾</p>
      <div>
        <label className="text-xs font-semibold text-[#111827] block mb-1">Détail des sets</label>
        <input type="text" placeholder="6-4, 3-6, 7-5"
          value={(extra.sets as string) ?? ''}
          onChange={e => set('sets', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[#111827] block mb-1">Format</label>
          <select value={(extra.format as string) ?? 'interclubs'}
            onChange={e => set('format', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
            <option value="interclubs">Interclubs</option>
            <option value="simple">Simple</option>
            <option value="double">Double</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#111827] block mb-1">Catégorie</label>
          <select value={(extra.matchType as string) ?? 'Hommes'}
            onChange={e => set('matchType', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
            <option>Hommes</option>
            <option>Femmes</option>
            <option>Mixte</option>
            <option>Jeunes</option>
            <option>Senior +35</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function BasketballFields({ extra, set }: { extra: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const quarters = [
    { key: 'q1', label: 'Q1' },
    { key: 'q2', label: 'Q2' },
    { key: 'q3', label: 'Q3' },
    { key: 'q4', label: 'Q4' },
  ]
  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quarts-temps 🏀</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {quarters.map(q => (
          <div key={q.key} className="space-y-1">
            <label className="text-xs font-semibold text-[#111827]">{q.label}</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" placeholder="0"
                value={(extra[`${q.key}Home`] as string) ?? ''}
                onChange={e => set(`${q.key}Home`, Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
              <span className="text-gray-300 font-bold">–</span>
              <input type="number" min="0" placeholder="0"
                value={(extra[`${q.key}Away`] as string) ?? ''}
                onChange={e => set(`${q.key}Away`, Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-[#111827]">Prolongation <span className="font-normal text-gray-400">(si applicable)</span></label>
        <div className="flex items-center gap-2">
          <input type="number" min="0" placeholder="0"
            value={(extra.otHome as string) ?? ''}
            onChange={e => set('otHome', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
          <span className="text-gray-300 font-bold">–</span>
          <input type="number" min="0" placeholder="0"
            value={(extra.otAway as string) ?? ''}
            onChange={e => set('otAway', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
        </div>
      </div>
    </div>
  )
}

function VolleyballFields({ extra, set }: { extra: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const sets = [
    { key: 's1', label: 'Set 1', required: true },
    { key: 's2', label: 'Set 2', required: true },
    { key: 's3', label: 'Set 3', required: false },
    { key: 's4', label: 'Set 4', required: false },
    { key: 's5', label: 'Set 5 (tie-break)', required: false },
  ]
  return (
    <div className="space-y-3 pt-2 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Points par set 🏐</p>
      <p className="text-xs text-gray-400">Le score final (sets remportés) est saisi dans le bloc score ci-dessus.</p>
      {sets.map(s => (
        <div key={s.key} className="space-y-1">
          <label className="text-xs font-semibold text-[#111827]">{s.label} {!s.required && <span className="font-normal text-gray-400">(optionnel)</span>}</label>
          <div className="flex items-center gap-2">
            <input type="number" min="0" placeholder="0"
              value={(extra[`${s.key}Home`] as string) ?? ''}
              onChange={e => set(`${s.key}Home`, Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
            <span className="text-gray-300 font-bold">–</span>
            <input type="number" min="0" placeholder="0"
              value={(extra[`${s.key}Away`] as string) ?? ''}
              onChange={e => set(`${s.key}Away`, Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
          </div>
        </div>
      ))}
    </div>
  )
}

function HandballFields({ extra, set }: { extra: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Détails 🤾</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[#111827] block mb-1">Mi-temps (nous)</label>
          <input type="number" min="0" placeholder="0"
            value={(extra.halfTimeHome as string) ?? ''}
            onChange={e => set('halfTimeHome', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#111827] block mb-1">Mi-temps (eux)</label>
          <input type="number" min="0" placeholder="0"
            value={(extra.halfTimeAway as string) ?? ''}
            onChange={e => set('halfTimeAway', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-[#111827] block mb-1">7 mètres <span className="font-normal text-gray-400">(optionnel)</span></label>
        <input type="text" placeholder="4/5 pour nous, 2/3 pour eux"
          value={(extra.sevenMeters as string) ?? ''}
          onChange={e => set('sevenMeters', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
      </div>
    </div>
  )
}

// ── Score label helpers ────────────────────────────────────────────────────

function scorePlaceholder(sport: string) {
  if (sport === 'Volleyball') return { unit: 'sets', hint: '(ex: 3–2)' }
  if (sport === 'Tennis') return { unit: 'matchs', hint: '(ex: 4–3)' }
  return { unit: 'buts / points', hint: '' }
}

function resultLabel(sport: string, myScore: number, oppScore: number): string {
  if (myScore > oppScore) return sport === 'Tennis' || sport === 'Volleyball' ? '🏆 Victoire !' : '🏆 Victoire !'
  if (myScore < oppScore) return '😤 Défaite'
  return '🤝 Nul'
}

// ── Main component ────────────────────────────────────────────────────────

export default function GenerateForm({
  club,
  onSuccess,
  onVisualOnly,
}: {
  club: Club
  onSuccess: (posts: Posts, match: MatchData, photoFile: File | null) => void
  onVisualOnly: (match: MatchData, photoFile: File | null) => void
}) {
  const [opponent, setOpponent] = useState('')
  const [isHome, setIsHome] = useState(true)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [competition, setCompetition] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingVisual, setLoadingVisual] = useState(false)
  const [error, setError] = useState('')
  const [extra, setExtraState] = useState<Record<string, unknown>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const sport = club.sport
  const { unit, hint } = scorePlaceholder(sport)

  function setExtra(k: string, v: unknown) {
    setExtraState(prev => ({ ...prev, [k]: v }))
  }

  function getMatchData(): MatchData {
    return {
      opponent,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      isHome,
      competition,
      extraData: Object.keys(extra).length ? extra : undefined,
    }
  }

  function handleVisualOnly() {
    if (!opponent || homeScore === '' || awayScore === '') return
    setLoadingVisual(true)
    onVisualOnly(getMatchData(), photoFile)
    setLoadingVisual(false)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponent,
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
          isHome,
          competition,
          date,
          notes,
          extraData: Object.keys(extra).length ? extra : undefined,
        }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      const data = await res.json()
      onSuccess(data.posts, getMatchData(), photoFile)
    } catch {
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  const myScore = isHome ? Number(homeScore) : Number(awayScore)
  const oppScore = isHome ? Number(awayScore) : Number(homeScore)
  const hasScore = homeScore !== '' && awayScore !== ''

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-xl">
      <h2 className="text-xl font-extrabold text-[#111827] mb-6">
        Nouveau match — {club.name}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Domicile / Extérieur */}
        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-2">Où jouiez-vous ?</label>
          <div className="flex gap-3">
            {[{ val: true, label: '🏟️ Domicile' }, { val: false, label: '✈️ Extérieur' }].map(opt => (
              <button key={String(opt.val)} type="button" onClick={() => setIsHome(opt.val)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  isHome === opt.val
                    ? 'bg-[#111827] text-white border-[#111827]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Adversaire */}
        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-1">Adversaire</label>
          <input type="text" required value={opponent} onChange={e => setOpponent(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            placeholder="Ex: Stade Nîmois" />
        </div>

        {/* Score */}
        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-2">
            Score final <span className="font-normal text-gray-400 text-xs">{hint}</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500 mb-1 truncate">{isHome ? club.name : opponent || 'Adversaire'}</p>
              <input type="number" min="0" required
                value={isHome ? homeScore : awayScore}
                onChange={e => isHome ? setHomeScore(e.target.value) : setAwayScore(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                placeholder="0" />
            </div>
            <span className="text-2xl font-extrabold text-gray-300">-</span>
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500 mb-1 truncate">{isHome ? opponent || 'Adversaire' : club.name}</p>
              <input type="number" min="0" required
                value={isHome ? awayScore : homeScore}
                onChange={e => isHome ? setAwayScore(e.target.value) : setHomeScore(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                placeholder="0" />
            </div>
          </div>
          {hasScore && (
            <p className={`text-center text-sm font-bold mt-2 ${
              myScore > oppScore ? 'text-[#22c55e]' :
              myScore < oppScore ? 'text-[#2563eb]' : 'text-gray-400'
            }`}>
              {resultLabel(sport, myScore, oppScore)}
            </p>
          )}
        </div>

        {/* Compétition + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[#111827] mb-1">Compétition</label>
            <input type="text" value={competition} onChange={e => setCompetition(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              placeholder="Championnat D2..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#111827] mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
          </div>
        </div>

        {/* ── Sport-specific extra fields */}
        {sport === 'Football'   && <FootballFields   extra={extra} set={setExtra} />}
        {sport === 'Tennis'     && <TennisFields     extra={extra} set={setExtra} />}
        {sport === 'Basketball' && <BasketballFields extra={extra} set={setExtra} />}
        {sport === 'Volleyball' && <VolleyballFields extra={extra} set={setExtra} />}
        {sport === 'Handball'   && <HandballFields   extra={extra} set={setExtra} />}

        {/* Photo */}
        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-2">
            Photo du match <span className="font-normal text-gray-400">(optionnel — pour le visuel)</span>
          </label>
          <div className="flex items-center gap-4">
            <div onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#2563eb] transition shrink-0">
              {photoPreview
                ? <img src={photoPreview} alt="aperçu" className="w-full h-full object-cover" />
                : <span className="text-2xl">📷</span>}
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-sm font-semibold text-[#2563eb] hover:underline">
                {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">Sera utilisée en fond du visuel généré</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-1">
            Notes <span className="font-normal text-gray-400">(optionnel)</span>
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 resize-none"
            placeholder={
              sport === 'Football' ? "Ex: But décisif de Lucas à la 89e, ambiance incroyable..." :
              sport === 'Basketball' ? "Ex: On a renversé le match au 4e quart !" :
              sport === 'Volleyball' ? "Ex: Match très serré, tie-break haletant..." :
              sport === 'Tennis' ? "Ex: Belle performance de l'équipe face à un adversaire solide..." :
              sport === 'Handball' ? "Ex: Gardien extraordinaire, 12 arrêts décisifs..." :
              "Infos supplémentaires..."
            } />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading || loadingVisual}
            className="flex-1 bg-[#2563eb] text-white font-bold py-3.5 rounded-xl hover:bg-[#1d4ed8] transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><span className="animate-spin">⚡</span> L'IA génère tes posts...</> : '✨ Posts + Visuel'}
          </button>
          <button type="button" onClick={handleVisualOnly}
            disabled={loading || loadingVisual || !opponent || homeScore === '' || awayScore === ''}
            className="px-4 py-3.5 bg-[#111827] text-white font-bold rounded-xl hover:bg-[#1f2937] transition disabled:opacity-40 text-sm whitespace-nowrap">
            🖼️ Visuel seul
          </button>
        </div>
      </form>
    </div>
  )
}
