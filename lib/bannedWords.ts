/**
 * Vérification post-génération des mots/expressions interdits du club
 * (Club.bannedWords, chaîne séparée par des virgules). Jusqu'ici ces mots
 * n'étaient qu'une consigne de prompt (lib/personalization.ts) : rien ne
 * garantissait qu'ils étaient bien absents du texte réellement généré.
 *
 * Volontairement simple pour la V1 (pas de moteur linguistique) : recherche
 * de sous-chaîne sur un texte normalisé (minuscules, accents et ponctuation
 * retirés), avec des limites de mots pour éviter qu'un mot interdit soit
 * détecté à l'intérieur d'un mot différent qui le contient.
 */

const COMBINING_DIACRITICS = /[̀-ͯ]/g

function normalizeForMatch(text: string): string {
  const collapsed = text
    .toLowerCase()
    .normalize('NFD').replace(COMBINING_DIACRITICS, '') // retire les accents
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // ponctuation/emojis -> espace
    .trim()
    .replace(/\s+/g, ' ')
  return ` ${collapsed} `
}

function parseBannedWordsList(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map(w => w.trim()).filter(Boolean)
}

/** Renvoie les expressions interdites (forme originale) détectées dans `text`. */
export function findBannedWordsInText(text: string, bannedWordsRaw: string | null | undefined): string[] {
  const items = parseBannedWordsList(bannedWordsRaw)
  if (items.length === 0) return []
  const haystack = normalizeForMatch(text)
  return items.filter(item => {
    const needle = normalizeForMatch(item).trim()
    return needle.length > 0 && haystack.includes(` ${needle} `)
  })
}

export type BannedWordsCheck = {
  hasViolation: boolean
  violationsByPlatform: Record<string, string[]>
}

/** Vérifie chaque variante par plateforme d'une génération et regroupe les violations trouvées. */
export function checkBannedWordsAcrossPlatforms(
  postsByPlatform: Record<string, string>,
  bannedWordsRaw: string | null | undefined
): BannedWordsCheck {
  const violationsByPlatform: Record<string, string[]> = {}
  for (const [platform, text] of Object.entries(postsByPlatform)) {
    const matches = findBannedWordsInText(text, bannedWordsRaw)
    if (matches.length > 0) violationsByPlatform[platform] = matches
  }
  return { hasViolation: Object.keys(violationsByPlatform).length > 0, violationsByPlatform }
}
