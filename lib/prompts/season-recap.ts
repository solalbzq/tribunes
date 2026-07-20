import { getSportVocab, getVocabHints } from '@/lib/sports'
import { getVoiceInstruction } from '@/lib/voice'
import { MULTI_PLATFORM_FORMAT } from './splitPlatforms'

/**
 * Bilan de saison/période — le seul type de post entièrement transversal :
 * s'appuie sur MatchResult, déjà partagé par tous les sports (tennis/padel
 * inclus, via le flux interclub), donc un seul générateur pour tout le monde.
 */
export function seasonRecapPromptAll(
  sport: string,
  clubName: string,
  periodLabel: string,
  wins: number,
  draws: number,
  losses: number,
  rankingNote: string | undefined,
  voice: string = 'STANDARD'
): string {
  const vocab = getSportVocab(sport)
  const total = wins + draws + losses
  const tag = clubName.toLowerCase().replace(/\s/g, '')
  const voiceInstruction = getVoiceInstruction(voice)
  const record = draws > 0
    ? `${wins} victoire${wins > 1 ? 's' : ''}, ${draws} match${draws > 1 ? 's' : ''} nul${draws > 1 ? 's' : ''}, ${losses} défaite${losses > 1 ? 's' : ''}`
    : `${wins} victoire${wins > 1 ? 's' : ''}, ${losses} défaite${losses > 1 ? 's' : ''}`

  return `Tu es le community manager du club de ${sport} "${clubName}" ${vocab.emoji}.
Rédige les posts réseaux sociaux pour le bilan ${periodLabel}.

Bilan : ${record} (${total} match${total > 1 ? 's' : ''} au total)
${rankingNote ? `Classement / fait marquant : ${rankingNote}` : ''}

Vocabulaire ${sport}-spécifique à utiliser :
${getVocabHints(sport)}

Consignes générales (valables pour les 3 posts) :
- Ton bilan et rétrospectif, remercie joueurs/joueuses, staff et supporters pour la période
- Mets en avant le positif même si le bilan est mitigé ; reste factuel sur le nombre de matchs
${voiceInstruction ? `- ${voiceInstruction}` : ''}

Contraintes par plateforme :
- Instagram : dynamique, 4 à 6 hashtags (${vocab.hashtags.join(' ')} #${tag} #bilan)
- Facebook : narratif, remerciements détaillés, appel à continuer à soutenir
- WhatsApp : court, sans hashtags, ton chaleureux

${MULTI_PLATFORM_FORMAT}`
}
