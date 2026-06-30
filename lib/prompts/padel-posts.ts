import type { TournamentMatch } from '../services/fft-pdf-parser'

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

export function padelTournamentSchedulePrompt(
  platform: 'instagram' | 'facebook' | 'whatsapp',
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

  return `Tu es le community manager du club de padel "${clubName}".
Rédige un post ${platform === 'instagram' ? 'Instagram' : platform === 'facebook' ? 'Facebook' : 'WhatsApp'} pour annoncer la programmation de nos joueurs au tournoi "${tournamentName}"${gradeLabel}.

Informations :
- Date : ${dateStr}
- Lieu : ${venue || tournamentName}
${grade ? `- Grade du tournoi : ${formatGrade(grade)}` : ''}
- Nos matchs programmés :
${matchList}

Vocabulaire padel obligatoire :
- "duo" ou "paire" (jamais "équipe" pour un double)
- "partenaire" (jamais "coéquipier")
- "smash", "bandeja", "vibora" pour les coups si pertinent
- "couloir", "grille", "fond de court" pour les zones
- "grade ${grade || 'P100'}" pour situer le niveau du tournoi

Consignes :
- Cite chaque paire nominalement (Joueur1 / Joueur2)
- Mentionne l'horaire et le court pour chaque duo
- Ton enthousiaste, appelle à soutenir les duos
${platform === 'instagram' ? `- Commence par un emoji accrocheur 🎾 ou 🏸\n- 5-7 hashtags : #padel #padelfrance #${clubName.toLowerCase().replace(/\s/g, '')} #${(grade || 'tournoi').toLowerCase()} #fft` : ''}
${platform === 'whatsapp' ? '- Court, sans hashtags, style groupe de joueurs\n- Maximum 200 caractères' : ''}
${platform === 'facebook' ? '- Structuré avec une ligne par duo\n- Peut inclure un appel à partager' : ''}

Réponds uniquement avec le texte du post.`
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

export function padelWeeklySchedulePrompt(
  platform: 'instagram' | 'facebook' | 'whatsapp',
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
Rédige un post ${platform} pour le programme interclubs padel de la semaine ${weekStr}.

Matchs :
${matchList}

Vocabulaire padel interclubs :
- "rencontre par équipes" ou "interclubs"
- "capitaine de piste"
- "division" (pas "poule" ni "championnat")

Consignes :
- Un match par ligne, emoji domicile/extérieur
- Mentionne la division pour chaque équipe
- Ton mobilisateur
${platform === 'instagram' ? '- 4-6 hashtags : #padel #interclubs #padelfrance #fft' : ''}
${platform === 'whatsapp' ? '- Court, sans hashtags, direct' : ''}

Réponds uniquement avec le texte du post.`
}

// ── INTERCLUB RESULT (PADEL) ───────────────────────────────────────────────

export type PadelScoreDetail = {
  pair1: string
  pair2: string
  score: string
  won: boolean
}

export function padelInterclubResultPrompt(
  platform: 'instagram' | 'facebook' | 'whatsapp',
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
Rédige un post ${platform} pour ce résultat interclubs.

Résultat : ${teamName} ${globalScore} ${opponent} (${homeAway.toLowerCase()})
Division : ${division}
${round ? `Journée : ${round}` : ''}

Détail (par duo) :
${detailList}

Vocabulaire padel :
- "paire" ou "duo" (pas "équipe" pour un binôme)
- "partenaire" pour désigner l'associé
- "set" et "jeu" pour le score (ex: 6-4, 7-5)

${toneInstruction}
${platform === 'instagram' ? `- 4-5 hashtags : #padel #interclubs #${outcome} #padelfrance` : ''}
${platform === 'whatsapp' ? '- 3-4 lignes max, style message de groupe' : ''}

Réponds uniquement avec le texte du post.`
}
