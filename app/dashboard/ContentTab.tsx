'use client'

import { useState } from 'react'
import GenerateForm from './GenerateForm'
import PostsResult from './PostsResult'
import ProgrammeTab from './ProgrammeTab'
import VisualGenerator from './VisualGenerator'
import TennisPadelTab from './posts/TennisPadelTab'
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
      <div className="flex items-center gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <h2 className="text-xl font-extrabold text-[#1a1a2e]">Generer du contenu</h2>
          <p className="text-sm text-gray-500">Choisis le type de contenu adapte a ton club.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { key: 'match', label: '🏟️ Post match' },
          { key: 'programme', label: '📅 Programme' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSection(tab.key as typeof section)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${section === tab.key ? 'bg-white text-[#1a1a2e] shadow-sm' : 'text-gray-600 hover:text-[#1a1a2e]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
