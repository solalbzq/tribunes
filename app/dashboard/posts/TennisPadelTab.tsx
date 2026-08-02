'use client'

import { useState, useRef } from 'react'
import type { TournamentMatch } from '@/lib/services/fft-pdf-parser'
import GenerateForm, { type MatchFormInitialValues } from '../GenerateForm'
import PostsResult from '../PostsResult'
import VisualGenerator from '../VisualGenerator'
import TennisProgrammeSection from './TennisProgrammeSection'
import TennisResultSection from './TennisResultSection'
import TennisActions from './TennisActions'
import TennisVisualGenerator, { type TennisVisualConfig, DEFAULT_TENNIS_CONFIG } from './TennisVisualGenerator'
import ToneSelector from '../ToneSelector'
import SeasonRecapTab, { type SeasonRecapFormInitialValues } from '../SeasonRecapTab'
import MatchAnnouncementTab, { type AnnouncementFormInitialValues } from '../MatchAnnouncementTab'
import PlayerSpotlightTab, { type PlayerSpotlightFormInitialValues } from '../PlayerSpotlightTab'
import ClubAnnouncementTab, { type ClubAnnouncementFormInitialValues } from '../ClubAnnouncementTab'
import EngagementPollTab, { type EngagementPollFormInitialValues } from '../EngagementPollTab'
import CustomPostTab, { type CustomPostFormInitialValues } from '../CustomPostTab'
import DescribeIntentTab from '../DescribeIntentTab'
import { PageHeader, Segmented, GhostButton } from '../ui'
import { Icon } from '../icons'
import { ErrorNotice, toUiError, type UiError } from '../apiError'

type Club = {
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  tennisVisualConfig?: TennisVisualConfig | null
  tenupUrl?: string | null
}
type Platform = 'instagram' | 'facebook'
type MatchData = {
  opponent: string
  homeScore: number
  awayScore: number
  isHome: boolean
  competition: string
  extraData?: Record<string, unknown>
}
type PostIds = Partial<Record<'instagram' | 'facebook', string>>

const PLATFORMS: { key: Platform; label: string; emoji: string }[] = [
  { key: 'instagram', label: 'Instagram', emoji: '' },
  { key: 'facebook',  label: 'Facebook',  emoji: '' },
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
    <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-4">
      <div className="flex gap-2">
        {PLATFORMS.filter(p => posts[p.key]).map(p => (
          <button key={p.key} onClick={() => setTab(p.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${tab === p.key ? 'bg-[#111827] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {p.label}
          </button>
        ))}
        <button onClick={copy}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition"
          style={{ background: copied ? '#22c55e' : '#2563eb' }}>
          {copied ? '✓ Copié' : 'Copier'}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-xl p-4 max-h-80 overflow-y-auto font-sans">
        {posts[tab]}
      </pre>
    </div>
  )
}

function MatchSection({ club, initialValues }: { club: Club; initialValues?: MatchFormInitialValues }) {
  const [generatedPosts, setGeneratedPosts] = useState<{ instagram: string; facebook: string } | null>(null)
  const [generatedPostIds, setGeneratedPostIds] = useState<PostIds | null>(null)
  const [generatedMatch, setGeneratedMatch] = useState<MatchData | null>(null)
  const [generatedMatchId, setGeneratedMatchId] = useState<string | null>(null)
  const [generatedPhoto, setGeneratedPhoto] = useState<File | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const [bannedWordsWarning, setBannedWordsWarning] = useState<Record<string, string[]> | null>(null)

  async function personalizeMatch(overrides: { tone?: string; customInstructions?: string }) {
    if (!generatedMatch || !generatedMatchId) return
    setPersonalizing(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generatedMatch,
          matchId: generatedMatchId,
          regenerate: true,
          tone: overrides.tone,
          customInstructions: overrides.customInstructions,
        }),
      })
      const data = await res.json()
      if (!res.ok) return
      setGeneratedPosts(data.posts)
      const postIds = Object.fromEntries(
        ((data.match?.posts as Array<{ id: string; platform: keyof PostIds }> | undefined) ?? [])
          .map(post => [post.platform, post.id])
      ) as PostIds
      setGeneratedPostIds(postIds)
      setBannedWordsWarning(data.bannedWordsWarning ?? null)
    } finally {
      setPersonalizing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon="target"
        title="Post de match"
        subtitle="Créez un post de résultat avec son visuel, aux couleurs de votre club."
      />

      {!generatedPosts && !generatedMatch && (
        <GenerateForm
          club={club}
          initialValues={initialValues}
          onSuccess={(posts, match, photo, postIds, matchId, warning) => {
            setGeneratedPosts(posts)
            setGeneratedPostIds(postIds)
            setGeneratedMatch(match)
            setGeneratedMatchId(matchId)
            setGeneratedPhoto(photo)
            setBannedWordsWarning(warning)
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
            <PageHeader icon="image" title="Votre visuel est prêt" tone="gold" />
            <GhostButton icon="arrowLeft" onClick={() => { setGeneratedMatch(null); setGeneratedPhoto(null) }}>
              Nouveau match
            </GhostButton>
          </div>
          <VisualGenerator club={club} match={generatedMatch} photoFile={generatedPhoto} />
        </div>
      )}

      {generatedPosts && generatedMatch && (
        <PostsResult
          posts={generatedPosts}
          postIds={generatedPostIds}
          club={club}
          match={generatedMatch}
          photoFile={generatedPhoto}
          onPersonalize={personalizeMatch}
          personalizing={personalizing}
          bannedWordsWarning={bannedWordsWarning}
          onReset={() => {
            setGeneratedPosts(null)
            setGeneratedPostIds(null)
            setGeneratedMatch(null)
            setGeneratedMatchId(null)
            setGeneratedPhoto(null)
            setBannedWordsWarning(null)
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
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram', 'facebook'])
  const [tone, setTone] = useState('')
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
  const [error, setError] = useState<UiError>(null)
  const [bannedWordsWarning, setBannedWordsWarning] = useState<Record<string, string[]> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  async function getImageBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  async function handleParse() {
    if (!file) return
    setParsing(true); setError(null); setPosts(null); setShowVisualOnly(false)
    const fd = new FormData()
    fd.append('pdfFile', file)
    fd.append('clubName', clubNameFilter)
    const res = await fetch('/api/posts/tennis/tournament/parse', { method: 'POST', body: fd })
    const data = await res.json()
    setParsing(false)
    if (!res.ok) { setError(toUiError(data, 'Analyse du PDF impossible')); return }
    setParseResult({ ...data, venue: data.venue ?? '' })
  }

  async function handleGenerate(regenerate = false) {
    if (!parseResult) return
    setGenerating(true); setError(null)
    const res = await fetch('/api/posts/tennis/tournament/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId: parseResult.scheduleId, platforms, grade, regenerate, tone: tone || undefined }),
    })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) { setError(toUiError(data, 'Génération impossible')); return }
    setPosts(data.posts)
    setBannedWordsWarning(data.bannedWordsWarning ?? null)
  }

  function togglePlatform(p: Platform) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-5">
        <PageHeader
          icon="fileText"
          title={isPadel ? 'Tournoi FFT Padel' : 'Tournoi FFT Tennis'}
          subtitle="Importez la fiche de programmation, on en extrait vos matchs."
        />

        {/* Upload PDF */}
        <div>
          <label className="text-sm font-semibold text-[#111827] block mb-2">Fiche de programmation FFT (PDF)</label>
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#2563eb] transition">
            {file ? (
              <div>
                <p className="font-semibold text-[#111827]">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} Ko</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Icon name="upload" className="mx-auto h-7 w-7 text-muted" />
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
            <label className="text-sm font-semibold text-[#111827] block mb-1">Nom à filtrer dans le PDF</label>
            <input type="text" value={clubNameFilter} onChange={e => setClubNameFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
          </div>
          {isPadel && (
            <div>
              <label className="text-sm font-semibold text-[#111827] block mb-1">Grade du tournoi</label>
              <select value={grade} onChange={e => setGrade(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
                {['P25', 'P100', 'P250', 'P500', 'P1000', 'Open'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          )}
        </div>

        <button onClick={handleParse} disabled={!file || parsing}
          className="w-full py-3 bg-[#111827] text-white font-bold rounded-xl hover:bg-[#1f2937] transition disabled:opacity-60">
          {parsing ? 'Analyse du PDF...' : 'Analyser le PDF'}
        </button>
      </div>

      {/* Parse results */}
      {parseResult && (
        <div className="bg-white rounded-card border border-line shadow-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-[#111827]">{parseResult.tournamentName}</h4>
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
                      <td className="py-2 pr-3 font-mono font-semibold text-[#111827]">{m.time}</td>
                      <td className="py-2 pr-3 text-gray-600">{m.court}</td>
                      <td className="py-2 pr-3 text-gray-600">{m.category}</td>
                      <td className="py-2 pr-3 text-gray-600">{m.round}</td>
                      <td className="py-2 text-gray-800">
                        <span className="font-semibold text-[#2563eb]">
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
                <label className="text-sm font-semibold text-[#111827] block mb-2">Plateformes</label>
                <div className="flex gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.key} type="button" onClick={() => togglePlatform(p.key)}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${platforms.includes(p.key) ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <ToneSelector value={tone} onChange={setTone} />
              <div className="flex gap-3">
                <button onClick={() => handleGenerate(false)} disabled={generating || platforms.length === 0}
                  className="flex-1 py-3 bg-[#2563eb] text-white font-bold rounded-xl hover:bg-[#1d4ed8] transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {generating ? <><Icon name="refresh" className="h-[18px] w-[18px] animate-spin" /> Génération en cours...</> : 'Générer les posts'}
                </button>
                {posts && (
                  <button onClick={() => handleGenerate(true)} disabled={generating}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 text-[#111827] font-bold rounded-xl hover:bg-gray-200 transition text-sm whitespace-nowrap"
                    title="Régénérer de nouveaux textes (rappelle l'IA)">
                    <Icon name="refresh" className="h-4 w-4" /> Régénérer
                  </button>
                )}
                <button onClick={() => setShowVisualOnly(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-gray-100 text-[#111827] font-bold rounded-xl hover:bg-gray-200 transition text-sm whitespace-nowrap">
                  <Icon name="image" className="h-4 w-4" /> Visuel seul
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {bannedWordsWarning && Object.keys(bannedWordsWarning).length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Expression à éviter détectée</p>
          <p className="mt-1">
            {Object.entries(bannedWordsWarning).map(([platform, words]) => (
              <span key={platform} className="block">{platform} : {words.join(', ')}</span>
            ))}
          </p>
          <p className="mt-1 text-xs text-amber-700">La publication automatique est désactivée pour ce contenu.</p>
        </div>
      )}
      {posts && <PostDisplay posts={posts} />}
      {(showVisualOnly || posts) && parseResult && parseResult.clubMatches.length > 0 && (
        <>
          <TennisVisualGenerator
            club={club}
            matches={parseResult.clubMatches}
            tournamentName={parseResult.tournamentName}
            matchDate={new Date(parseResult.matchDate)}
            label={`Tournoi · ${new Date(parseResult.matchDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
            config={club.tennisVisualConfig ?? DEFAULT_TENNIS_CONFIG}
            onCanvasReady={c => { canvasRef.current = c }}
          />
          <TennisActions
            getImageBlob={getImageBlob}
            defaultCaption={`${parseResult.tournamentName} : retrouvez nos joueurs engagés ! 🎾`}
            aiPosts={posts ? (posts as { instagram: string; facebook: string }) : null}
            filename="tournoi-tennis"
          />
        </>
      )}
      <ErrorNotice error={error} />
    </div>
  )
}


// ── Main component ─────────────────────────────────────────────────────────

type Section = 'match' | 'programme' | 'tournament' | 'results' | 'recap' | 'announcement' | 'spotlight' | 'club' | 'poll' | 'customPost'
type Mode = 'assistant' | 'manual'
type DescribeTarget = 'match' | 'announcement' | 'clubAnnouncement' | 'playerSpotlight' | 'seasonRecap' | 'engagementPoll' | 'customPost'

type Prefill =
  | { target: 'match'; values: MatchFormInitialValues; sourceText: string }
  | { target: 'announcement'; values: AnnouncementFormInitialValues; sourceText: string }
  | { target: 'clubAnnouncement'; values: ClubAnnouncementFormInitialValues; sourceText: string }
  | { target: 'playerSpotlight'; values: PlayerSpotlightFormInitialValues; sourceText: string }
  | { target: 'seasonRecap'; values: SeasonRecapFormInitialValues; sourceText: string }
  | { target: 'engagementPoll'; values: EngagementPollFormInitialValues; sourceText: string }
  | { target: 'customPost'; values: CustomPostFormInitialValues; sourceText: string }

const TARGET_TO_SECTION: Record<DescribeTarget, Section> = {
  match: 'match',
  announcement: 'announcement',
  clubAnnouncement: 'club',
  playerSpotlight: 'spotlight',
  seasonRecap: 'recap',
  engagementPoll: 'poll',
  customPost: 'customPost',
}

function SourceTextBanner({ sourceText, onClear }: { sourceText: string; onClear: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-brand/20 bg-brand-soft/40 p-3">
      <div className="flex items-start gap-2 min-w-0">
        <Icon name="sparkles" className="h-4 w-4 shrink-0 mt-0.5 text-brand" />
        <p className="text-xs text-ink min-w-0 truncate">
          <span className="font-semibold">Formulaire prérempli à partir de :</span> « {sourceText} »
        </p>
      </div>
      <button type="button" onClick={onClear} className="shrink-0 text-xs font-semibold text-muted hover:text-ink">
        Effacer
      </button>
    </div>
  )
}

export default function TennisPadelTab({ club }: { club: Club }) {
  const [mode, setMode] = useState<Mode>('assistant')
  const [section, setSection] = useState<Section>('match')
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const sport = club.sport === 'Padel' ? 'Padel' : 'Tennis'

  function handleSectionChange(next: Section) {
    if (next !== section) setPrefill(null)
    setSection(next)
  }

  function handleApply(
    target: DescribeTarget,
    values: MatchFormInitialValues | AnnouncementFormInitialValues | ClubAnnouncementFormInitialValues | PlayerSpotlightFormInitialValues | SeasonRecapFormInitialValues | EngagementPollFormInitialValues | CustomPostFormInitialValues,
    sourceText: string
  ) {
    setPrefill({ target, values, sourceText } as Prefill)
    setSection(TARGET_TO_SECTION[target])
    setMode('manual')
  }

  if (mode === 'assistant') {
    return (
      <div className="max-w-5xl">
        <DescribeIntentTab onApply={handleApply} onSwitchToManual={() => setMode('manual')} />
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        icon="sparkles"
        title={`Générer du contenu ${sport}`}
        subtitle="Choisissez le type de contenu adapté à votre club."
        action={
          <GhostButton type="button" onClick={() => setMode('assistant')} icon="sparkles">
            Assistant
          </GhostButton>
        }
      />

      <Segmented
        value={section}
        onChange={handleSectionChange}
        items={[
          { key: 'match', label: 'Post de match', icon: 'target' },
          { key: 'programme', label: 'Programme', icon: 'calendar' },
          { key: 'tournament', label: 'Tournoi FFT', icon: 'fileText' },
          { key: 'results', label: 'Résultats', icon: 'trophy' },
          { key: 'recap', label: 'Bilan', icon: 'trending' },
          { key: 'announcement', label: 'Avant-match', icon: 'clock' },
          { key: 'spotlight', label: 'Joueur à l\'honneur', icon: 'user' },
          { key: 'club', label: 'Annonce du club', icon: 'users' },
          { key: 'poll', label: 'Engagement', icon: 'heart' },
          { key: 'customPost', label: 'Publication libre', icon: 'fileText' },
        ]}
      />

      {section === 'match' && (
        <div className="space-y-3">
          {prefill?.target === 'match' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <MatchSection club={club} initialValues={prefill?.target === 'match' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'programme' && <TennisProgrammeSection club={club} />}
      {section === 'tournament' && <TournamentSection club={club} />}
      {section === 'results' && <TennisResultSection club={club} />}
      {section === 'recap' && (
        <div className="space-y-3">
          {prefill?.target === 'seasonRecap' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <SeasonRecapTab club={club} initialValues={prefill?.target === 'seasonRecap' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'announcement' && (
        <div className="space-y-3">
          {prefill?.target === 'announcement' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <MatchAnnouncementTab club={club} initialValues={prefill?.target === 'announcement' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'spotlight' && (
        <div className="space-y-3">
          {prefill?.target === 'playerSpotlight' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <PlayerSpotlightTab club={club} initialValues={prefill?.target === 'playerSpotlight' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'club' && (
        <div className="space-y-3">
          {prefill?.target === 'clubAnnouncement' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <ClubAnnouncementTab club={club} initialValues={prefill?.target === 'clubAnnouncement' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'poll' && (
        <div className="space-y-3">
          {prefill?.target === 'engagementPoll' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <EngagementPollTab club={club} initialValues={prefill?.target === 'engagementPoll' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'customPost' && (
        <div className="space-y-3">
          {prefill?.target === 'customPost' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <CustomPostTab club={club} initialValues={prefill?.target === 'customPost' ? prefill.values : undefined} />
        </div>
      )}
    </div>
  )
}
