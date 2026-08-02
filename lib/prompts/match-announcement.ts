import { getSportVocab, getVocabHints } from '@/lib/sports'
import { getVoiceInstruction } from '@/lib/voice'
import { MULTI_PLATFORM_FORMAT } from './splitPlatforms'

/**
 * Avant-match / teaser — post publié avant la rencontre pour créer de
 * l'attente, disponible pour tous les sports (pas de score, juste l'annonce).
 */
export function matchAnnouncementPromptAll(
  sport: string,
  clubName: string,
  opponent: string,
  matchDate: Date,
  time: string | undefined,
  venue: string | undefined,
  competition: string | undefined,
  isHome: boolean,
  note: string | undefined,
  voice: string = 'STANDARD'
): string {
  const vocab = getSportVocab(sport)
  const tag = clubName.toLowerCase().replace(/\s/g, '')
  const dateStr = matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const daysUntil = Math.max(0, Math.ceil((matchDate.getTime() - Date.now()) / 86400000))
  const voiceInstruction = getVoiceInstruction(voice)

  return `Tu es le community manager du club de ${sport} "${clubName}" ${vocab.emoji}.
Rédige les posts réseaux sociaux pour annoncer le prochain match, ${daysUntil <= 0 ? "aujourd'hui" : `dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}.

Informations :
- ${isHome ? clubName + ' reçoit ' + opponent : clubName + ' se déplace chez ' + opponent}
- Date : ${dateStr}${time ? ` à ${time}` : ''}
${venue ? `- Lieu : ${venue}` : ''}
${competition ? `- Compétition : ${competition}` : ''}
${note ? `- À mentionner : ${note}` : ''}

Vocabulaire ${sport}-spécifique à utiliser :
${getVocabHints(sport)}

Consignes générales (valables pour les 2 posts) :
- Ton hype, compte à rebours : crée l'attente et donne envie de venir supporter l'équipe
- Rappelle clairement la date, l'heure et le lieu
${voiceInstruction ? `- ${voiceInstruction}` : ''}

Contraintes par plateforme :
- Instagram : punchy, 4 à 6 hashtags (${vocab.hashtags.join(' ')} #${tag} #avantmatch)
- Facebook : plus détaillé, appel à venir nombreux, informations pratiques claires

${MULTI_PLATFORM_FORMAT}`
}
