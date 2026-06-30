'use client'

import { useState, useRef } from 'react'
import type { TournamentMatch } from '@/lib/services/fft-pdf-parser'
import GenerateForm from '../GenerateForm'
import PostsResult from '../PostsResult'
import ProgrammeTab from '../ProgrammeTab'
import VisualGenerator from '../VisualGenerator'
import TennisVisualGenerator, { type TennisVisualConfig, DEFAULT_TENNIS_CONFIG } from './TennisVisualGenerator'

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  tennisVisualConfig?: TennisVisualConfig | null
}
type Platform = 'instagram' | 'facebook' | 'whatsapp'
type MatchData = {
  opponent: string
  homeScore: number
  awayScore: number
  isHome: boolean
  competition: string
  extraData?: Record<string, unknown>
}

const PLATFORMS: { key: Platform; label: string; emoji: string }[] = [
  { key: 'instagram', label: 'Instagram', emoji: '📸' },
  { key: 'facebook',  label: 'Facebook',  emoji: '👥' },
  { key: 'whatsapp',  label: 'WhatsApp',  emoji: '💬' },
]

function PostDisplay({ posts }: { posts: Record<string, string> }) {
  const [tab, setTab] = useState<Platform>('instagram')
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(posts[tab] ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div className="flex gap-2">
        {PLATFORMS.filter(p => posts[p.key]).map(p => (
          <button key={p.key} onClick={() => setTab(p.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${tab === p.key ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {p.emoji} {p.label}
          </button>
        ))}
        <button onClick={copy}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition"
          style={{ background: copied ? '#10b981' : '#e94560' }}>
          {copied ? '✓ Copié' : '📋 Copier'}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-xl p-4 max-h-80 overflow-y-auto font-sans">
        {posts[tab]}
      </pre>
    </div>
  )
}

function MatchSection({ club }: { club: Club }) {
  const [generatedPosts, setGeneratedPosts] = useState<{ instagram: string; facebook: string; whatsapp: string } | null>(null)
  const [generatedMatch, setGeneratedMatch] = useState<MatchData | null>(null)
  const [generatedPhoto, setGeneratedPhoto] = useState<File | null>(null)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-bold text-[#1a1a2e]">🏟️ Post de match</h3>
        <p className="text-sm text-gray-500 mt-1">
          Cree rapidement un post de resultat avec son visuel pour ton club.
        </p>
      </div>

      {!generatedPosts && !generatedMatch && (
        <GenerateForm
          club={club}
          onSuccess={(posts, match, photo) => {
            setGeneratedPosts(posts)
            setGeneratedMatch(match)
            setGeneratedPhoto(photo)
          }}
          onVisualOnly={(match, photo) => {
            setGeneratedMatch(match)
            setGeneratedPhoto(photo)
          }}
        />
      )}

      {!generatedPosts && generatedMatch && (
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-[#1a1a2e]">Ton visuel est pret 🖼️</h2>
            <button
              onClick={() => {
                setGeneratedMatch(null)
                setGeneratedPhoto(null)
              }}
              className="text-sm text-gray-500 hover:text-[#e94560] transition"
            >
              ← Nouveau match
            </button>
          </div>
          <VisualGenerator club={club} match={generatedMatch} photoFile={generatedPhoto} />
        </div>
      )}

      {generatedPosts && generatedMatch && (
        <PostsResult
          posts={generatedPosts}
          club={club}
          match={generatedMatch}
          photoFile={generatedPhoto}
          onReset={() => {
            setGeneratedPosts(null)
            setGeneratedMatch(null)
            setGeneratedPhoto(null)
          }}
        />
      )}
    </div>
  )
}

// ── SECTION 1 : Programmation Tournoi ─────────────────────────────────────

function TournamentSection({ club }: { club: Club }) {
  const isPadel = club.sport === 'Padel'
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [clubNameFilter, setClubNameFilter] = useState(club.name)
  const [grade, setGrade] = useState('P100')
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram', 'facebook', 'whatsapp'])
  const [parsing, setParsing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [parseResult, setParseResult] = useState<{
    scheduleId: string
    tournamentName: string
    venue: string
    matchDate: string
    clubMatches: TournamentMatch[]
  } | null>(null)
  const [posts, setPosts] = useState<Record<string, string> | null>(null)
  const [showVisualOnly, setShowVisualOnly] = useState(false)
  const [error, setError] = useState('')

  async function handleParse() {
    if (!file) return
    setParsing(true); setError(''); setPosts(null); setShowVisualOnly(false)
    const fd = new FormData()
    fd.append('pdfFile', file)
    fd.append('clubName', clubNameFilter)
    const res = await fetch('/api/posts/tennis/tournament/parse', { method: 'POST', body: fd })
    const data = await res.json()
    setParsing(false)
    if (!res.ok) { setError(data.error); return }
    setParseResult({ ...data, venue: data.venue ?? '' })
  }

  async function handleGenerate() {
    if (!parseResult) return
    setGenerating(true); setError('')
    const res = await fetch('/api/posts/tennis/tournament/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId: parseResult.scheduleId, platforms, grade }),
    })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) { setError(data.error); return }
    setPosts(data.posts)
  }

  function togglePlatform(p: Platform) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h3 className="font-bold text-[#1a1a2e]">
          {isPadel ? '🎾 Programmation tournoi FFT Padel' : '🎾 Programmation tournoi FFT Tennis'}
        </h3>

        {/* Upload PDF */}
        <div>
          <label className="text-sm font-semibold text-[#1a1a2e] block mb-2">Fiche de programmation FFT (PDF)</label>
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#e94560] transition">
            {file ? (
              <div>
                <p className="font-semibold text-[#1a1a2e]">📄 {file.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} Ko</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-3xl">📂</p>
                <p className="text-sm text-gray-500">Glissez le PDF FFT ici ou cliquez pour sélectionner</p>
                <p className="text-xs text-gray-400">PDF uniquement · max 10 Mo</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setParseResult(null); setPosts(null) } }} />
        </div>

        {/* Club name filter */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-[#1a1a2e] block mb-1">Nom à filtrer dans le PDF</label>
            <input type="text" value={clubNameFilter} onChange={e => setClubNameFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560]/30" />
          </div>
          {isPadel && (
            <div>
              <label className="text-sm font-semibold text-[#1a1a2e] block mb-1">Grade du tournoi</label>
              <select value={grade} onChange={e => setGrade(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560]/30">
                {['P25', 'P100', 'P250', 'P500', 'P1000', 'Open'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          )}
        </div>

        <button onClick={handleParse} disabled={!file || parsing}
          className="w-full py-3 bg-[#1a1a2e] text-white font-bold rounded-xl hover:bg-[#2a2a4e] transition disabled:opacity-60">
          {parsing ? '⏳ Analyse du PDF...' : '🔍 Analyser le PDF'}
        </button>
      </div>

      {/* Parse results */}
      {parseResult && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-[#1a1a2e]">{parseResult.tournamentName}</h4>
              <p className="text-sm text-gray-500">{new Date(parseResult.matchDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <span className="text-sm bg-green-50 text-green-700 font-semibold px-3 py-1 rounded-full">
              {parseResult.clubMatches.length} match{parseResult.clubMatches.length > 1 ? 's' : ''} trouvé{parseResult.clubMatches.length > 1 ? 's' : ''}
            </span>
          </div>

          {parseResult.clubMatches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 pr-3">Heure</th>
                    <th className="pb-2 pr-3">Court</th>
                    <th className="pb-2 pr-3">Catégorie</th>
                    <th className="pb-2 pr-3">Tour</th>
                    <th className="pb-2">Joueurs</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.clubMatches.map((m, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-3 font-mono font-semibold text-[#1a1a2e]">{m.time}</td>
                      <td className="py-2 pr-3 text-gray-600">{m.court}</td>
                      <td className="py-2 pr-3 text-gray-600">{m.category}</td>
                      <td className="py-2 pr-3 text-gray-600">{m.round}</td>
                      <td className="py-2 text-gray-800">
                        <span className="font-semibold text-[#e94560]">
                          {m.player1}{m.player1Partner ? ` / ${m.player1Partner}` : ''}
                        </span>
                        {' vs '}
                        {m.player2}{m.player2Partner ? ` / ${m.player2Partner}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-4">
              Aucun match trouvé pour "{clubNameFilter}". Vérifie l'orthographe du nom de club dans le PDF.
            </p>
          )}

          {parseResult.clubMatches.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div>
                <label className="text-sm font-semibold text-[#1a1a2e] block mb-2">Plateformes</label>
                <div className="flex gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.key} type="button" onClick={() => togglePlatform(p.key)}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${platforms.includes(p.key) ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleGenerate} disabled={generating || platforms.length === 0}
                  className="flex-1 py-3 bg-[#e94560] text-white font-bold rounded-xl hover:bg-[#d63a52] transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {generating ? <><span className="animate-spin">⚡</span> Génération en cours...</> : '✨ Générer les posts'}
                </button>
                <button onClick={() => setShowVisualOnly(true)}
                  className="px-5 py-3 bg-gray-100 text-[#1a1a2e] font-bold rounded-xl hover:bg-gray-200 transition text-sm whitespace-nowrap">
                  🖼️ Visuel seul
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {posts && <PostDisplay posts={posts} />}
      {(showVisualOnly || posts) && parseResult && parseResult.clubMatches.length > 0 && (
        <TennisVisualGenerator
          club={club}
          matches={parseResult.clubMatches}
          tournamentName={parseResult.tournamentName}
          matchDate={new Date(parseResult.matchDate)}
          label={`Tournoi · ${new Date(parseResult.matchDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
          config={club.tennisVisualConfig ?? DEFAULT_TENNIS_CONFIG}
        />
      )}
      {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl p-4">{error}</p>}
    </div>
  )
}

// ── SECTION 2 : Programme de la semaine ───────────────────────────────────

function WeeklySection({ club }: { club: Club }) {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return d.toISOString().split('T')[0]
  })
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState<Record<string, string> | null>(null)
  const [weekMatches, setWeekMatches] = useState<TournamentMatch[]>([])
  const [error, setError] = useState('')

  async function generate() {
    setGenerating(true); setError('')
    const res = await fetch('/api/posts/tennis/interclub/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart }),
    })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) { setError(data.error); return }
    setPosts(data.posts)
    // Convert weekly matches to TournamentMatch shape for visual
    if (data.matches) {
      setWeekMatches(data.matches.map((m: { teamName: string; opponent: string; day: string; time: string; division: string }) => ({
        time: m.time ?? '',
        court: '',
        player1: m.teamName,
        club1: '',
        ranking1: '',
        player2: m.opponent,
        club2: '',
        ranking2: '',
        category: m.division ?? '',
        round: m.day ?? '',
        score: '',
        isPadelPair: false,
        isClubPlayer: true,
        isBye: false,
        isWalkover: false,
      })))
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-bold text-[#1a1a2e]">📅 Programme interclubs de la semaine</h3>
        <p className="text-sm text-gray-500">
          Génère un post regroupant tous les matchs interclubs de la semaine sélectionnée, saisis dans l'onglet Générateur.
        </p>
        <div>
          <label className="text-sm font-semibold text-[#1a1a2e] block mb-1">Semaine du (lundi)</label>
          <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560]/30" />
        </div>
        <button onClick={generate} disabled={generating}
          className="w-full py-3 bg-[#e94560] text-white font-bold rounded-xl hover:bg-[#d63a52] transition disabled:opacity-60 flex items-center justify-center gap-2">
          {generating ? <><span className="animate-spin">⚡</span> Génération...</> : '✨ Générer le programme'}
        </button>
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3">{error}</p>}
      </div>
      {posts && <PostDisplay posts={posts} />}
      {posts && weekMatches.length > 0 && (
        <TennisVisualGenerator
          club={club}
          matches={weekMatches}
          tournamentName={`Programme interclubs`}
          matchDate={new Date(weekStart)}
          label="Programme de la semaine"
          config={club.tennisVisualConfig ?? DEFAULT_TENNIS_CONFIG}
        />
      )}
    </div>
  )
}

// ── SECTION 3 : Résultats interclubs ──────────────────────────────────────

function ResultsSection({ club }: { club: Club }) {
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<Array<{
    id: string; date: string; opponent: string; globalScore: string
    teamName: string | null; division: string | null
    hasPosts: boolean
  }>>([])
  const [posts, setPosts] = useState<Record<string, Record<string, string>>>({})
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function loadMatches() {
    setLoading(true)
    const res = await fetch('/api/posts/tennis/interclub/matches')
    if (res.ok) {
      const data = await res.json()
      setMatches(data)
    }
    setLoading(false)
  }

  async function generateResult(matchId: string) {
    setGenerating(matchId); setError('')
    const res = await fetch('/api/posts/tennis/interclub/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchResultId: matchId }),
    })
    const data = await res.json()
    setGenerating(null)
    if (!res.ok) { setError(data.error); return }
    setPosts(prev => ({ ...prev, [matchId]: data.posts }))
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#1a1a2e]">🏆 Résultats interclubs</h3>
          <button onClick={loadMatches} disabled={loading}
            className="px-4 py-2 bg-[#1a1a2e] text-white text-sm font-semibold rounded-xl hover:bg-[#2a2a4e] transition disabled:opacity-60">
            {loading ? '...' : '🔄 Charger'}
          </button>
        </div>

        {matches.length === 0 && !loading && (
          <p className="text-sm text-gray-400 text-center py-4">
            Clique sur "Charger" pour voir les matchs interclubs récents.
          </p>
        )}

        {matches.map(m => (
          <div key={m.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#1a1a2e]">
                  {m.teamName ?? club.name} <span className="text-[#e94560] font-bold">{m.globalScore}</span> {m.opponent}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(m.date).toLocaleDateString('fr-FR')} · {m.division ?? ''}
                </p>
              </div>
              {!posts[m.id] && (
                <button onClick={() => generateResult(m.id)} disabled={generating === m.id}
                  className="px-3 py-2 bg-[#e94560] text-white text-sm font-semibold rounded-xl hover:bg-[#d63a52] transition disabled:opacity-60 whitespace-nowrap">
                  {generating === m.id ? '⏳...' : '✨ Générer'}
                </button>
              )}
            </div>
            {posts[m.id] && <PostDisplay posts={posts[m.id]} />}
          </div>
        ))}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TennisPadelTab({ club }: { club: Club }) {
  const [section, setSection] = useState<'match' | 'programme' | 'tournament' | 'weekly' | 'results'>('match')
  const sport = club.sport === 'Padel' ? 'Padel' : 'Tennis'
  const emoji = sport === 'Padel' ? '🏸' : '🎾'

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <h2 className="text-xl font-extrabold text-[#1a1a2e]">Generer du contenu {sport}</h2>
          <p className="text-sm text-gray-500">Choisis le type de contenu adapte a ton club.</p>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { key: 'match', label: '🏟️ Post match' },
          { key: 'programme', label: '📅 Programme' },
          { key: 'tournament', label: `📄 Tournoi FFT` },
          { key: 'weekly',     label: `📅 Semaine` },
          { key: 'results',    label: `🏆 Résultats` },
        ].map(s => (
          <button key={s.key} onClick={() => setSection(s.key as typeof section)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${section === s.key ? 'bg-white text-[#1a1a2e] shadow-sm' : 'text-gray-600 hover:text-[#1a1a2e]'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'match'      && <MatchSection      club={club} />}
      {section === 'programme'  && <ProgrammeTab      club={club} />}
      {section === 'tournament' && <TournamentSection club={club} />}
      {section === 'weekly'     && <WeeklySection     club={club} />}
      {section === 'results'    && <ResultsSection    club={club} />}
    </div>
  )
}
