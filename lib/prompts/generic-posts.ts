import { getSportVocab, getVocabHints } from '@/lib/sports'
import { MULTI_PLATFORM_FORMAT } from './splitPlatforms'
import { getVoiceInstruction } from '../voice'

// ── WEEKLY SCHEDULE (Football / Handball / Basketball / Volleyball) ───────

export type GenericWeeklyMatch = {
  opponent: string
  day: string
  time: string
  homeAway: 'DOMICILE' | 'EXTERIEUR'
  competition?: string
}

export function weeklySchedulePromptAll(
  sport: string,
  clubName: string,
  weekStart: Date,
  weekEnd: Date,
  matches: GenericWeeklyMatch[],
  voice: string = 'STANDARD'
): string {
  const vocab = getSportVocab(sport)
  const weekStr = `du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
  const tag = clubName.toLowerCase().replace(/\s/g, '')
  const matchList = matches.map(m =>
    `${m.homeAway === 'DOMICILE' ? '🏠' : '✈️'} ${clubName} vs ${m.opponent} · ${m.day} ${m.time}${m.competition ? ` · ${m.competition}` : ''}`
  ).join('\n')
  const voiceInstruction = getVoiceInstruction(voice)

  return `Tu es le community manager du club de ${sport} "${clubName}" ${vocab.emoji}.
Rédige les posts réseaux sociaux pour annoncer le programme des matchs de la semaine ${weekStr}.

Matchs à venir :
${matchList}

Vocabulaire ${sport}-spécifique à utiliser :
${getVocabHints(sport)}

Consignes générales (valables pour les 2 posts) :
- Un match par ligne avec l'emoji 🏠 domicile ou ✈️ extérieur
- Ton mobilisateur : appelle les supporters à venir soutenir l'équipe
${voiceInstruction ? `- ${voiceInstruction}` : ''}

Contraintes par plateforme :
- Instagram : dynamique, 4 à 6 hashtags (${vocab.hashtags.map(h => h).join(' ')} #${tag})
- Facebook : narratif et communautaire, peu de hashtags

${MULTI_PLATFORM_FORMAT}`
}

// ── TOURNAMENT SCHEDULE (Football / Handball / Basketball / Volleyball) ───

export type GenericTournamentMatch = {
  opponent: string
  time: string
  category?: string
  round?: string
}

export function tournamentSchedulePromptAll(
  sport: string,
  clubName: string,
  tournamentName: string,
  matchDate: Date,
  venue: string,
  matches: GenericTournamentMatch[],
  voice: string = 'STANDARD'
): string {
  const vocab = getSportVocab(sport)
  const dateStr = matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const tag = clubName.toLowerCase().replace(/\s/g, '')
  const matchList = matches.map(m =>
    `- ${m.time} · vs ${m.opponent}${m.category ? ` · ${m.category}` : ''}${m.round ? ` · ${m.round}` : ''}`
  ).join('\n')
  const voiceInstruction = getVoiceInstruction(voice)

  return `Tu es le community manager du club de ${sport} "${clubName}" ${vocab.emoji}.
Rédige les posts réseaux sociaux pour annoncer la participation de notre équipe au tournoi "${tournamentName}".

Informations :
- Date : ${dateStr}
- Lieu : ${venue || tournamentName}
- Nos matchs programmés :
${matchList}

Vocabulaire ${sport}-spécifique à utiliser :
${getVocabHints(sport)}

Consignes générales (valables pour les 2 posts) :
- Ton enthousiaste et fédérateur, appelle les supporters à venir
${voiceInstruction ? `- ${voiceInstruction}` : ''}

Contraintes par plateforme :
- Instagram : max 2200 caractères, commence par ${vocab.emoji}, 5 à 8 hashtags en fin (${vocab.hashtags.join(' ')} #${tag} #tournoi)
- Facebook : plus informatif, sauts de ligne clairs, 2-3 hashtags max, inclure un appel à partager

${MULTI_PLATFORM_FORMAT}`
}
