// Découpage d'une réponse OpenAI multi-plateformes en 3 posts.
// Un seul appel IA génère les 3 versions, séparées par "---PLATFORM---",
// chaque bloc préfixé par [INSTAGRAM] / [FACEBOOK] / [WHATSAPP].

export type PlatformPosts = {
  instagram: string
  facebook: string
  whatsapp: string
}

/** Bloc de format commun à injecter en fin de prompt multi-plateformes. */
export const MULTI_PLATFORM_FORMAT = `Génère exactement 3 posts, UN par plateforme, séparés par la ligne "---PLATFORM---".

Format EXACT attendu (respecte les balises et le séparateur) :
[INSTAGRAM]
(texte du post Instagram)
---PLATFORM---
[FACEBOOK]
(texte du post Facebook)
---PLATFORM---
[WHATSAPP]
(texte du post WhatsApp)

Réponds uniquement avec ces 3 blocs, sans introduction ni guillemets.`

function stripTag(block: string): string {
  return block.replace(/\[(INSTAGRAM|FACEBOOK|WHATSAPP)\]\s*/i, '').trim()
}

/** Découpe la réponse brute en { instagram, facebook, whatsapp }. */
export function splitPlatformPosts(raw: string): PlatformPosts {
  const parts = (raw ?? '').split('---PLATFORM---')
  return {
    instagram: stripTag(parts[0] ?? ''),
    facebook: stripTag(parts[1] ?? ''),
    whatsapp: stripTag(parts[2] ?? ''),
  }
}
