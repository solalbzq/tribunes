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

  const totalPosts = club.matches.reduce((acc, match) => acc + match.posts.length, 0)
  const recentMatches = [...club.matches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
  const wins = club.matches.filter(match => {
    const clubScore = match.isHome ? match.homeScore : match.awayScore
    const oppScore = match.isHome ? match.awayScore : match.homeScore
    return clubScore > oppScore
  }).length
  const losses = club.matches.filter(match => {
    const clubScore = match.isHome ? match.homeScore : match.awayScore
    const oppScore = match.isHome ? match.awayScore : match.homeScore
    return clubScore < oppScore
  }).length
  const draws = club.matches.length - wins - losses
  const winRate = club.matches.length ? Math.round((wins / club.matches.length) * 100) : 0
  const lastGeneratedAt = recentMatches[0]?.date
  const socialStats = [
    { label: 'Audience totale', value: '0', helper: 'Connexion reseaux bientot', accent: '#7c3aed' },
    { label: 'Engagement moyen', value: '0%', helper: 'Likes, commentaires, partages', accent: '#e94560' },
    { label: 'Posts ce mois', value: String(totalPosts), helper: 'Base sur les contenus generes', accent: '#10b981' },
  ]

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-8">
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
            <div className="grid grid-cols-1 xl:grid-cols-[1.75fr_0.95fr] gap-4">
              <div className="rounded-[26px] p-6 sm:p-7 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${club.primaryColor} 0%, #111827 100%)` }}>
                <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at top right, ${club.secondaryColor} 0%, transparent 45%)` }} />
                <div className="relative space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">Dashboard club</span>
                    <span className="text-xs px-3 py-1 rounded-full border border-white/15 bg-white/10">{club.sport}</span>
                  </div>
                  <div className="space-y-2 max-w-2xl">
                    <h1 className="text-3xl sm:text-[2.6rem] font-black leading-tight">Bonjour, {club.name}</h1>
                    <p className="text-sm sm:text-[15px] text-white/75 max-w-xl">
                      Pilote ta communication depuis un seul espace avec des contenus prets a poster, des visuels de match et bientot les connexions reseaux sociaux du club.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setView('content')}
                      className="bg-white text-[#1a1a2e] font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition"
                    >
                      ✨ Generer du contenu
                    </button>
                    <button
                      onClick={() => setView('settings')}
                      className="px-6 py-3 rounded-xl font-semibold border border-white/20 bg-white/10 hover:bg-white/15 transition"
                    >
                      🎨 Personnaliser le club
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <HighlightCard label="Posts generes" value={String(totalPosts)} helper={lastGeneratedAt ? `Dernier le ${formatDate(lastGeneratedAt)}` : 'Aucun post genere pour le moment'} />
                    <HighlightCard label="Matchs suivis" value={String(club.matches.length)} helper={club.matches.length ? `${wins} victoire${wins > 1 ? 's' : ''} sur la periode` : 'Commence par enregistrer un match'} />
                    <HighlightCard label="Taux de victoire" value={`${winRate}%`} helper={club.matches.length ? `${losses} defaite${losses > 1 ? 's' : ''} · ${draws} nul${draws > 1 ? 's' : ''}` : 'Les stats apparaitront ici'} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[26px] p-5 space-y-4 shadow-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Vue rapide</p>
                  <h2 className="text-lg font-extrabold text-[#1a1a2e] mt-2">Le club en un coup d'oeil</h2>
                </div>
                <div className="space-y-3">
                  <StatCard label="Sport" value={club.sport} />
                  <StatCard label="Posts par match" value={club.matches.length ? (totalPosts / club.matches.length).toFixed(1) : '0'} />
                  <StatCard label="Adresse connectee" value={userEmail.split('@')[0]} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-4">
              <div className="bg-white rounded-[26px] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Reseaux sociaux</p>
                    <h2 className="text-lg font-extrabold text-[#1a1a2e] mt-2">Stats a connecter</h2>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                    Bientot en direct
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {socialStats.map(stat => (
                    <div key={stat.label} className="rounded-2xl bg-gray-50/80 p-4">
                      <div className="w-9 h-1.5 rounded-full" style={{ background: stat.accent }} />
                      <p className="text-sm text-gray-500 mt-4">{stat.label}</p>
                      <p className="text-3xl font-black text-[#1a1a2e] mt-1">{stat.value}</p>
                      <p className="text-xs text-gray-400 mt-2">{stat.helper}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#1a1a2e]">Instagram, Facebook et WhatsApp</p>
                    <p className="text-sm text-gray-500 mt-1">Les cartes afficheront la portee, l'engagement et les meilleurs formats des que les comptes seront relies.</p>
                  </div>
                  <button
                    onClick={() => setView('settings')}
                    className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-[#1a1a2e] text-white hover:bg-[#2a2a4e] transition"
                  >
                    Preparer
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[26px] p-5 space-y-4 shadow-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Activite recente</p>
                  <h2 className="text-lg font-extrabold text-[#1a1a2e] mt-2">Derniers matchs</h2>
                </div>
                {recentMatches.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
                    Aucun match enregistre pour le moment. Commence par generer ton premier contenu pour alimenter ce dashboard.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentMatches.map(match => {
                      const clubScore = match.isHome ? match.homeScore : match.awayScore
                      const oppScore = match.isHome ? match.awayScore : match.homeScore
                      const result = clubScore > oppScore ? 'Victoire' : clubScore < oppScore ? 'Defaite' : 'Nul'
                      const resultClasses = clubScore > oppScore
                        ? 'bg-emerald-50 text-emerald-700'
                        : clubScore < oppScore
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-600'

                      return (
                        <div key={match.id} className="rounded-2xl bg-gray-50 p-4 flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-[#1a1a2e]">{club.name} {clubScore} - {oppScore} {match.opponent}</p>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${resultClasses}`}>{result}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {match.competition ?? 'Match amical'} · {formatDate(match.date)}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{match.posts.length} post{match.posts.length > 1 ? 's' : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
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
    <div className="bg-gray-50 rounded-2xl p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-extrabold text-[#1a1a2e] mt-1">{value}</p>
    </div>
  )
}

function HighlightCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">{label}</p>
      <p className="text-3xl font-black mt-2">{value}</p>
      <p className="text-sm text-white/65 mt-2">{helper}</p>
    </div>
  )
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
