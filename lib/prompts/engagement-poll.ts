import { getSportVocab, getVocabHints } from '@/lib/sports'
import { getVoiceInstruction } from '@/lib/voice'
import { MULTI_PLATFORM_FORMAT } from './splitPlatforms'

/**
 * Post d'engagement — sondage/question posée aux supporters, disponible pour
 * tous les sports. Vise l'interaction (commentaires, sondage en story) plutôt
 * qu'une annonce.
 */
export function engagementPollPromptAll(
  sport: string,
  clubName: string,
  question: string,
  options: string[],
  voice: string = 'STANDARD'
): string {
  const vocab = getSportVocab(sport)
  const tag = clubName.toLowerCase().replace(/\s/g, '')
  const voiceInstruction = getVoiceInstruction(voice)
  const optionsList = options.map((o, i) => `${i + 1}. ${o}`).join('\n')

  return `Tu es le community manager du club de ${sport} "${clubName}" ${vocab.emoji}.
Rédige les posts réseaux sociaux pour un post d'engagement qui pose une question à la communauté.

Question : ${question}
Options proposées :
${optionsList}

Vocabulaire ${sport}-spécifique à utiliser :
${getVocabHints(sport)}

Consignes générales (valables pour les 3 posts) :
- Ton complice et joueur, l'objectif est de faire réagir en commentaire (ou via le sondage en story pour Instagram)
- Rappelle clairement les options de réponse
- Ne donne pas de réponse, laisse la communauté répondre
${voiceInstruction ? `- ${voiceInstruction}` : ''}

Contraintes par plateforme :
- Instagram : court et punchy, mentionne qu'un sondage est disponible en story, 3 à 5 hashtags (${vocab.hashtags.join(' ')} #${tag})
- Facebook : invite explicitement à répondre en commentaire, ton convivial
- WhatsApp : très court, direct, ton groupe de supporters

${MULTI_PLATFORM_FORMAT}`
}
