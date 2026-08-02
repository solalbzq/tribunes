// Découpage d'une réponse OpenAI multi-plateformes en 2 posts.
// Un seul appel IA génère les 2 versions, séparées par "---PLATFORM---",
// chaque bloc préfixé par [INSTAGRAM] / [FACEBOOK].

export type PlatformPosts = {
  instagram: string
  facebook: string
}

/** Bloc de format commun à injecter en fin de prompt multi-plateformes. */
export const MULTI_PLATFORM_FORMAT = `Génère exactement 2 posts, UN par plateforme, séparés par la ligne "---PLATFORM---".

Format EXACT attendu (respecte les balises et le séparateur) :
[INSTAGRAM]
(texte du post Instagram)
---PLATFORM---
[FACEBOOK]
(texte du post Facebook)

Réponds uniquement avec ces 2 blocs, sans introduction ni guillemets.`

function stripTag(block: string): string {
  return block.replace(/\[(INSTAGRAM|FACEBOOK)\]\s*/i, '').trim()
}

/** Découpe la réponse brute en { instagram, facebook }. */
export function splitPlatformPosts(raw: string): PlatformPosts {
  const parts = (raw ?? '').split('---PLATFORM---')
  return {
    instagram: stripTag(parts[0] ?? ''),
    facebook: stripTag(parts[1] ?? ''),
  }
}
