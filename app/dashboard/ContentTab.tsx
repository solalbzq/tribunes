'use client'

import { useState } from 'react'
import GenerateForm from './GenerateForm'
import PostsResult from './PostsResult'
import ProgrammeTab from './ProgrammeTab'
import VisualGenerator from './VisualGenerator'
import TennisPadelTab from './posts/TennisPadelTab'
import type { TennisVisualConfig } from './posts/TennisVisualGenerator'
import { PageHeader, Segmented, GhostButton } from './ui'

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

export default function ContentTab({ club }: { club: Club }) {
  const isTennisPadel = club.sport === 'Tennis' || club.sport === 'Padel'
  const [section, setSection] = useState<'match' | 'programme'>('match')
  const [generatedPosts, setGeneratedPosts] = useState<{ instagram: string; facebook: string; whatsapp: string } | null>(null)
  const [generatedMatch, setGeneratedMatch] = useState<MatchData | null>(null)
  const [generatedPhoto, setGeneratedPhoto] = useState<File | null>(null)

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

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        icon="sparkles"
        title="Générer du contenu"
        subtitle="Choisissez le type de contenu adapté à votre club."
      />

      <Segmented
        value={section}
        onChange={setSection}
        items={[
          { key: 'match', label: 'Post de match', icon: 'target' },
          { key: 'programme', label: 'Programme', icon: 'calendar' },
        ]}
      />

      {section === 'match' && !generatedPosts && !generatedMatch && (
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

      {section === 'match' && !generatedPosts && generatedMatch && (
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

      {section === 'match' && generatedPosts && generatedMatch && (
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

      {section === 'programme' && <ProgrammeTab club={club} />}
    </div>
  )
}
