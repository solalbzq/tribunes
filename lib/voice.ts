// Personnalité globale du club, injectée dans tous les prompts IA de génération
// de posts. Distinct du ton victoire/défaite (calculé par match) : ceci est un
// réglage de voix stable, choisi une fois dans Mon Club.

export type ClubVoice = 'STANDARD' | 'FUN' | 'SOBER'
export const CLUB_VOICES: ClubVoice[] = ['STANDARD', 'FUN', 'SOBER']

/**
 * Override ponctuel de voix envoyé par une route de génération (ex: ToneSelector,
 * panneau "Personnaliser ce post"). N'accepte qu'une valeur reconnue de ClubVoice :
 * toute autre chaîne (vide, absente, ou texte libre mal routé) retombe sur `fallback`
 * plutôt que d'être transmise telle quelle à getVoiceInstruction.
 */
export function resolveVoiceOverride(voiceOverride: unknown, fallback: string): string {
  return typeof voiceOverride === 'string' && (CLUB_VOICES as string[]).includes(voiceOverride)
    ? voiceOverride
    : fallback
}

export function getVoiceInstruction(voice: string): string {
  switch (voice) {
    case 'FUN':
      return "Personnalité du club à respecter : fun et décontractée — n'hésite pas à ajouter de l'humour, quelques emojis en plus, un ton complice avec les supporters."
    case 'SOBER':
      return "Personnalité du club à respecter : sobre et factuelle — peu d'emojis, phrases courtes, insiste sur les faits plutôt que sur l'emphase."
    default:
      return ''
  }
}
