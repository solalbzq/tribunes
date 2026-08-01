import { resolveVoiceOverride } from './voice'
import type { PostType } from './postTypes'

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

/**
 * Bornes serveur pour les champs de personnalisation — jamais uniquement
 * côté client (le navigateur ne protège rien contre un appel API direct).
 * `bannedWords` est stocké comme une seule chaîne séparée par des virgules
 * (pas un tableau en base) : la limite porte sur le nombre d'expressions et
 * la longueur de chacune, pas sur la longueur totale de la chaîne.
 */
export const PERSONALIZATION_LIMITS = {
  customInstructions: 1000,
  oneTimeInstructions: 300,
  signaturePhrase: 200,
  typeInstructions: 500,
  bannedWordsMaxItems: 30,
  bannedWordMaxLength: 50,
  // Sous cette longueur, un "mot interdit" (ex: une lettre, un article) matcherait
  // quasiment tout texte généré une fois normalisé — cf. lib/bannedWords.ts.
  bannedWordMinLength: 2,
} as const

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

/** `#rrggbb` strict — utilisé pour valider une couleur de marque avant écriture (saisie manuelle ou restauration d'historique). */
export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function splitBannedWords(value: string): string[] {
  return value.split(',').map(w => w.trim()).filter(Boolean)
}

/** Valide et normalise les 3 champs de personnalité générale du club (route `/api/clubs`). */
export function validateClubPersonalizationInput(input: {
  customInstructions?: unknown
  signaturePhrase?: unknown
  bannedWords?: unknown
}): ValidationResult<{ customInstructions: string | null; signaturePhrase: string | null; bannedWords: string | null }> {
  const customInstructions = normalizeText(input.customInstructions)
  if (customInstructions && customInstructions.length > PERSONALIZATION_LIMITS.customInstructions) {
    return { ok: false, error: `Les consignes personnalisées sont limitées à ${PERSONALIZATION_LIMITS.customInstructions} caractères` }
  }

  const signaturePhrase = normalizeText(input.signaturePhrase)
  if (signaturePhrase && signaturePhrase.length > PERSONALIZATION_LIMITS.signaturePhrase) {
    return { ok: false, error: `La signature est limitée à ${PERSONALIZATION_LIMITS.signaturePhrase} caractères` }
  }

  const bannedWordsRaw = normalizeText(input.bannedWords)
  let bannedWords: string | null = null
  if (bannedWordsRaw) {
    const items = splitBannedWords(bannedWordsRaw)
    if (items.length > PERSONALIZATION_LIMITS.bannedWordsMaxItems) {
      return { ok: false, error: `Maximum ${PERSONALIZATION_LIMITS.bannedWordsMaxItems} mots ou expressions à éviter` }
    }
    const tooLong = items.find(w => w.length > PERSONALIZATION_LIMITS.bannedWordMaxLength)
    if (tooLong) {
      return { ok: false, error: `Chaque expression à éviter est limitée à ${PERSONALIZATION_LIMITS.bannedWordMaxLength} caractères` }
    }
    const tooShort = items.find(w => w.length < PERSONALIZATION_LIMITS.bannedWordMinLength)
    if (tooShort) {
      return { ok: false, error: `Chaque expression à éviter doit contenir au moins ${PERSONALIZATION_LIMITS.bannedWordMinLength} caractères` }
    }
    bannedWords = items.join(', ')
  }

  return { ok: true, value: { customInstructions, signaturePhrase, bannedWords } }
}

/** Valide la consigne ponctuelle ("Personnaliser ce post") envoyée à n'importe laquelle des routes de génération. */
export function validateOneTimeInstructions(input: unknown): ValidationResult<string | null> {
  const value = normalizeText(input)
  if (value && value.length > PERSONALIZATION_LIMITS.oneTimeInstructions) {
    return { ok: false, error: `La consigne ponctuelle est limitée à ${PERSONALIZATION_LIMITS.oneTimeInstructions} caractères` }
  }
  return { ok: true, value }
}

/** Valide les consignes d'un override par type de publication (ClubPersonalizationOverride.customInstructions). */
export function validateTypeInstructions(input: unknown): ValidationResult<string | null> {
  const value = normalizeText(input)
  if (value && value.length > PERSONALIZATION_LIMITS.typeInstructions) {
    return { ok: false, error: `Les instructions pour ce type sont limitées à ${PERSONALIZATION_LIMITS.typeInstructions} caractères` }
  }
  return { ok: true, value }
}

// ── Résolution centralisée ──────────────────────────────────────────────
//
// Ordre de priorité, du plus spécifique au plus général :
//   override ponctuel du post > override du type de publication
//   > identité générale du club > défaut Tribunes
//
// Les valeurs exclusives (voix, signature) retiennent la première valeur non
// vide rencontrée dans cet ordre. Les consignes libres s'empilent (du plus
// général au plus spécifique) plutôt que de s'écraser, comme le faisait déjà
// buildPersonalizationPrefix pour club+ponctuel — même logique étendue au
// niveau "type" intermédiaire.

export type ClubForPersonalization = {
  contentTone: string
  customInstructions?: string | null
  signaturePhrase?: string | null
  bannedWords?: string | null
}

/**
 * Override par type de publication (ClubPersonalizationOverride), déjà résolu
 * par l'appelant — cette fonction ne fait aucun accès base.
 *
 * Ne reprend délibérément pas `visualConfig` (présent sur le modèle Prisma) :
 * la résolution du style visuel applicable est un problème distinct, déjà
 * traité côté rendu par lib/visualLayout.ts (parsePostVisualConfig,
 * resolveCustomPostVisualKind) — resolvePersonalization ne couvre que la
 * personnalisation éditoriale (voix, consignes, signature).
 */
export type PersonalizationTypeOverride = {
  voiceOverride?: string | null
  customInstructions?: string | null
  signaturePhrase?: string | null
} | null | undefined

/** Override ponctuel envoyé avec la requête de génération (ToneSelector / panneau "Personnaliser ce post"). */
export type PersonalizationRequestOverride = {
  voiceOverride?: string | null
  oneTimeInstructions?: string | null
} | null | undefined

export type ResolvedPersonalization = {
  voice: string
  /** Préfixe de prompt prêt à l'emploi (même format que buildPersonalizationPrefix) — à concaténer devant le prompt xxxPromptAll. */
  prefix: string
  signaturePhrase: string | null
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/**
 * Résout voix, consignes et signature applicables à une génération, en
 * tenant compte de l'identité générale du club, d'un éventuel override par
 * type déjà chargé par l'appelant, et d'un override ponctuel de la requête.
 * `postType` n'influence pas la résolution éditoriale elle-même (identique
 * quel que soit le type) — conservé pour la traçabilité et un usage futur
 * (signaux d'apprentissage, cf. Lot 8).
 */
export function resolvePersonalization(params: {
  club: ClubForPersonalization
  postType: PostType
  typeOverride?: PersonalizationTypeOverride
  requestOverride?: PersonalizationRequestOverride
}): ResolvedPersonalization {
  const { club, typeOverride, requestOverride } = params

  const voiceCandidate = firstNonEmpty(requestOverride?.voiceOverride, typeOverride?.voiceOverride)
  const voice = resolveVoiceOverride(voiceCandidate, club.contentTone)

  const signaturePhrase = firstNonEmpty(typeOverride?.signaturePhrase, club.signaturePhrase)

  const stackedInstructions = [typeOverride?.customInstructions, requestOverride?.oneTimeInstructions]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map(v => v.trim())
    .join(' ')

  const prefix = buildPersonalizationPrefix(
    { customInstructions: club.customInstructions, bannedWords: club.bannedWords, signaturePhrase },
    stackedInstructions || null
  )

  return { voice, prefix, signaturePhrase }
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
