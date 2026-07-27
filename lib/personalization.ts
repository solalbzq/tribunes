/**
 * Personnalisation des légendes IA — consignes libres, mots à éviter et
 * signature définis une fois dans Personnalisation, plus une éventuelle
 * surcharge ponctuelle ("Personnaliser ce post") pour une seule génération.
 *
 * Injecté en préfixe du prompt plutôt qu'en paramètre de chaque fonction
 * xxxPromptAll : évite de toucher la signature des ~14 générateurs de
 * lib/prompts/*.ts pour un réglage qui s'applique uniformément, quel que
 * soit le type de post.
 */
export type ClubPersonalization = {
  customInstructions?: string | null
  signaturePhrase?: string | null
  bannedWords?: string | null
}

export function buildPersonalizationPrefix(
  club: ClubPersonalization,
  overrideInstructions?: string | null
): string {
  const lines: string[] = []
  if (club.customInstructions) lines.push(`- ${club.customInstructions}`)
  if (overrideInstructions) lines.push(`- Pour cette publication uniquement : ${overrideInstructions}`)
  if (club.bannedWords) lines.push(`- N'utilise jamais ces mots ou expressions : ${club.bannedWords}`)
  if (club.signaturePhrase) lines.push(`- Termine si possible par cette signature : "${club.signaturePhrase}"`)

  if (lines.length === 0) return ''
  return `Consignes spécifiques du club à respecter impérativement, en plus du reste :\n${lines.join('\n')}\n\n`
}
