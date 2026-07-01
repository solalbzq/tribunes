import type { TournamentMatch } from '../services/fft-pdf-parser'
import { MULTI_PLATFORM_FORMAT } from './splitPlatforms'

function formatMatchList(matches: TournamentMatch[]): string {
  return matches.map(m => {
    const players = m.isPadelPair
      ? `${m.player1}${m.player1Partner ? ` / ${m.player1Partner}` : ''} vs ${m.player2}${m.player2Partner ? ` / ${m.player2Partner}` : ''}`
      : `${m.player1} vs ${m.player2}`
    return `- ${m.time} · ${m.court} · ${m.category} · ${m.round} · ${players}`
  }).join('\n')
}

// ── TOURNAMENT SCHEDULE ────────────────────────────────────────────────────

export function tournamentSchedulePromptAll(
  clubName: string,
  tournamentName: string,
  matchDate: Date,
  venue: string,
  clubMatches: TournamentMatch[]
): string {
  const dateStr = matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const matchList = formatMatchList(clubMatches)
  const tag = clubName.toLowerCase().replace(/\s/g, '')

  return `Tu es le community manager du club de tennis "${clubName}".
Rédige les posts réseaux sociaux pour annoncer la programmation de nos joueurs au tournoi "${tournamentName}".

Informations :
- Date : ${dateStr}
- Lieu : ${venue || tournamentName}
- Nos matchs programmés :
${matchList}

Consignes générales (valables pour les 3 posts) :
- Utilise le vocabulaire tennis exact : set, jeu, ace, break, tie-break (pas "manche", pas "point" pour les sets)
- Cite chaque joueur/joueuse nominalement et son horaire précis
- Mentionne la catégorie du match (ex: Hommes 15/1, Dames 4/6)
- Ton enthousiaste et fédérateur, appelle les supporters à venir

Contraintes par plateforme :
- Instagram : max 2200 caractères, commence par 🎾, une ligne par joueur, 5 à 8 hashtags en fin (#tennis #tournoi #${tag} #fft)
- Facebook : plus informatif, sauts de ligne clairs, 2-3 hashtags max, inclure un appel à partager
- WhatsApp : court (max 300 caractères), sans hashtags, ton SMS entre amis : qui joue, quand, où

${MULTI_PLATFORM_FORMAT}`
}

// ── WEEKLY INTERCLUB SCHEDULE ──────────────────────────────────────────────

export type WeeklyMatch = {
  teamName: string
  opponent: string
  day: string
  time: string
  homeAway: 'DOMICILE' | 'EXTERIEUR'
  division: string
  venue?: string
}

export function weeklySchedulePromptAll(
  clubName: string,
  weekStart: Date,
  weekEnd: Date,
  matches: WeeklyMatch[]
): string {
  const weekStr = `du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
  const tag = clubName.toLowerCase().replace(/\s/g, '')
  const matchList = matches.map(m =>
    `${m.homeAway === 'DOMICILE' ? '🏠' : '✈️'} ${m.teamName} vs ${m.opponent} · ${m.day} ${m.time} · ${m.division}${m.venue ? ` · ${m.venue}` : ''}`
  ).join('\n')

  return `Tu es le community manager du club de tennis "${clubName}".
Rédige les posts réseaux sociaux pour annoncer le programme des matchs interclubs de la semaine ${weekStr}.

Matchs à venir :
${matchList}

Consignes générales (valables pour les 3 posts) :
- Vocabulaire interclubs tennis : "rencontre", "équipe", "capitaine", "journée"
- Un match par ligne avec l'emoji 🏠 domicile ou ✈️ extérieur
- Mentionne la division pour chaque équipe
- Ton mobilisateur : appelle à venir soutenir

Contraintes par plateforme :
- Instagram : dynamique, 4 à 6 hashtags (#tennis #interclubs #${tag} #fft)
- Facebook : narratif et communautaire, peu de hashtags
- WhatsApp : court, sans hashtags, style groupe de supporters

${MULTI_PLATFORM_FORMAT}`
}

// ── INTERCLUB RESULT ───────────────────────────────────────────────────────

export type ScoreDetail = {
  player: string
  opponent: string
  score: string
  won: boolean
  type: 'SIMPLE' | 'DOUBLE'
}

export function interclubResultPromptAll(
  clubName: string,
  teamName: string,
  opponent: string,
  globalScore: string,
  division: string,
  round: string,
  homeAway: 'DOMICILE' | 'EXTERIEUR',
  scoreDetail: ScoreDetail[]
): string {
  const [us, them] = globalScore.split('-').map(Number)
  const outcome = us > them ? 'victoire' : us < them ? 'défaite' : 'match nul'
  const tag = clubName.toLowerCase().replace(/\s/g, '')

  const detailList = scoreDetail.map(s =>
    `${s.type === 'DOUBLE' ? '(Double) ' : ''}${s.player} vs ${s.opponent} : ${s.score} → ${s.won ? 'Victoire' : 'Défaite'}`
  ).join('\n')

  const toneInstruction = {
    victoire: 'Célèbre la victoire avec enthousiasme. Remercie les joueurs par leur nom.',
    défaite: 'Ton combatif et positif : valorise l\'effort et la combativité, reste motivant, pas de défaitisme.',
    'match nul': 'Ton équilibré : souligne le point pris, l\'esprit combatif, la belle rencontre.',
  }[outcome]

  return `Tu es le community manager du club de tennis "${clubName}".
Rédige les posts réseaux sociaux pour communiquer sur ce résultat interclubs.

Résultat : ${teamName} ${globalScore} ${opponent} (${homeAway.toLowerCase()})
Division : ${division}
${round ? `Journée : ${round}` : ''}

Détail des matchs joués :
${detailList}

Consignes générales (valables pour les 3 posts) :
- ${toneInstruction}
- Cite le score global en évidence (${globalScore})
- Vocabulaire tennis précis : "simple", "double", "set", "jeu"
- Mention de l'adversaire respectueusement

Contraintes par plateforme :
- Instagram : dynamique, 4-6 hashtags (#tennis #interclubs #${outcome} #fft #${tag})
- Facebook : plus narratif, peut mentionner le contexte de championnat
- WhatsApp : très court (3-4 lignes max), style message groupe

${MULTI_PLATFORM_FORMAT}`
}
