'use client'

import { useState } from 'react'
import GenerateForm, { type MatchFormInitialValues } from './GenerateForm'
import PostsResult from './PostsResult'
import ProgrammeTab from './ProgrammeTab'
import TournamentTab from './TournamentTab'
import SeasonRecapTab, { type SeasonRecapFormInitialValues } from './SeasonRecapTab'
import MatchAnnouncementTab, { type AnnouncementFormInitialValues } from './MatchAnnouncementTab'
import PlayerSpotlightTab, { type PlayerSpotlightFormInitialValues } from './PlayerSpotlightTab'
import ClubAnnouncementTab, { type ClubAnnouncementFormInitialValues } from './ClubAnnouncementTab'
import EngagementPollTab, { type EngagementPollFormInitialValues } from './EngagementPollTab'
import CustomPostTab, { type CustomPostFormInitialValues } from './CustomPostTab'
import DescribeIntentTab from './DescribeIntentTab'
import VisualGenerator from './VisualGenerator'
import FormatToggle from './FormatToggle'
import type { VisualFormat } from '@/lib/visualLayout'
import TennisPadelTab from './posts/TennisPadelTab'
import type { TennisVisualConfig } from './posts/TennisVisualGenerator'
import { PageHeader, Segmented, GhostButton } from './ui'
import { Icon } from './icons'

type Club = {
  id: string
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  visualConfig: unknown
  tennisVisualConfig?: unknown
  tenupUrl?: string | null
}

type MatchData = {
  opponent: string
  homeScore: number
  awayScore: number
  isHome: boolean
  competition: string
  extraData?: Record<string, unknown>
}

type PostIds = Partial<Record<'instagram' | 'facebook' | 'whatsapp', string>>

type Mode = 'assistant' | 'manual'

type Section = 'match' | 'programme' | 'tournament' | 'recap' | 'announcement' | 'spotlight' | 'club' | 'poll' | 'customPost'

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

export default function ContentTab({ club }: { club: Club }) {
  const isTennisPadel = club.sport === 'Tennis' || club.sport === 'Padel'
  const [mode, setMode] = useState<Mode>('assistant')
  const [section, setSection] = useState<Section>('match')
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [generatedPosts, setGeneratedPosts] = useState<{ instagram: string; facebook: string; whatsapp: string } | null>(null)
  const [generatedPostIds, setGeneratedPostIds] = useState<PostIds | null>(null)
  const [generatedMatch, setGeneratedMatch] = useState<MatchData | null>(null)
  const [generatedMatchId, setGeneratedMatchId] = useState<string | null>(null)
  const [generatedPhoto, setGeneratedPhoto] = useState<File | null>(null)
  const [personalizing, setPersonalizing] = useState(false)
  const [visualOnlyFormat, setVisualOnlyFormat] = useState<VisualFormat>('post')

  function handleSectionChange(next: Section) {
    // Un ancien préremplissage ne doit jamais réapparaître silencieusement
    // sur un onglet standard visité manuellement en dehors du flux "Décrire".
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
    } finally {
      setPersonalizing(false)
    }
  }

  if (isTennisPadel) {
    return (
      <TennisPadelTab
        club={{
          name: club.name,
          sport: club.sport,
          primaryColor: club.primaryColor,
          secondaryColor: club.secondaryColor,
          logoUrl: club.logoUrl,
          tennisVisualConfig: club.tennisVisualConfig as TennisVisualConfig | null | undefined,
          tenupUrl: club.tenupUrl ?? null,
        }}
      />
    )
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
        title="Générer du contenu"
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
          { key: 'tournament', label: 'Tournoi', icon: 'trophy' },
          { key: 'recap', label: 'Bilan', icon: 'trending' },
          { key: 'announcement', label: 'Avant-match', icon: 'clock' },
          { key: 'spotlight', label: 'Joueur à l\'honneur', icon: 'user' },
          { key: 'club', label: 'Annonce du club', icon: 'users' },
          { key: 'poll', label: 'Engagement', icon: 'heart' },
          { key: 'customPost', label: 'Publication libre', icon: 'fileText' },
        ]}
      />

      {section === 'match' && !generatedPosts && !generatedMatch && (
        <div className="max-w-xl space-y-3">
          {prefill?.target === 'match' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <GenerateForm
            club={club}
            initialValues={prefill?.target === 'match' ? prefill.values : undefined}
            onSuccess={(posts, match, photo, postIds, matchId) => {
              setGeneratedPosts(posts)
              setGeneratedPostIds(postIds)
              setGeneratedMatch(match)
              setGeneratedMatchId(matchId)
              setGeneratedPhoto(photo)
            }}
            onVisualOnly={(match, photo) => {
              setGeneratedMatch(match)
              setGeneratedPhoto(photo)
            }}
          />
        </div>
      )}

      {section === 'match' && !generatedPosts && generatedMatch && (
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <PageHeader icon="image" title="Votre visuel est prêt" tone="gold" />
            <GhostButton icon="arrowLeft" onClick={() => { setGeneratedMatch(null); setGeneratedPhoto(null); setPrefill(null) }}>
              Nouveau match
            </GhostButton>
          </div>
          <FormatToggle value={visualOnlyFormat} onChange={setVisualOnlyFormat} />
          <VisualGenerator club={club} match={generatedMatch} photoFile={generatedPhoto} format={visualOnlyFormat} />
        </div>
      )}

      {section === 'match' && generatedPosts && generatedMatch && (
        <PostsResult
          posts={generatedPosts}
          postIds={generatedPostIds}
          club={club}
          match={generatedMatch}
          photoFile={generatedPhoto}
          onPersonalize={personalizeMatch}
          personalizing={personalizing}
          onReset={() => {
            setGeneratedPosts(null)
            setGeneratedPostIds(null)
            setGeneratedMatch(null)
            setGeneratedMatchId(null)
            setGeneratedPhoto(null)
            setPrefill(null)
          }}
        />
      )}

      {section === 'programme' && <ProgrammeTab club={club} />}
      {section === 'tournament' && <TournamentTab club={club} />}
      {section === 'recap' && (
        <div className="max-w-5xl space-y-3">
          {prefill?.target === 'seasonRecap' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <SeasonRecapTab club={club} initialValues={prefill?.target === 'seasonRecap' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'announcement' && (
        <div className="max-w-5xl space-y-3">
          {prefill?.target === 'announcement' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <MatchAnnouncementTab club={club} initialValues={prefill?.target === 'announcement' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'spotlight' && (
        <div className="max-w-5xl space-y-3">
          {prefill?.target === 'playerSpotlight' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <PlayerSpotlightTab club={club} initialValues={prefill?.target === 'playerSpotlight' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'club' && (
        <div className="max-w-5xl space-y-3">
          {prefill?.target === 'clubAnnouncement' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <ClubAnnouncementTab club={club} initialValues={prefill?.target === 'clubAnnouncement' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'poll' && (
        <div className="max-w-5xl space-y-3">
          {prefill?.target === 'engagementPoll' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <EngagementPollTab club={club} initialValues={prefill?.target === 'engagementPoll' ? prefill.values : undefined} />
        </div>
      )}
      {section === 'customPost' && (
        <div className="max-w-5xl space-y-3">
          {prefill?.target === 'customPost' && (
            <SourceTextBanner sourceText={prefill.sourceText} onClear={() => setPrefill(null)} />
          )}
          <CustomPostTab club={club} initialValues={prefill?.target === 'customPost' ? prefill.values : undefined} />
        </div>
      )}
    </div>
  )
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
