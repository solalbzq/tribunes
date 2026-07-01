import type { TournamentMatch } from '../services/fft-pdf-parser'
import { MULTI_PLATFORM_FORMAT } from './splitPlatforms'

const PADEL_GRADES = ['P25', 'P100', 'P250', 'P500', 'P1000', 'Open']

export function formatGrade(grade: string): string {
  return PADEL_GRADES.includes(grade) ? grade : grade
}

function formatPadelPair(match: TournamentMatch, side: 'club' | 'opp'): string {
  if (side === 'club') {
    return match.player1Partner ? `${match.player1} / ${match.player1Partner}` : match.player1
  }
  return match.player2Partner ? `${match.player2} / ${match.player2Partner}` : match.player2
}

function formatMatchList(matches: TournamentMatch[]): string {
  return matches.map(m => {
    const clubPair = formatPadelPair(m, 'club')
    const oppPair = formatPadelPair(m, 'opp')
    return `- ${m.time} · ${m.court} · ${m.category} · ${m.round} · ${clubPair} vs ${oppPair}`
  }).join('\n')
}

// ── TOURNAMENT SCHEDULE (PADEL) ────────────────────────────────────────────

export function padelTournamentSchedulePromptAll(
  clubName: string,
  tournamentName: string,
  grade: string,
  matchDate: Date,
  venue: string,
  clubMatches: TournamentMatch[]
): string {
  const dateStr = matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const matchList = formatMatchList(clubMatches)
  const gradeLabel = grade ? ` (${formatGrade(grade)})` : ''
  const tag = clubName.toLowerCase().replace(/\s/g, '')

  return `Tu es le community manager du club de padel "${clubName}".
Rédige les posts réseaux sociaux pour annoncer la programmation de nos joueurs au tournoi "${tournamentName}"${gradeLabel}.

Informations :
- Date : ${dateStr}
- Lieu : ${venue || tournamentName}
${grade ? `- Grade du tournoi : ${formatGrade(grade)}` : ''}
- Nos matchs programmés :
${matchList}

Vocabulaire padel obligatoire (pour les 3 posts) :
- "duo" ou "paire" (jamais "équipe" pour un double), "partenaire" (jamais "coéquipier")
- "smash", "bandeja", "vibora" si pertinent ; "couloir", "grille", "fond de court" pour les zones
- Cite chaque paire nominalement (Joueur1 / Joueur2), avec horaire et court

Contraintes par plateforme :
- Instagram : commence par 🎾 ou 🏸, 5-7 hashtags (#padel #padelfrance #${tag} #${(grade || 'tournoi').toLowerCase()} #fft)
- Facebook : une ligne par duo, appel à partager
- WhatsApp : court (max 200 caractères), sans hashtags, style groupe de joueurs

${MULTI_PLATFORM_FORMAT}`
}

// ── WEEKLY INTERCLUB SCHEDULE (PADEL) ─────────────────────────────────────

export type PadelWeeklyMatch = {
  teamName: string
  opponent: string
  day: string
  time: string
  homeAway: 'DOMICILE' | 'EXTERIEUR'
  division: string
  venue?: string
}

export function padelWeeklySchedulePromptAll(
  clubName: string,
  weekStart: Date,
  weekEnd: Date,
  matches: PadelWeeklyMatch[]
): string {
  const weekStr = `du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
  const matchList = matches.map(m =>
    `${m.homeAway === 'DOMICILE' ? '🏠' : '✈️'} ${m.teamName} vs ${m.opponent} · ${m.day} ${m.time} · ${m.division}${m.venue ? ` · ${m.venue}` : ''}`
  ).join('\n')

  return `Tu es le community manager du club de padel "${clubName}".
Rédige les posts réseaux sociaux pour le programme interclubs padel de la semaine ${weekStr}.

Matchs :
${matchList}

Vocabulaire padel interclubs (pour les 3 posts) :
- "rencontre par équipes" ou "interclubs", "capitaine de piste", "division" (pas "poule")
- Un match par ligne, emoji domicile 🏠 / extérieur ✈️, mentionne la division

Contraintes par plateforme :
- Instagram : 4-6 hashtags (#padel #interclubs #padelfrance #fft)
- Facebook : narratif et communautaire
- WhatsApp : court, sans hashtags, direct

${MULTI_PLATFORM_FORMAT}`
}

// ── INTERCLUB RESULT (PADEL) ───────────────────────────────────────────────

export type PadelScoreDetail = {
  pair1: string
  pair2: string
  score: string
  won: boolean
}

export function padelInterclubResultPromptAll(
  clubName: string,
  teamName: string,
  opponent: string,
  globalScore: string,
  division: string,
  round: string,
  homeAway: 'DOMICILE' | 'EXTERIEUR',
  scoreDetail: PadelScoreDetail[]
): string {
  const [us, them] = globalScore.split('-').map(Number)
  const outcome = us > them ? 'victoire' : us < them ? 'défaite' : 'match nul'

  const detailList = scoreDetail.map(s =>
    `${s.pair1} vs ${s.pair2} : ${s.score} → ${s.won ? 'Victoire' : 'Défaite'}`
  ).join('\n')

  const toneInstruction = {
    victoire: 'Célèbre la victoire avec enthousiasme, valorise les duos gagnants.',
    défaite: 'Ton combatif et positif, valorise l\'effort du duo, reste motivant.',
    'match nul': 'Souligne le point pris et l\'esprit de compétition.',
  }[outcome]

  return `Tu es le community manager du club de padel "${clubName}".
Rédige les posts réseaux sociaux pour ce résultat interclubs.

Résultat : ${teamName} ${globalScore} ${opponent} (${homeAway.toLowerCase()})
Division : ${division}
${round ? `Journée : ${round}` : ''}

Détail (par duo) :
${detailList}

Vocabulaire padel (pour les 3 posts) :
- "paire" ou "duo" (pas "équipe" pour un binôme), "partenaire" pour l'associé
- "set" et "jeu" pour le score (ex: 6-4, 7-5)
- ${toneInstruction}

Contraintes par plateforme :
- Instagram : 4-5 hashtags (#padel #interclubs #${outcome} #padelfrance)
- Facebook : narratif, contexte de championnat
- WhatsApp : 3-4 lignes max, style message de groupe

${MULTI_PLATFORM_FORMAT}`
}
