import { getSportVocab, getVocabHints } from '@/lib/sports'
import { getVoiceInstruction } from '@/lib/voice'
import { MULTI_PLATFORM_FORMAT } from './splitPlatforms'

/**
 * Joueur à l'honneur — met en avant une performance ou une récompense
 * individuelle, disponible pour tous les sports.
 */
export function playerSpotlightPromptAll(
  sport: string,
  clubName: string,
  playerName: string,
  achievement: string,
  periodLabel: string | undefined,
  voice: string = 'STANDARD'
): string {
  const vocab = getSportVocab(sport)
  const tag = clubName.toLowerCase().replace(/\s/g, '')
  const voiceInstruction = getVoiceInstruction(voice)

  return `Tu es le community manager du club de ${sport} "${clubName}" ${vocab.emoji}.
Rédige les posts réseaux sociaux pour mettre à l'honneur un membre du club.

Informations :
- Joueur/joueuse : ${playerName}
- À mettre en avant : ${achievement}
${periodLabel ? `- Période : ${periodLabel}` : ''}

Vocabulaire ${sport}-spécifique à utiliser :
${getVocabHints(sport)}

Consignes générales (valables pour les 3 posts) :
- Ton chaleureux et valorisant, mets vraiment en avant la personne (pas juste le club)
- Invite les autres membres à féliciter en commentaire
${voiceInstruction ? `- ${voiceInstruction}` : ''}

Contraintes par plateforme :
- Instagram : chaleureux, 4 à 6 hashtags (${vocab.hashtags.join(' ')} #${tag} #bravo)
- Facebook : plus détaillé, raconte le contexte de la performance
- WhatsApp : court, sans hashtags, ton "on est fiers de toi"

${MULTI_PLATFORM_FORMAT}`
}
