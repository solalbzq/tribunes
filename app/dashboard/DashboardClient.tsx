'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ClubSettings from './ClubSettings'
import ContentTab from './ContentTab'

type Club = {
  id: string
  name: string
  sport: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  visualConfig: unknown
  tennisVisualConfig?: unknown
  matches: Array<{
    id: string
    opponent: string
    homeScore: number
    awayScore: number
    isHome: boolean
    competition: string | null
    date: string
    posts: Array<{ platform: string; content: string }>
  }>
} | null

export default function DashboardClient({ club, userEmail }: { club: Club; userEmail: string }) {
  const router = useRouter()
  const isTennisPadel = club?.sport === 'Tennis' || club?.sport === 'Padel'
  const [view, setView] = useState<'home' | 'content' | 'history' | 'settings'>('home')

  // Finalise la création du club si elle était en attente (email confirm flow)
  useEffect(() => {
    if (club) return
    const pending = sessionStorage.getItem('pending_club')
    if (!pending) return
    const { name, sport } = JSON.parse(pending)
    fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sport }),
    }).then(r => {
      if (r.ok) {
        sessionStorage.removeItem('pending_club')
        router.refresh()
      }
    })
  }, [club, router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Erreur de chargement du club.</p>
          <button onClick={handleLogout} className="text-[#e94560] underline text-sm">Se déconnecter</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold text-[#1a1a2e]">⚡ Tribunes</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-semibold text-gray-600">{club.name}</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{club.sport}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 hidden sm:block">{userEmail}</span>
            <a href="/account" className="text-sm font-semibold text-gray-600 hover:text-[#1a1a2e] transition">
              👤 Compte
            </a>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-[#e94560] transition">
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
             { key: 'home', label: '🏠 Accueil' },
             { key: 'content', label: isTennisPadel ? '✨ Generer du contenu' : '✨ Generer' },
             { key: 'history', label: '📋 Historique' },
             { key: 'settings', label: '🎨 Mon club' },
           ].map(tab => (
             <button
               key={tab.key}
               onClick={() => setView(tab.key as typeof view)}
               className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                 view === tab.key
                   ? 'bg-[#1a1a2e] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Home */}
        {view === 'home' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-8">
              <h1 className="text-2xl font-extrabold text-[#1a1a2e] mb-1">
                Bonjour, {club.name} 👋
              </h1>
                <p className="text-gray-500 mb-6">Génère tes posts réseaux sociaux en 2 minutes.</p>
                <button
                  onClick={() => setView('content')}
                  className="bg-[#e94560] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#d63a52] transition"
                >
                  ✨ Generer du contenu
                </button>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Posts générés" value={club.matches.reduce((acc, m) => acc + m.posts.length, 0)} />
              <StatCard label="Matchs enregistrés" value={club.matches.length} />
              <StatCard label="Sport" value={club.sport} />
            </div>
          </div>
        )}

        {view === 'content' && <ContentTab club={club} />}

        {/* History */}
        {view === 'history' && (
          <div className="space-y-4">
            {club.matches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
                Aucun match enregistré. Génère ton premier post !
              </div>
            ) : club.matches.map(match => {
              const clubScore = match.isHome ? match.homeScore : match.awayScore
              const oppScore = match.isHome ? match.awayScore : match.homeScore
              const result = clubScore > oppScore ? 'V' : clubScore < oppScore ? 'D' : 'N'
              const color = result === 'V' ? '#10b981' : result === 'D' ? '#e94560' : '#6b7280'
              return (
                <div key={match.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1a1a2e]">vs {match.opponent}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{result}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {clubScore} - {oppScore} · {match.competition ?? 'Match amical'} · {new Date(match.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{match.posts.length} post{match.posts.length > 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Settings */}
        {view === 'settings' && (
          <ClubSettings club={club} />
        )}

      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-extrabold text-[#1a1a2e] mt-1">{value}</p>
    </div>
  )
}
