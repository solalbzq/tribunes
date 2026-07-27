import { getSportVocab, getVocabHints } from '@/lib/sports'
import { getVoiceInstruction } from '@/lib/voice'
import { MULTI_PLATFORM_FORMAT } from './splitPlatforms'

export type ClubAnnouncementCategory = 'RECRUITMENT' | 'SPONSOR' | 'CLUB_LIFE'

const CATEGORY_INSTRUCTIONS: Record<ClubAnnouncementCategory, string> = {
  RECRUITMENT: "Ton appel à l'action, énergique : donne envie de rejoindre le club, précise comment postuler/contacter (adhésion, essai gratuit, contact du bureau...).",
  SPONSOR: 'Ton de remerciement sincère envers le partenaire : mets en avant sa contribution au club, reste professionnel et chaleureux.',
  CLUB_LIFE: "Ton chaleureux et communautaire : partage un moment de vie du club (événement, récompense, anecdote), donne envie de faire partie de l'aventure.",
}

/**
 * Annonce du club — recrutement, remerciement sponsor, ou vie du club.
 * Un seul générateur, le ton varie selon la catégorie plutôt que de dupliquer
 * un prompt par sous-type.
 */
export function clubAnnouncementPromptAll(
  sport: string,
  clubName: string,
  category: ClubAnnouncementCategory,
  title: string,
  description: string,
  ctaText: string | undefined,
  voice: string = 'STANDARD'
): string {
  const vocab = getSportVocab(sport)
  const tag = clubName.toLowerCase().replace(/\s/g, '')
  const voiceInstruction = getVoiceInstruction(voice)
  const categoryTag = { RECRUITMENT: '#recrutement', SPONSOR: '#partenaire', CLUB_LIFE: '#viedeclub' }[category]

  return `Tu es le community manager du club de ${sport} "${clubName}" ${vocab.emoji}.
Rédige les posts réseaux sociaux pour l'annonce suivante.

Titre : ${title}
Détails : ${description}
${ctaText ? `Appel à l'action à inclure : ${ctaText}` : ''}

Vocabulaire ${sport}-spécifique à utiliser :
${getVocabHints(sport)}

Consignes générales (valables pour les 3 posts) :
- ${CATEGORY_INSTRUCTIONS[category]}
${voiceInstruction ? `- ${voiceInstruction}` : ''}

Contraintes par plateforme :
- Instagram : engageant, 4 à 6 hashtags (${vocab.hashtags.join(' ')} #${tag} ${categoryTag})
- Facebook : plus détaillé, informations pratiques claires
- WhatsApp : court, sans hashtags, ton direct

${MULTI_PLATFORM_FORMAT}`
}
